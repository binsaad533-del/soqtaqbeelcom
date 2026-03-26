/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/email-assets/logo-icon-gold.png'
import { EmailFooter } from '../email-footer.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد حسابك في سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt="سوق تقبيل" style={logoImg} />
        <Heading style={h1}>أهلاً بك في سوق تقبيل!</Heading>
        <Text style={text}>
          شكراً لتسجيلك في سوق تقبيل. يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه.
        </Text>
        <Button style={button} href={confirmationUrl}>
          تأكيد البريد الإلكتروني
        </Button>
        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '30px 25px', textAlign: 'center' as const }
const logoImg = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#3a4a5c', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7a8a9c', lineHeight: '1.7', margin: '0 0 25px', textAlign: 'right' as const }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '14px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 10px', textAlign: 'right' as const }
const brand = { fontSize: '11px', color: '#bbbbbb', margin: '5px 0 0', textAlign: 'center' as const }
