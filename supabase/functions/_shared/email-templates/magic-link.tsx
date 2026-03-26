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
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { EmailFooter } from '../email-footer.tsx'

const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

const ICON_KEY = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4'/%3E%3Cpath d='m21 2-9.6 9.6'/%3E%3Ccircle cx='7.5' cy='15.5' r='5.5'/%3E%3C/svg%3E`

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName: _siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head><link rel="stylesheet" href={FONT_URL} /></Head>
    <Preview>رابط تسجيل الدخول — سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandName}>سوق تقبيل</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>

        <Hr style={divider} />

        <Section style={iconSection}>
          <Img src={ICON_KEY} width="48" height="48" alt="" style={{ margin: '0 auto' }} />
        </Section>

        <Heading style={h1}>رابط تسجيل الدخول</Heading>
        <Text style={text}>
          اضغط الزر أدناه لتسجيل الدخول إلى حسابك في سوق تقبيل.
        </Text>
        <Text style={text}>
          هذا الرابط سينتهي خلال فترة قصيرة لحماية حسابك.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            تسجيل الدخول
          </Button>
        </Section>

        <Text style={hint}>
          إذا لم تطلب رابط الدخول، تجاهل هذه الرسالة.
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '8px' }
const brandName = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', margin: '0', fontFamily: FONT }
const brandNameEn = { fontSize: '11px', fontWeight: '500' as const, color: '#9ca3af', margin: '2px 0 0', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: FONT }
const divider = { borderColor: '#e8ecf0', margin: '20px 0 24px' }
const iconSection = { textAlign: 'center' as const, marginBottom: '12px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', textAlign: 'center' as const, margin: '0 0 20px', fontFamily: FONT }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px', fontFamily: FONT }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 28px' }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '15px', fontWeight: '500' as const, padding: '14px 36px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT }
const hint = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 8px', fontFamily: FONT }
