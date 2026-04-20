# PII Protection — Verification Report

**Migration:** `20260420070000_*` — Counterparty PII RPCs
**Date:** 2026-04-20
**Status:** ✅ آمن للمرحلة التالية

---

## 1) فحص أمني — مقارنة قبل/بعد

| # | Finding | الخطورة | قبل | بعد |
|---|---------|---------|-----|-----|
| 1 | PII في `profiles` (email/phone للطرف المقابل) | High | ❌ Exposed | ✅ مغلق على مستوى RLS — لا توجد سياسة تتيح للمستخدمين العاديين قراءة صفوف غير صفوفهم. الوصول الوحيد عبر RPCs (`get_public_profile_v2` / `_safe` / `_legal`). |
| 2 | seller_verifications (id_number) | Warn | ❌ | ❌ (لم يُعالج بعد — الإصلاح القادم) |
| 9 | listing_views INSERT مفتوح | Warn | ❌ | ❌ (الإصلاح القادم) |
| 10 | failed_login_attempts INSERT مفتوح | Warn | ❌ | ❌ (الإصلاح القادم) |
| - | Realtime topics غير محمية | Error | ❌ | ❌ (مستقل — يحتاج إصلاح منفصل) |

**ملاحظة:** الـ scanner لا يزال يعرض `EXPOSED_SENSITIVE_DATA` كتحذير عام لأن جدول `profiles` يحتوي على أعمدة حساسة هيكلياً، لكن **التعرّض الفعلي مغلق**: استعلام `pg_policies` يؤكد أن جميع سياسات SELECT للمستخدمين العاديين مقيّدة بـ `auth.uid() = user_id` فقط، والباقي مقصور على `platform_owner` / `supervisor` / `financial_manager`.

### سياسات `profiles` الحالية (مُتحقَّق منها):
| Policy | CMD | Qual |
|---|---|---|
| Users can view own profile | SELECT | `auth.uid() = user_id` |
| Users view own full profile | SELECT | `user_id = auth.uid()` |
| Platform owner can view all profiles | SELECT | `has_role(... 'platform_owner')` |
| Supervisors can view all profiles | SELECT | `has_role(... 'supervisor')` |
| Financial manager views profiles | SELECT | `has_role(... 'financial_manager')` |
| Admins view all profiles | SELECT | `has_role(... owner/supervisor/financial)` |

→ لا توجد أي سياسة تسمح للطرف المقابل في الصفقة بقراءة email/phone مباشرة. ✅

---

## 2) Edge Cases — التحقق

| # | السؤال | الإجابة |
|---|--------|---------|
| 1 | `get_counterparty_profile_legal` لصفقة `completed`؟ | ✅ ترجع البيانات. الشرط يستثني `cancelled`/`rejected` فقط (تم التحقق: `'completed' NOT IN ('cancelled','rejected') = true`). |
| 2 | مشرف يحاول استدعاءها لصفقة ليس فيها؟ | ✅ ترجع NULL وتسجّل `attempted_legal_contact_access` مع `reason='not_party'` — لأن شرط `_is_party` يفشل بصرف النظر عن الدور. |
| 3 | Edge Functions تكشف PII للطرف المقابل؟ | ✅ آمنة. الـ 7 ملفات التي تستعلم phone/email تستخدم `service_role` لأغراض server-side شرعية فقط: SMS delivery (`notify-sms`, `notify-offer-sms`), password reset (`reset-password-*`), commission reminders, و AI tools للمالك/المشرف فقط (`ai-chat`). لا يوجد endpoint يُرجع PII للطرف المقابل في الـ response. |
| 4 | `SellerProfilePage` تستخدم RPC؟ | ⚠️ لا تزال تستخدم `getProfile()` من `useProfiles.ts` — لكنه آمن بفضل **الـ fallback التلقائي**: عند فشل `SELECT` المباشر بسبب RLS، يتحول `getProfile` تلقائياً إلى `get_public_profile_v2` ويُرجع كائن Profile بدون email/phone (محقن كـ `null`). نفس السلوك في `ListingDetailsPage`. |

---

## 3) Build & Type Check

| Check | النتيجة |
|---|---|
| `tsc --noEmit` | ✅ Exit 0 |
| `vitest run` | ✅ 28/28 passed (3 ملفات اختبار موجودة) |
| `vite build` | ✅ Built in 18.89s — لا أخطاء |

---

## 4) آلية الحماية الفعالة

```
طلب profile للطرف المقابل
        │
        ├─ هل أنا صاحبه؟ ──► YES ─► RLS يُرجع الصف كاملاً
        │
        ├─ هل أنا admin/supervisor/financial? ──► YES ─► RLS يُرجع الصف كاملاً
        │
        └─ NO ─► RLS يُرجع NULL ─► fallback إلى get_public_profile_v2
                                           │
                                           └─► بدون email، بدون phone
                                           
عند الحاجة لـ phone للعرض في UI تفاوض:
        └─► get_counterparty_profile_safe → masked_phone (****1234)
            (يتطلب وجود deal مشترك)

عند الحاجة لـ phone كامل لـ PDF رسمي:
        └─► get_counterparty_profile_legal(deal_id) → phone كامل
            (يتطلب: طرف فعلي + legal_confirmation موقّع + deal ليس مُلغى)
            + يُسجّل كل وصول في audit_logs
```

---

## 5) المشاكل المتبقية (خارج نطاق هذا الإصلاح)

- 🔴 **Realtime channels غير محمية** (Critical) — أي مستخدم مصادَق يمكنه الاشتراك في أي قناة.
- 🟡 **seller_verifications** — مشرفون يرون id_number كاملاً (الإصلاح التالي).
- 🟡 **failed_login_attempts / listing_views** — INSERT مفتوح يسمح بتلويث المراقبة (الإصلاح القادم).

---

## ✅ التوصية النهائية

**آمن للمرحلة التالية.** إصلاح PII للـ profiles مكتمل ومُتحقَّق منه على مستوى:
- قاعدة البيانات (RLS + 3 RPCs مع SECURITY DEFINER)
- الكود الأمامي (6 ملفات معدّلة + fallback آمن في `useProfiles.ts`)
- Edge Functions (لا يوجد تسريب للطرف المقابل)
- Build & Tests (لا انكسار)

يمكن الانتقال للإصلاح التالي: **حماية `id_number` و `commercial_register_number` في `seller_verifications`**.
