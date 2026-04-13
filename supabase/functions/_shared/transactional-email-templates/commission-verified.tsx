import * as React from 'npm:react@18.3.1'
import { Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpolyline points='22 4 12 14.01 9 11.01'/%3E%3C/svg%3E`

interface CommissionVerifiedProps {
  recipientName?: string
  listingTitle?: string
  amount?: string
}

const CommissionVerifiedEmail = ({ recipientName, listingTitle, amount }: CommissionVerifiedProps) => (
  <EmailLayout preview="تم تأكيد سداد عمولتك — شكراً لالتزامك">
    <Section style={styles.iconSection}>
      <Img src={ICON} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>تم تأكيد سداد عمولتك بنجاح. شكراً لالتزامك.</Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الصفقة:</span> {listingTitle}</Text>}
      {amount && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المسدد:</span> {amount} ر.س</Text>}
    </Section>
    <Text style={styles.text}>يمكنك تحميل إيصال السداد من لوحة التحكم الخاصة بك.</Text>
  </EmailLayout>
)

export const template = {
  component: CommissionVerifiedEmail,
  subject: 'تم تأكيد سداد عمولتك — شكراً لالتزامك',
  displayName: 'تأكيد سداد العمولة',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', amount: '1,380' },
} satisfies TemplateEntry
