/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_LOCK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2' ry='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3C/svg%3E`

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  recipientName?: string
}

export const RecoveryEmail = ({ confirmationUrl, recipientName }: RecoveryEmailProps) => (
  <EmailLayout preview="إعادة تعيين كلمة المرور">
    <Section style={styles.iconSection}>
      <Img src={ICON_LOCK} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في سوق تقبيل.
    </Text>
    <Text style={styles.text}>
      اضغط الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لفترة محدودة.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>إعادة تعيين كلمة المرور</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
