import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Button, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailFooter } from '../email-footer.tsx'

const SITE_NAME = "سوق تقبيل"
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

const ICON_OFFER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' y1='1' x2='12' y2='23'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E`

interface OfferReceivedProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  buyerName?: string
}

const OfferReceivedEmail = ({
  recipientName, listingTitle, offeredPrice, buyerName,
}: OfferReceivedProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <link rel="stylesheet" href={FONT_URL} />
    </Head>
    <Preview>عرض سعر جديد على اعلانك</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandNameStyle}>{SITE_NAME}</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>
        <Hr style={divider} />
        <Section style={iconSection}>
          <Img src={ICON_OFFER} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
        </Section>
        <Text style={greeting}>{recipientName ? `مرحبا ${recipientName}،` : 'مرحبا،'}</Text>
        <Text style={text}>وصلك عرض سعر جديد على اعلانك.</Text>
        <Section style={detailsBox}>
          {listingTitle && <Text style={detailRow}><span style={detailLabel}>الاعلان:</span> {listingTitle}</Text>}
          {offeredPrice && <Text style={detailRow}><span style={detailLabel}>المبلغ المعروض:</span> {offeredPrice} ر.س</Text>}
          {buyerName && <Text style={detailRow}><span style={detailLabel}>من:</span> {buyerName}</Text>}
        </Section>
        <Text style={text}>راجع العرض من لوحة التحكم واتخذ القرار المناسب.</Text>
        <Section style={buttonSection}>
          <Button style={button} href="https://soqtaqbeel.com/dashboard">مراجعة العرض</Button>
        </Section>
        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OfferReceivedEmail,
  subject: 'عرض سعر جديد على اعلانك',
  displayName: 'عرض سعر جديد للبائع',
  previewData: { recipientName: 'احمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', buyerName: 'محمد' },
} satisfies TemplateEntry

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '8px' }
const brandNameStyle = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', margin: '0', fontFamily: FONT }
const brandNameEn = { fontSize: '11px', fontWeight: '500' as const, color: '#9ca3af', margin: '2px 0 0', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: FONT }
const divider = { borderColor: '#e8ecf0', margin: '20px 0 24px' }
const iconSection = { textAlign: 'center' as const, marginBottom: '16px' }
const greeting = { fontSize: '16px', fontWeight: '600' as const, color: '#1e3a5f', margin: '0 0 16px', fontFamily: FONT }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px', fontFamily: FONT }
const detailsBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '20px 24px', margin: '0 0 24px', border: '1px solid #d6e8fa' }
const detailRow = { fontSize: '14px', color: '#1e3a5f', margin: '0 0 8px', lineHeight: '1.6', fontFamily: FONT }
const detailLabel = { fontWeight: '600' as const }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 32px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
