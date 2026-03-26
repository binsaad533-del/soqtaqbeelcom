import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "سوق تقبيل"

interface DealStatusProps {
  recipientName?: string
  dealTitle?: string
  oldStatus?: string
  newStatus?: string
  agreedPrice?: string
}

const statusMap: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: 'قيد الانتظار', emoji: '⏳', color: '#f59e0b' },
  negotiation: { label: 'جاري التفاوض', emoji: '🤝', color: '#0a8af8' },
  agreement: { label: 'مرحلة الاتفاقية', emoji: '📄', color: '#6366f1' },
  finalized: { label: 'تم الاعتماد', emoji: '✅', color: '#16a34a' },
  completed: { label: 'مكتملة', emoji: '🏆', color: '#16a34a' },
  cancelled: { label: 'ملغية', emoji: '❌', color: '#ef4444' },
}

const DealStatusChangeEmail = ({
  recipientName, dealTitle, oldStatus, newStatus = 'negotiation', agreedPrice,
}: DealStatusProps) => {
  const info = statusMap[newStatus] || statusMap.negotiation
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>تحديث على صفقتك: {info.label} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}><Text style={logo}>{SITE_NAME}</Text></Section>
          <Section style={iconSection}><Text style={checkIcon}>{info.emoji}</Text></Section>
          <Heading style={h1}>تحديث حالة الصفقة</Heading>
          <Text style={text}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
          <Text style={text}>نود إعلامك بتحديث جديد على صفقتك.</Text>
          <Section style={detailsBox}>
            {dealTitle && <Text style={detailRow}><span style={detailLabel}>الصفقة:</span> {dealTitle}</Text>}
            <Text style={detailRow}>
              <span style={detailLabel}>الحالة الجديدة:</span>{' '}
              <span style={{ color: info.color, fontWeight: '600' as const }}>{info.label} {info.emoji}</span>
            </Text>
            {oldStatus && statusMap[oldStatus] && (
              <Text style={detailRow}><span style={detailLabel}>الحالة السابقة:</span> {statusMap[oldStatus].label}</Text>
            )}
            {agreedPrice && <Text style={detailRow}><span style={detailLabel}>المبلغ:</span> {agreedPrice} ر.س</Text>}
          </Section>
          <Section style={buttonSection}>
            <Button style={button} href="https://soqtaqbeel.com/dashboard">متابعة الصفقة</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>شكراً لاستخدامك {SITE_NAME}</Text>
          <Text style={footerSmall}>هذا البريد تم إرساله تلقائياً. لا حاجة للرد عليه.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DealStatusChangeEmail,
  subject: (data: Record<string, any>) => {
    const info = statusMap[data.newStatus] || { label: 'تحديث', emoji: '📋' }
    return `تحديث على صفقتك: ${info.label} ${info.emoji}`
  },
  displayName: 'تغيير حالة الصفقة',
  previewData: { recipientName: 'أحمد', dealTitle: 'مطعم شعبي - الرياض', oldStatus: 'pending', newStatus: 'negotiation', agreedPrice: '150,000' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '10px' }
const logo = { fontSize: '20px', fontWeight: '600' as const, color: '#0a8af8', margin: '0' }
const iconSection = { textAlign: 'center' as const, marginBottom: '5px' }
const checkIcon = { fontSize: '48px', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', textAlign: 'center' as const, margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '20px 24px', margin: '0 0 24px', border: '1px solid #d6e8fa' }
const detailRow = { fontSize: '14px', color: '#1e3a5f', margin: '0 0 8px', lineHeight: '1.6' }
const detailLabel = { fontWeight: '600' as const }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 32px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e8ecf0', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#888', textAlign: 'center' as const, margin: '0 0 8px' }
const footerSmall = { fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '0' }
