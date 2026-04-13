/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  recipientName?: string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, recipientName }: EmailChangeEmailProps) => (
  <EmailLayout preview="تأكيد تغيير البريد الإلكتروني — سوق تقبيل">
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      طلبت تغيير بريدك الإلكتروني المسجل في سوق تقبيل.
    </Text>
    <Section style={styles.detailsBox}>
      <Text style={styles.detailRow}><span style={styles.detailLabel}>البريد الحالي:</span> {email}</Text>
      <Text style={styles.detailRow}><span style={styles.detailLabel}>البريد الجديد:</span> {newEmail}</Text>
    </Section>
    <Text style={styles.text}>اضغط الزر أدناه لتأكيد التغيير.</Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>تأكيد التغيير</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تطلب هذا الإجراء، تجاهل هذا البريد.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
