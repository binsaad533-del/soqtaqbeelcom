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

const ICON_WELCOME = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%230a8af8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='9' cy='7' r='4'/%3E%3Cpath d='M22 21v-2a4 4 0 0 0-3-3.87'/%3E%3Cpath d='M16 3.13a4 4 0 0 1 0 7.75'/%3E%3C/svg%3E`

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName: _siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head><link rel="stylesheet" href={FONT_URL} /></Head>
    <Preview>تأكيد حسابك في سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandName}>سوق تقبيل</Text>
          <Text style={brandNameEn}>SOQ TAQBEEL</Text>
        </Section>

        <Hr style={divider} />

        <Section style={iconSection}>
          <Img src={ICON_WELCOME} width="48" height="48" alt="" style={{ margin: '0 auto' }} />
        </Section>

        <Heading style={h1}>أهلاً بك!</Heading>
        <Text style={text}>
          شكراً لتسجيلك في سوق تقبيل — المنصة الأولى لتقبيل الأعمال التجارية في السعودية.
        </Text>
        <Text style={text}>
          يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه لإتمام التسجيل.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            تأكيد البريد الإلكتروني
          </Button>
        </Section>

        <Text style={hint}>
          إذا لم تقم بالتسجيل في سوق تقبيل، تجاهل هذه الرسالة.
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
