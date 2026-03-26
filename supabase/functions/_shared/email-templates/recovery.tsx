/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { EmailFooter } from '../email-footer.tsx'

const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName: _siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head><link rel="stylesheet" href={FONT_URL} /></Head>
    <Preview>إعادة تعيين كلمة المرور — سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandName}>سوق تقبيل</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>

        <Hr style={divider} />

        <Heading style={h1}>إعادة تعيين كلمة المرور 🔐</Heading>
        <Text style={text}>
          وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في سوق تقبيل.
        </Text>
        <Text style={text}>
          اضغط الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لفترة محدودة.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            إعادة تعيين كلمة المرور
          </Button>
        </Section>

        <Text style={hint}>
          إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '8px' }
const brandName = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', margin: '0', fontFamily: FONT }
const brandNameEn = { fontSize: '11px', fontWeight: '500' as const, color: '#9ca3af', margin: '2px 0 0', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: FONT }
const divider = { borderColor: '#e8ecf0', margin: '20px 0 24px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', textAlign: 'center' as const, margin: '0 0 20px', fontFamily: FONT }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px', fontFamily: FONT }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 28px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '14px 36px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
const hint = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 8px', fontFamily: FONT }
