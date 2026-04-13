import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23F59E0B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E`

interface CommissionReminderProps {
  recipientName?: string
  listingTitle?: string
  amount?: string
  reminderLevel?: string
}

const LEVEL_TEXT: Record<string, string> = {
  first: 'نود تذكيرك بأن لديك عمولة مستحقة لم تُسدد بعد.',
  second: 'هذا تذكيرك الثاني. يرجى المبادرة بسداد العمولة في أقرب وقت.',
  final_warning: 'آخر تذكير قبل التصعيد الإداري. يرجى السداد الفوري.',
  escalation: 'تأخر السداد تجاوز 30 يوماً. سيتم اتخاذ إجراء إداري.',
  suspension: 'تم تعليق حسابك بسبب العمولة المتأخرة. سدد لإعادة التفعيل.',
}

const CommissionReminderEmail = ({ recipientName, listingTitle, amount, reminderLevel }: CommissionReminderProps) => (
  <EmailLayout preview={`تذكير: عمولة بقيمة ${amount || '—'} ر.س مستحقة`}>
    <Section style={styles.iconSection}>
      <Img src={ICON} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>{LEVEL_TEXT[reminderLevel || 'first'] || LEVEL_TEXT.first}</Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الصفقة:</span> {listingTitle}</Text>}
      {amount && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المستحق:</span> {amount} ر.س</Text>}
    </Section>
    <Text style={styles.text}>سدد عبر التحويل البنكي ثم ارفع إثبات الدفع من لوحة التحكم.</Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">سداد العمولة</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: CommissionReminderEmail,
  subject: (data: Record<string, any>) => `تذكير: عمولة بقيمة ${data.amount || ''} ر.س مستحقة`,
  displayName: 'تذكير بسداد العمولة',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', amount: '1,380', reminderLevel: 'first' },
} satisfies TemplateEntry
