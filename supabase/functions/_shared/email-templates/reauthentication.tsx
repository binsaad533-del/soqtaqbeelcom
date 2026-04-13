/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_SHIELD = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E`

interface ReauthenticationEmailProps {
  token: string
  recipientName?: string
}

export const ReauthenticationEmail = ({ token, recipientName }: ReauthenticationEmailProps) => (
  <EmailLayout preview="رمز التحقق - سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_SHIELD} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={{ ...styles.greeting, textAlign: 'center' as const }}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={{ ...styles.text, textAlign: 'center' as const }}>
      استخدم الرمز أدناه لتأكيد هويتك:
    </Text>
    <Section style={styles.codeBox}>
      <Text style={styles.codeStyle}>{token}</Text>
    </Section>
    <Text style={styles.hint}>
      هذا الرمز سينتهي خلال فترة قصيرة. إذا لم تطلبه، تجاهل هذه الرسالة.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail
