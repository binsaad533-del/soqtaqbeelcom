/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_INVITE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='9' cy='7' r='4'/%3E%3Cline x1='19' x2='19' y1='8' y2='14'/%3E%3Cline x1='22' x2='16' y1='11' y2='11'/%3E%3C/svg%3E`

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  recipientName?: string
}

export const InviteEmail = ({ confirmationUrl, recipientName }: InviteEmailProps) => (
  <EmailLayout preview="دعوة للانضمام إلى سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_INVITE} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      تمت دعوتك للانضمام إلى سوق تقبيل، المنصة الأولى لتقبيل الأعمال التجارية في السعودية.
    </Text>
    <Text style={styles.text}>
      اضغط الزر أدناه لقبول الدعوة وإنشاء حسابك.
    </Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={confirmationUrl}>قبول الدعوة</Button>
    </Section>
    <Text style={styles.hint}>
      إذا لم تكن تتوقع هذه الدعوة، تجاهل هذه الرسالة.
    </Text>
  </EmailLayout>
)

export default InviteEmail
