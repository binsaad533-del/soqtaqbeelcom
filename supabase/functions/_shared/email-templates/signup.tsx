/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_WELCOME = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='9' cy='7' r='4'/%3E%3Cpath d='M22 21v-2a4 4 0 0 0-3-3.87'/%3E%3Cpath d='M16 3.13a4 4 0 0 1 0 7.75'/%3E%3C/svg%3E`

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  recipientName?: string
}

export const SignupEmail = ({ confirmationUrl, recipientName }: SignupEmailProps) => (
  <EmailLayout preview="تأكيد حسابك في سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_WELCOME} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      شكراً لتسجيلك في سوق تقبيل، المنصة الأولى لتقبيل الأعمال التجارية في السعودية.
    </Text>
    <Text style={styles.text}>
      يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه لإتمام التسجيل.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>تأكيد البريد الإلكتروني</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تقم بالتسجيل في سوق تقبيل، تجاهل هذه الرسالة.
    </Text>
  </EmailLayout>
)

export default SignupEmail
