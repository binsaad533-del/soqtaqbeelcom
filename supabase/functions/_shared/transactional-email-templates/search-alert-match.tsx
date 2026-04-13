import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_SEARCH = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E`

interface SearchAlertProps {
  recipientName?: string
  listingTitle?: string
  city?: string
  price?: string
  listingUrl?: string
}

const SearchAlertMatchEmail = ({ recipientName, listingTitle, city, price, listingUrl }: SearchAlertProps) => (
  <EmailLayout preview="فرصة جديدة تطابق بحثك">
    <Section style={styles.iconSection}>
      <Img src={ICON_SEARCH} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>وجدنا فرصة جديدة تطابق معايير البحث التي حددتها.</Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الفرصة:</span> {listingTitle}</Text>}
      {city && <Text style={styles.detailRow}><span style={styles.detailLabel}>المدينة:</span> {city}</Text>}
      {price && <Text style={styles.detailRow}><span style={styles.detailLabel}>السعر:</span> {price} ر.س</Text>}
    </Section>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href={listingUrl || 'https://soqtaqbeel.com/marketplace'}>عرض الفرصة</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: SearchAlertMatchEmail,
  subject: 'فرصة جديدة تطابق بحثك',
  displayName: 'تنبيه بحث مطابق',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', city: 'الرياض', price: '85,000' },
} satisfies TemplateEntry
