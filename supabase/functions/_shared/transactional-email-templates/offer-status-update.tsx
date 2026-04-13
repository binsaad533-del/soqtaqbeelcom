import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICONS = {
  accepted: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpath d='m9 11 3 3L22 4'/%3E%3C/svg%3E`,
  rejected: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m15 9-6 6'/%3E%3Cpath d='m9 9 6 6'/%3E%3C/svg%3E`,
  counter: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/%3E%3Cpath d='M3 3v5h5'/%3E%3Cpath d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16'/%3E%3Cpath d='M16 16h5v5'/%3E%3C/svg%3E`,
}

interface OfferStatusProps {
  recipientName?: string
  listingTitle?: string
  offeredPrice?: string
  status?: 'accepted' | 'rejected' | 'counter'
  sellerResponse?: string
}

const statusLabels: Record<string, { icon: string; title: string; desc: string }> = {
  accepted: { icon: ICONS.accepted, title: 'تم قبول عرضك', desc: 'يسعدنا إبلاغك بأن البائع قد وافق على عرضك.' },
  rejected: { icon: ICONS.rejected, title: 'تحديث على عرضك', desc: 'نود إعلامك بأن البائع لم يوافق على عرضك الحالي.' },
  counter: { icon: ICONS.counter, title: 'رد جديد على عرضك', desc: 'قام البائع بالرد على عرضك برسالة جديدة.' },
}

const OfferStatusEmail = ({ recipientName, listingTitle, offeredPrice, status = 'accepted', sellerResponse }: OfferStatusProps) => {
  const info = statusLabels[status] || statusLabels.accepted
  return (
    <EmailLayout preview={info.title}>
      <Section style={styles.iconSection}>
        <Img src={info.icon} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
      </Section>
      <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
      <Text style={styles.text}>{info.desc}</Text>
      <Section style={styles.detailsBox}>
        {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الإعلان:</span> {listingTitle}</Text>}
        {offeredPrice && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المعروض:</span> {offeredPrice} ر.س</Text>}
        {sellerResponse && <Text style={styles.detailRow}><span style={styles.detailLabel}>رد البائع:</span> {sellerResponse}</Text>}
      </Section>
      <Section style={styles.buttonSection}>
        <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">عرض التفاصيل</Button>
      </Section>
    </EmailLayout>
  )
}

export const template = {
  component: OfferStatusEmail,
  subject: (data: Record<string, any>) => {
    const labels: Record<string, string> = { accepted: 'تم قبول عرضك', rejected: 'تحديث على عرضك', counter: 'رد جديد على عرضك' }
    return labels[data.status] || 'تحديث على عرضك'
  },
  displayName: 'تحديث حالة العرض',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', offeredPrice: '120,000', status: 'accepted' },
} satisfies TemplateEntry
