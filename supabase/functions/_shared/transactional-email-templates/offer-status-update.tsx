import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "سوق تقبيل"

interface OfferStatusProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  status?: 'accepted' | 'rejected' | 'counter'
  sellerResponse?: string
}

const statusLabels: Record<string, { emoji: string; title: string; desc: string }> = {
  accepted: { emoji: '🎉', title: 'تم قبول عرضك!', desc: 'يسعدنا إبلاغك بأن البائع قد وافق على عرضك.' },
  rejected: { emoji: '📋', title: 'تحديث على عرضك', desc: 'نود إعلامك بأن البائع لم يوافق على عرضك الحالي.' },
  counter: { emoji: '🔄', title: 'رد جديد على عرضك', desc: 'قام البائع بالرد على عرضك برسالة جديدة.' },
}

const OfferStatusEmail = ({
  recipientName, listingTitle, offeredPrice, status = 'accepted', sellerResponse,
}: OfferStatusProps) => {
  const info = statusLabels[status] || statusLabels.accepted
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{info.title} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={logo}>{SITE_NAME}</Text>
          </Section>
          <Section style={iconSection}><Text style={checkIcon}>{info.emoji}</Text></Section>
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
          <Hr style={hr} />
          <Text style={footer}>شكراً لاستخدامك {SITE_NAME}</Text>
          <Text style={footerSmall}>هذا البريد تم إرساله تلقائياً. لا حاجة للرد عليه.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OfferStatusEmail,
  subject: (data: Record<string, any>) => {
    const labels: Record<string, string> = { accepted: 'تم قبول عرضك! 🎉', rejected: 'تحديث على عرضك', counter: 'رد جديد على عرضك' }
    return labels[data.status] || 'تحديث على عرضك'
  },
  displayName: 'تحديث حالة العرض',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', status: 'accepted' },
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
