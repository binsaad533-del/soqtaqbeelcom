/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

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
        <Text style={logo}>SOQ TAQBEEL</Text>
        <Heading style={h1}>أهلاً بك في سوق تقبيل!</Heading>
        <Text style={text}>
          شكراً لتسجيلك في سوق تقبيل. يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه.
        </Text>
        <Button style={button} href={confirmationUrl}>
          تأكيد البريد الإلكتروني
        </Button>
        <Text style={footer}>
          إذا لم تنشئ حساباً، تجاهل هذه الرسالة.
        </Text>
        <Text style={brand}>سوق تقبيل — منصة بالذكاء الاصطناعي لإتمام الصفقات</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '30px 25px', textAlign: 'center' as const }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a8af8', margin: '0 0 25px', letterSpacing: '1px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#3a4a5c', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7a8a9c', lineHeight: '1.7', margin: '0 0 25px', textAlign: 'right' as const }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '14px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 10px', textAlign: 'right' as const }
const brand = { fontSize: '11px', color: '#bbbbbb', margin: '5px 0 0', textAlign: 'center' as const }
