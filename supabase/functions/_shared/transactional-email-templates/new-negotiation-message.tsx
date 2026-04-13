import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_MESSAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z'/%3E%3C/svg%3E`

interface NewMessageProps {
  recipientName?: string
  senderName?: string
  dealTitle?: string
  messagePreview?: string
}

const NewNegotiationMessageEmail = ({ recipientName, senderName, dealTitle, messagePreview }: NewMessageProps) => (
  <EmailLayout preview={`رسالة جديدة من ${senderName || 'أحد الأطراف'}`}>
    <Section style={styles.iconSection}>
      <Img src={ICON_MESSAGE} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>لديك رسالة جديدة في محادثة التفاوض{senderName ? ` من ${senderName}` : ''}.</Text>
    <Section style={styles.detailsBox}>
      {dealTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الصفقة:</span> {dealTitle}</Text>}
      {messagePreview && <Text style={styles.detailRow}><span style={styles.detailLabel}>الرسالة:</span> {messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview}</Text>}
    </Section>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">الرد على الرسالة</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: NewNegotiationMessageEmail,
  subject: 'رسالة تفاوض جديدة',
  displayName: 'رسالة تفاوض جديدة',
  previewData: { recipientName: 'أحمد', senderName: 'محمد', dealTitle: 'مطعم شعبي - الرياض', messagePreview: 'مرحبا، هل يمكننا مناقشة شروط الدفع؟' },
} satisfies TemplateEntry
