import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_CHART = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v18h18'/%3E%3Cpath d='m19 9-5 5-4-4-3 3'/%3E%3C/svg%3E`

interface WeeklyReportProps {
  recipientName?: string
  viewsThisWeek?: number
  viewsLastWeek?: number
  viewTrend?: string
  newOffers?: number
  newMessages?: number
  recommendation?: string
  listingsCount?: number
}

const WeeklyReportEmail = ({
  recipientName, viewsThisWeek = 0, viewsLastWeek = 0, viewTrend = '—',
  newOffers = 0, newMessages = 0, recommendation, listingsCount = 1,
}: WeeklyReportProps) => (
  <EmailLayout preview="تقريرك الأسبوعي من سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_CHART} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>إليك ملخص أداء إعلاناتك هذا الأسبوع ({listingsCount} إعلان):</Text>
    <Section style={styles.detailsBox}>
      <Text style={styles.detailRow}>
        <span style={styles.detailLabel}>المشاهدات:</span> {viewsThisWeek} {viewTrend}{' '}
        <span style={{ color: '#999999', fontSize: '12px' }}>(الأسبوع الماضي: {viewsLastWeek})</span>
      </Text>
      <Text style={styles.detailRow}><span style={styles.detailLabel}>العروض الجديدة:</span> {newOffers}</Text>
      <Text style={styles.detailRow}><span style={styles.detailLabel}>الرسائل:</span> {newMessages}</Text>
    </Section>
    {recommendation && (
      <Section style={tipBox}>
        <Text style={tipLabel}>توصية ذكية</Text>
        <Text style={tipText}>{recommendation}</Text>
      </Section>
    )}
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">عرض لوحة التحكم</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: WeeklyReportEmail,
  subject: 'تقريرك الأسبوعي من سوق تقبيل',
  displayName: 'التقرير الأسبوعي للبائع',
  previewData: {
    recipientName: 'أحمد', viewsThisWeek: 142, viewsLastWeek: 98,
    viewTrend: '↑', newOffers: 3, newMessages: 7,
    recommendation: 'أضف صوراً إضافية لإعلاناتك لزيادة المشاهدات بنسبة 40%',
    listingsCount: 2,
  },
} satisfies TemplateEntry

const tipBox = { backgroundColor: '#FFFBEB', borderRadius: '10px', padding: '16px 20px', margin: '0 0 24px', border: '1px solid #FDE68A' } as React.CSSProperties
const tipLabel = { fontSize: '13px', fontWeight: '600' as const, color: '#B45309', margin: '0 0 6px', fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" } as React.CSSProperties
const tipText = { fontSize: '14px', color: '#92400E', lineHeight: '1.6', margin: '0', fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" } as React.CSSProperties
