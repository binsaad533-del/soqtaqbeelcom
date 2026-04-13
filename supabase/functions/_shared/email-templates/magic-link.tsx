/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_KEY = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4'/%3E%3Cpath d='m21 2-9.6 9.6'/%3E%3Ccircle cx='7.5' cy='15.5' r='5.5'/%3E%3C/svg%3E`

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  recipientName?: string
}

export const MagicLinkEmail = ({ confirmationUrl, recipientName }: MagicLinkEmailProps) => (
  <EmailLayout preview="رابط تسجيل الدخول">
    <Section style={styles.iconSection}>
      <Img src={ICON_KEY} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      اضغط الزر أدناه لتسجيل الدخول إلى حسابك في سوق تقبيل.
    </Text>
    <Text style={styles.text}>
      هذا الرابط سينتهي خلال فترة قصيرة لحماية حسابك.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>تسجيل الدخول</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تطلب رابط الدخول، تجاهل هذه الرسالة.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
