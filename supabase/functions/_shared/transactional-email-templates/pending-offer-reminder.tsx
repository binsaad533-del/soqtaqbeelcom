import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_CLOCK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E`

interface PendingOfferProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  hoursSince?: number
}

const PendingOfferReminderEmail = ({ recipientName, listingTitle, offeredPrice, hoursSince }: PendingOfferProps) => (
  <EmailLayout preview="عرض بانتظار ردك">
    <Section style={styles.iconSection}>
      <Img src={ICON_CLOCK} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>
      لديك عرض سعر بانتظار ردك{hoursSince ? ` منذ ${hoursSince} ساعة` : ''}.
    </Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الإعلان:</span> {listingTitle}</Text>}
      {offeredPrice && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المعروض:</span> {offeredPrice} ر.س</Text>}
    </Section>
    <Text style={styles.text}>سارع بالرد على العرض قبل فوات الفرصة.</Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">مراجعة العرض</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: PendingOfferReminderEmail,
  subject: 'عرض بانتظار ردك',
  displayName: 'تذكير بعرض معلّق',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', hoursSince: 48 },
} satisfies TemplateEntry
