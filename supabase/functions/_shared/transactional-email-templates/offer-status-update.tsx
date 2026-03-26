import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailFooter } from '../email-footer.tsx'

const SITE_NAME = "سوق تقبيل"
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

const ICONS = {
  accepted: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpath d='m9 11 3 3L22 4'/%3E%3C/svg%3E`,
  rejected: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m15 9-6 6'/%3E%3Cpath d='m9 9 6 6'/%3E%3C/svg%3E`,
  counter: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/%3E%3Cpath d='M3 3v5h5'/%3E%3Cpath d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16'/%3E%3Cpath d='M16 16h5v5'/%3E%3C/svg%3E`,
}

interface OfferStatusProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  status?: 'accepted' | 'rejected' | 'counter'
  sellerResponse?: string
}

const statusLabels: Record<string, { icon: string; title: string; desc: string }> = {
  accepted: { icon: ICONS.accepted, title: 'تم قبول عرضك', desc: 'يسعدنا إبلاغك بأن البائع قد وافق على عرضك.' },
  rejected: { icon: ICONS.rejected, title: 'تحديث على عرضك', desc: 'نود إعلامك بأن البائع لم يوافق على عرضك الحالي.' },
  counter: { icon: ICONS.counter, title: 'رد جديد على عرضك', desc: 'قام البائع بالرد على عرضك برسالة جديدة.' },
}

const OfferStatusEmail = ({
  recipientName, listingTitle, offeredPrice, status = 'accepted', sellerResponse,
}: OfferStatusProps) => {
  const info = statusLabels[status] || statusLabels.accepted
  return (
    <Html lang="ar" dir="rtl">
      <Head><link rel="stylesheet" href={FONT_URL} /></Head>
      <Preview>{info.title} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}><Text style={logo}>{SITE_NAME}</Text></Section>
          <Section style={iconSection}>
            <Img src={info.icon} width="48" height="48" alt="" style={{ margin: '0 auto' }} />
          </Section>
          <Heading style={h1}>{info.title}</Heading>
          <Text style={text}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
          <Text style={text}>{info.desc}</Text>
          <Section style={detailsBox}>
            {listingTitle && <Text style={detailRow}><span style={detailLabel}>الإعلان:</span> {listingTitle}</Text>}
            {offeredPrice && <Text style={detailRow}><span style={detailLabel}>المبلغ المعروض:</span> {offeredPrice} ر.س</Text>}
            {sellerResponse && <Text style={detailRow}><span style={detailLabel}>رد البائع:</span> {sellerResponse}</Text>}
          </Section>
          <Section style={buttonSection}>
            <Button style={button} href="https://soqtaqbeel.com/dashboard">عرض التفاصيل</Button>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OfferStatusEmail,
  subject: (data: Record<string, any>) => {
    const labels: Record<string, string> = { accepted: 'تم قبول عرضك', rejected: 'تحديث على عرضك', counter: 'رد جديد على عرضك' }
    return labels[data.status] || 'تحديث على عرضك'
  },
  displayName: 'تحديث حالة العرض',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', status: 'accepted' },
} satisfies TemplateEntry

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '10px' }
const logo = { fontSize: '20px', fontWeight: '600' as const, color: '#0a8af8', margin: '0', fontFamily: FONT }
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
