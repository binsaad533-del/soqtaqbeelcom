import * as React from 'npm:react@18.3.1'
import { Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_MAIL = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E`

interface ContactConfirmationProps {
  recipientName?: string
  subject?: string
}

const ContactConfirmationEmail = ({ recipientName, subject }: ContactConfirmationProps) => (
  <EmailLayout preview="تم استلام رسالتك بنجاح — سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_MAIL} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={{ ...styles.greeting, textAlign: 'center' as const }}>
      {recipientName ? `شكراً لك، ${recipientName}!` : 'شكراً لتواصلك معنا!'}
    </Text>
    <Text style={styles.text}>
      تم استلام رسالتك بنجاح وسيقوم فريقنا بمراجعتها والرد عليك في أقرب وقت ممكن.
    </Text>
    {subject && (
      <Section style={styles.detailsBox}>
        <Text style={styles.detailRow}><span style={styles.detailLabel}>موضوع الرسالة:</span> {subject}</Text>
      </Section>
    )}
    <Text style={styles.text}>ساعات العمل: السبت - الخميس، ٩:٠٠ ص - ٥:٠٠ م</Text>
    <Text style={{ ...styles.hint, textAlign: 'center' as const }}>مع تحيات فريق سوق تقبيل</Text>
  </EmailLayout>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'تم استلام رسالتك — سوق تقبيل',
  displayName: 'تأكيد استلام رسالة التواصل',
  previewData: { recipientName: 'أحمد', subject: 'استفسار عن تقبيل محل تجاري' },
} satisfies TemplateEntry
