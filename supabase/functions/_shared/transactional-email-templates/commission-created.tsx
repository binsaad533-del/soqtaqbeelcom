import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2300AEEF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='5' width='20' height='14' rx='2'/%3E%3Cline x1='2' y1='10' x2='22' y2='10'/%3E%3C/svg%3E`

interface CommissionCreatedProps {
  recipientName?: string
  listingTitle?: string
  amount?: string
  vatAmount?: string
  totalWithVat?: string
  dealId?: string
}

const CommissionCreatedEmail = ({ recipientName, listingTitle, amount, vatAmount, totalWithVat }: CommissionCreatedProps) => (
  <EmailLayout preview={`عمولة مستحقة بقيمة ${totalWithVat || amount || '—'} ر.س`}>
    <Section style={styles.iconSection}>
      <Img src={ICON} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>{recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}</Text>
    <Text style={styles.text}>تم إتمام صفقتك بنجاح! يترتب عليها عمولة منصة بنسبة 1% وفق سياسة سوق تقبيل.</Text>
    <Section style={styles.detailsBox}>
      {listingTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>الصفقة:</span> {listingTitle}</Text>}
      {amount && <Text style={styles.detailRow}><span style={styles.detailLabel}>العمولة:</span> {amount} ر.س</Text>}
      {vatAmount && <Text style={styles.detailRow}><span style={styles.detailLabel}>ضريبة القيمة المضافة (15%):</span> {vatAmount} ر.س</Text>}
      {totalWithVat && <Text style={styles.detailRow}><span style={styles.detailLabel}>الإجمالي شامل الضريبة:</span> {totalWithVat} ر.س</Text>}
    </Section>
    <Text style={styles.text}>يرجى السداد عبر التحويل البنكي ثم رفع إثبات الدفع من لوحة التحكم.</Text>
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">سداد العمولة</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: CommissionCreatedEmail,
  subject: (data: Record<string, any>) => `عمولة مستحقة بقيمة ${data.totalWithVat || data.amount || ''} ر.س`,
  displayName: 'عمولة مستحقة جديدة',
  previewData: { recipientName: 'أحمد', listingTitle: 'مطعم شعبي - الرياض', amount: '1,200', vatAmount: '180', totalWithVat: '1,380' },
} satisfies TemplateEntry
