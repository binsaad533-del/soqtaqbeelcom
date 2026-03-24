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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رابط تسجيل الدخول — سوق تقبيل</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>TAQ/BEEL</Text>
        <Heading style={h1}>رابط تسجيل الدخول</Heading>
        <Text style={text}>
          اضغط الزر أدناه لتسجيل الدخول إلى سوق تقبيل. هذا الرابط سينتهي خلال فترة قصيرة.
        </Text>
        <Button style={button} href={confirmationUrl}>
          تسجيل الدخول
        </Button>
        <Text style={footer}>
          إذا لم تطلب هذا الرابط، تجاهل هذه الرسالة.
        </Text>
        <Text style={brand}>سوق تقبيل — منصة بالذكاء الاصطناعي لإتمام الصفقات</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '30px 25px', textAlign: 'center' as const }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a8af8', margin: '0 0 25px', letterSpacing: '1px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#3a4a5c', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7a8a9c', lineHeight: '1.7', margin: '0 0 25px', textAlign: 'right' as const }
const button = { backgroundColor: '#0a8af8', color: '#ffffff', fontSize: '14px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 10px', textAlign: 'right' as const }
const brand = { fontSize: '11px', color: '#bbbbbb', margin: '5px 0 0', textAlign: 'center' as const }
