import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailFooter } from '../email-footer.tsx'

const SITE_NAME = "سوق تقبيل"
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"

const ICON_MAIL = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%230084ff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E`

interface ContactConfirmationProps {
  recipientName?: string
  subject?: string
}

const ContactConfirmationEmail = ({ recipientName, subject }: ContactConfirmationProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <link rel="stylesheet" href={FONT_URL} />
    </Head>
    <Preview>تم استلام رسالتك بنجاح — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerText}>سوق تقبيل / SOQ TAQBEEL</Text>
        </Section>

        <Section style={iconSection}>
          <Img src={ICON_MAIL} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
        </Section>

        <Text style={heading}>
          {recipientName ? `شكراً لك، ${recipientName}!` : 'شكراً لتواصلك معنا!'}
        </Text>

        <Text style={paragraph}>
          تم استلام رسالتك بنجاح وسيقوم فريقنا بمراجعتها والرد عليك في أقرب وقت ممكن.
        </Text>

        {subject && (
          <Section style={detailsBox}>
            <Text style={detailsLabel}>موضوع الرسالة:</Text>
            <Text style={detailsValue}>{subject}</Text>
          </Section>
        )}

        <Text style={paragraph}>
          ساعات العمل: السبت - الخميس، ٩:٠٠ ص - ٥:٠٠ م
        </Text>

        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'تم استلام رسالتك — سوق تقبيل',
  displayName: 'تأكيد استلام رسالة التواصل',
  previewData: { recipientName: 'أحمد', subject: 'استفسار عن تقبيل محل تجاري' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '560px',
}

const headerSection = {
  backgroundColor: '#0066cc',
  padding: '18px 24px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
}

const headerText = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
}

const iconSection = {
  textAlign: 'center' as const,
  padding: '28px 0 8px',
}

const heading = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a2b4a',
  textAlign: 'center' as const,
  margin: '0 0 16px',
  padding: '0 24px',
}

const paragraph = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.7',
  textAlign: 'right' as const,
  margin: '0 0 16px',
  padding: '0 24px',
}

const detailsBox = {
  backgroundColor: '#f0f7ff',
  borderRadius: '10px',
  padding: '14px 20px',
  margin: '0 24px 20px',
  border: '1px solid #d6e8ff',
}

const detailsLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 4px',
  textAlign: 'right' as const,
}

const detailsValue = {
  fontSize: '14px',
  color: '#1a2b4a',
  fontWeight: '500',
  margin: '0',
  textAlign: 'right' as const,
}

const footer = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '24px 0 0',
  padding: '0 24px 20px',
}
