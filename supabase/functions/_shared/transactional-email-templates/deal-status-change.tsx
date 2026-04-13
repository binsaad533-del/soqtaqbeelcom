import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles, BRAND_BLUE } from '../email-layout.tsx'

const ICONS: Record<string, { src: string; color: string }> = {
  pending: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E`, color: '#f59e0b' },
  negotiation: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m11 17 2 2a1 1 0 1 0 3-3'/%3E%3Cpath d='m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4'/%3E%3Cpath d='m21 3 1 11h-2'/%3E%3Cpath d='M3 21 4 10h2'/%3E%3Cpath d='m7 11 2 2'/%3E%3C/svg%3E`, color: '#00AEEF' },
  agreement: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/%3E%3Cpath d='M14 2v4a2 2 0 0 0 2 2h4'/%3E%3Cpath d='m9 15 2 2 4-4'/%3E%3C/svg%3E`, color: '#6366f1' },
  finalized: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpath d='m9 11 3 3L22 4'/%3E%3C/svg%3E`, color: '#16a34a' },
  completed: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6'/%3E%3Cpath d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18'/%3E%3Cpath d='M4 22h16'/%3E%3Cpath d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22'/%3E%3Cpath d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22'/%3E%3Cpath d='M18 2H6v7a6 6 0 0 0 12 0V2Z'/%3E%3C/svg%3E`, color: '#16a34a' },
  cancelled: { src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m15 9-6 6'/%3E%3Cpath d='m9 9 6 6'/%3E%3C/svg%3E`, color: '#ef4444' },
}

const statusMap: Record<string, { label: string }> = {
  pending: { label: 'قيد الانتظار' },
  negotiation: { label: 'جاري التفاوض' },
  agreement: { label: 'مرحلة الاتفاقية' },
  finalized: { label: 'تم الاعتماد' },
  completed: { label: 'مكتملة' },
  cancelled: { label: 'ملغية' },
}

interface DealStatusProps {
  recipientName?: string
  dealTitle?: string
  oldStatus?: string
  newStatus?: string
  agreedPrice?: string
}

const DealStatusChangeEmail = ({
  recipientName, dealTitle, oldStatus, newStatus = 'negotiation', agreedPrice,
}: DealStatusProps) => {
  const icon = ICONS[newStatus] || ICONS.negotiation
  const status = statusMap[newStatus] || statusMap.negotiation
  const oldStatusLabel = oldStatus && statusMap[oldStatus] ? statusMap[oldStatus].label : undefined
  return (
    <EmailLayout preview={`تحديث على صفقتك: ${status.label}`}>
      <Section style={styles.iconSection}>
        <Img src={icon.src} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
      </Section>
      <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
      <Text style={styles.text}>نود إعلامك بتحديث جديد على صفقتك.</Text>
      <Section style={styles.detailsBox}>
        {dealTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الصفقة:</span> {dealTitle}</Text>}
        <Text style={styles.detailRow}>
          <span style={styles.detailLabel}>الحالة الجديدة:</span>{' '}
          <span style={{ color: icon.color, fontWeight: '600' as const }}>{status.label}</span>
        </Text>
        {oldStatusLabel && <Text style={styles.detailRow}><span style={styles.detailLabel}>الحالة السابقة:</span> {oldStatusLabel}</Text>}
        {agreedPrice && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ:</span> {agreedPrice} ر.س</Text>}
      </Section>
      <Section style={styles.buttonSection}>
        <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">متابعة الصفقة</Button>
      </Section>
    </EmailLayout>
  )
}

export const template = {
  component: DealStatusChangeEmail,
  subject: (data: Record<string, any>) => {
    const label = statusMap[data.newStatus]?.label || 'تحديث'
    return `تحديث على صفقتك: ${label}`
  },
  displayName: 'تغيير حالة الصفقة',
  previewData: { recipientName: 'أحمد', dealTitle: 'مطعم شعبي - الرياض', oldStatus: 'pending', newStatus: 'negotiation', agreedPrice: '150,000' },
} satisfies TemplateEntry
