/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_MAIL = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E`

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  recipientName?: string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, recipientName }: EmailChangeEmailProps) => (
  <EmailLayout preview="تأكيد تغيير البريد الإلكتروني">
    <Section style={styles.iconSection}>
      <Img src={ICON_MAIL} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
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
      إذا لم تطلب هذا التغيير، تجاهل هذه الرسالة.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
