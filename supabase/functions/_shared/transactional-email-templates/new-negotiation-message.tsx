import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailFooter } from '../email-footer.tsx'

const SITE_NAME = "سوق تقبيل"
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
const LOGO_URL = 'https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/email-assets/logo-icon-gold.png'

const ICON_MESSAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z'/%3E%3C/svg%3E`

interface NewMessageProps {
  recipientName?: string
  senderName?: string
  dealTitle?: string
  messagePreview?: string
}

const NewNegotiationMessageEmail = ({
  recipientName, senderName, dealTitle, messagePreview,
}: NewMessageProps) => (
  <Html lang="ar" dir="rtl">
    <Head><link rel="stylesheet" href={FONT_URL} /></Head>
    <Preview>رسالة جديدة من {senderName || 'أحد الأطراف'} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}><Img src={LOGO_URL} width="48" height="48" alt="سوق تقبيل" style={logoImg} /></Section>
        <Section style={iconSection}>
          <Img src={ICON_MESSAGE} width="48" height="48" alt="" style={{ margin: '0 auto' }} />
        </Section>
        <Heading style={h1}>رسالة تفاوض جديدة</Heading>
        <Text style={text}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
        <Text style={text}>لديك رسالة جديدة في محادثة التفاوض{senderName ? ` من ${senderName}` : ''}.</Text>
        <Section style={detailsBox}>
          {dealTitle && <Text style={detailRow}><span style={detailLabel}>الصفقة:</span> {dealTitle}</Text>}
          {messagePreview && <Text style={detailRow}><span style={detailLabel}>الرسالة:</span> {messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview}</Text>}
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://soqtaqbeel.com/dashboard">الرد على الرسالة</Button>
        </Section>
        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewNegotiationMessageEmail,
  subject: 'رسالة تفاوض جديدة',
  displayName: 'رسالة تفاوض جديدة',
  previewData: { recipientName: 'أحمد', senderName: 'محمد', dealTitle: 'مطعم شعبي - الرياض', messagePreview: 'مرحباً، هل يمكننا مناقشة شروط الدفع؟' },
} satisfies TemplateEntry

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '10px' }
const logoImg = { margin: '0 auto', display: 'block' as const }
const iconSection = { textAlign: 'center' as const, marginBottom: '12px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', textAlign: 'center' as const, margin: '0 0 24px', fontFamily: FONT }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px', fontFamily: FONT }
const detailsBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '20px 24px', margin: '0 0 24px', border: '1px solid #d6e8fa' }
const detailRow = { fontSize: '14px', color: '#1e3a5f', margin: '0 0 8px', lineHeight: '1.6', fontFamily: FONT }
const detailLabel = { fontWeight: '600' as const }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 32px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
const hr = { borderColor: '#e8ecf0', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#888', textAlign: 'center' as const, margin: '0 0 8px', fontFamily: FONT }
const footerSmall = { fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '0', fontFamily: FONT }
