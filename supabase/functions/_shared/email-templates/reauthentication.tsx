/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

const ICON_SHIELD = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E`

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head><link rel="stylesheet" href={FONT_URL} /></Head>
    <Preview>رمز التحقق — سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandName}>سوق تقبيل</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>

        <Hr style={divider} />

        <Section style={iconSection}>
          <Img src={ICON_SHIELD} width="48" height="48" alt="" style={{ margin: '0 auto' }} />
        </Section>

        <Heading style={h1}>رمز التحقق</Heading>
        <Text style={text}>استخدم الرمز أدناه لتأكيد هويتك:</Text>

        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>

        <Text style={hint}>
          هذا الرمز سينتهي خلال فترة قصيرة. إذا لم تطلبه، تجاهل هذه الرسالة.
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '8px' }
const brandName = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', margin: '0', fontFamily: FONT }
const brandNameEn = { fontSize: '11px', fontWeight: '500' as const, color: '#9ca3af', margin: '2px 0 0', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: FONT }
const divider = { borderColor: '#e8ecf0', margin: '20px 0 24px' }
const iconSection = { textAlign: 'center' as const, marginBottom: '12px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1e3a5f', textAlign: 'center' as const, margin: '0 0 20px', fontFamily: FONT }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px', textAlign: 'center' as const, fontFamily: FONT }
const codeBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '20px', margin: '0 0 24px', border: '1px solid #d6e8fa', textAlign: 'center' as const }
const codeStyle = { fontFamily: "'IBM Plex Sans Arabic', Courier, monospace", fontSize: '32px', fontWeight: 'bold' as const, color: '#0a8af8', margin: '0', letterSpacing: '6px' }
const hint = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 8px', fontFamily: FONT }
