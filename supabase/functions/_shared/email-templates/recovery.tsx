/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  recipientName?: string
}

export const RecoveryEmail = ({ confirmationUrl, recipientName }: RecoveryEmailProps) => (
  <EmailLayout preview="إعادة تعيين كلمة المرور — سوق تقبيل">
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في سوق تقبيل.
    </Text>
    <Text style={styles.text}>
      اضغط الزر أدناه لتعيين كلمة مرور جديدة. الرابط صالح لفترة محدودة.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>تعيين كلمة مرور جديدة</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تطلب هذا الإجراء، تجاهل هذا البريد وستبقى كلمة مرورك كما هي.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
