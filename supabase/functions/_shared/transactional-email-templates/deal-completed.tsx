import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Button, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailFooter } from '../email-footer.tsx'

const SITE_NAME = "سوق تقبيل"
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

const ICON_CHECK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpath d='m9 11 3 3L22 4'/%3E%3C/svg%3E`

interface DealCompletedProps {
  recipientName?: string
  dealTitle?: string
  agreementNumber?: string
  agreedPrice?: string
  otherPartyName?: string
  role?: string
  pdfUrl?: string
}

const DealCompletedEmail = ({
  recipientName, dealTitle, agreementNumber, agreedPrice, otherPartyName, role, pdfUrl,
}: DealCompletedProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <link rel="stylesheet" href={FONT_URL} />
    </Head>
    <Preview>تم اتمام صفقتك بنجاح على {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandNameStyle}>{SITE_NAME}</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>

        <Hr style={divider} />

        <Section style={iconSection}>
          <Img src={ICON_CHECK} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
        </Section>

        <Text style={greeting}>
          {recipientName ? `مرحبا ${recipientName}،` : 'مرحبا،'}
        </Text>

        <Text style={text}>
          يسعدنا ابلاغك بان الصفقة قد تمت بنجاح وتم اعتمادها من كلا الطرفين.
        </Text>

        <Section style={detailsBox}>
          {dealTitle && (
            <Text style={detailRow}>
              <span style={detailLabel}>عنوان الصفقة:</span> {dealTitle}
            </Text>
          )}
          {agreementNumber && (
            <Text style={detailRow}>
              <span style={detailLabel}>رقم الاتفاقية:</span> {agreementNumber}
            </Text>
          )}
          {agreedPrice && (
            <Text style={detailRow}>
              <span style={detailLabel}>المبلغ المتفق عليه:</span> {agreedPrice} ر.س
            </Text>
          )}
          {otherPartyName && (
            <Text style={detailRow}>
              <span style={detailLabel}>{role === 'buyer' ? 'البائع:' : 'المشتري:'}</span> {otherPartyName}
            </Text>
          )}
        </Section>

        <Text style={text}>
          يمكنك مراجعة تفاصيل الاتفاقية من خلال حسابك على المنصة.
        </Text>

        {pdfUrl && (
          <Section style={buttonSection}>
            <Button style={secondaryButton} href={pdfUrl}>
              تحميل ملف الاتفاقية PDF
            </Button>
          </Section>
        )}

        <Section style={buttonSection}>
          <Button style={button} href="https://soqtaqbeel.com/dashboard">
            عرض لوحة التحكم
          </Button>
        </Section>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DealCompletedEmail,
  subject: 'تم اتمام صفقتك بنجاح',
  displayName: 'تأكيد اتمام الصفقة',
  previewData: {
    recipientName: 'احمد',
    dealTitle: 'مطعم شعبي - الرياض',
    agreementNumber: 'AGR-123456-V1',
    agreedPrice: '150,000',
    otherPartyName: 'محمد',
    role: 'buyer',
  },
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
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
const secondaryButton = { backgroundColor: '#1e3a5f', color: '#ffffff', fontSize: '14px', fontWeight: '500' as const, padding: '10px 28px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
