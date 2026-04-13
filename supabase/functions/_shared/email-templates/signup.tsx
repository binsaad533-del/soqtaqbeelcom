/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  recipientName?: string
}

export const SignupEmail = ({ confirmationUrl, recipientName }: SignupEmailProps) => (
  <EmailLayout preview="أهلاً بك في سوق تقبيل — أكّد بريدك الإلكتروني">
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      شكراً لتسجيلك في سوق تقبيل، المنصة الأولى لتقبيل الأعمال التجارية في السعودية.
    </Text>
    <Text style={styles.text}>
      اضغط الزر أدناه لتأكيد بريدك الإلكتروني وإتمام التسجيل.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>تأكيد البريد الإلكتروني</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تطلب هذا الإجراء، تجاهل هذا البريد.
    </Text>
  </EmailLayout>
)

export default SignupEmail
