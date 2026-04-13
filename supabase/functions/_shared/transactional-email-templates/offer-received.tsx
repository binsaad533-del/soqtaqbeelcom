import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_OFFER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' y1='1' x2='12' y2='23'/%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/%3E%3C/svg%3E`

interface OfferReceivedProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  buyerName?: string
}

const OfferReceivedEmail = ({ recipientName, listingTitle, offeredPrice, buyerName }: OfferReceivedProps) => (
  <EmailLayout preview="عرض سعر جديد على إعلانك">
    <Section style={styles.iconSection}>
      <Img src={ICON_OFFER} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>وصلك عرض سعر جديد على إعلانك.</Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الإعلان:</span> {listingTitle}</Text>}
      {offeredPrice && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المعروض:</span> {offeredPrice} ر.س</Text>}
      {buyerName && <Text style={styles.detailRow}><span style={styles.detailLabel}>من:</span> {buyerName}</Text>}
    </Section>
    <Text style={styles.text}>راجع العرض من لوحة التحكم واتخذ القرار المناسب.</Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">مراجعة العرض</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: OfferReceivedEmail,
  subject: 'عرض سعر جديد على إعلانك',
  displayName: 'عرض سعر جديد للبائع',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', buyerName: 'محمد' },
} satisfies TemplateEntry
