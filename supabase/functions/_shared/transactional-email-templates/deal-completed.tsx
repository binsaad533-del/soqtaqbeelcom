import * as React from 'npm:react@18.3.1'
import { Button, Section, Text, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, styles } from '../email-layout.tsx'

const ICON_CHECK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpath d='m9 11 3 3L22 4'/%3E%3C/svg%3E`

interface DealCompletedProps {
  recipientName?: string
  dealTitle?: string
  agreementNumber?: string
  agreedPrice?: string
  otherPartyName?: string
  role?: string
  pdfUrl?: string
}

const DealCompletedEmail = ({
  recipientName, dealTitle, agreementNumber, agreedPrice, otherPartyName, role, pdfUrl,
}: DealCompletedProps) => (
  <EmailLayout preview="تم إتمام صفقتك بنجاح على سوق تقبيل">
    <Section style={styles.iconSection}>
      <Img src={ICON_CHECK} width="44" height="44" alt="" style={{ margin: '0 auto' }} />
    </Section>
    <Text style={styles.greeting}>
      {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
    </Text>
    <Text style={styles.text}>
      يسعدنا إبلاغك بأن الصفقة قد تمت بنجاح وتم اعتمادها من كلا الطرفين.
    </Text>
    <Section style={styles.detailsBox}>
      {dealTitle && <Text style={styles.detailRow}><span style={styles.detailLabel}>عنوان الصفقة:</span> {dealTitle}</Text>}
      {agreementNumber && <Text style={styles.detailRow}><span style={styles.detailLabel}>رقم الاتفاقية:</span> {agreementNumber}</Text>}
      {agreedPrice && <Text style={styles.detailRow}><span style={styles.detailLabel}>المبلغ المتفق عليه:</span> {agreedPrice} ر.س</Text>}
      {otherPartyName && <Text style={styles.detailRow}><span style={styles.detailLabel}>{role === 'buyer' ? 'البائع:' : 'المشتري:'}</span> {otherPartyName}</Text>}
    </Section>
    <Text style={styles.text}>يمكنك مراجعة تفاصيل الاتفاقية من خلال حسابك على المنصة.</Text>
    {pdfUrl && (
      <Section style={styles.buttonSection}>
        <Button style={styles.secondaryButton} href={pdfUrl}>تحميل ملف الاتفاقية PDF</Button>
      </Section>
    )}
    <Section style={styles.buttonSection}>
      <Button style={styles.button} href="https://soqtaqbeel.com/dashboard">عرض لوحة التحكم</Button>
    </Section>
  </EmailLayout>
)

export const template = {
  component: DealCompletedEmail,
  subject: 'تم إتمام صفقتك بنجاح',
  displayName: 'تأكيد إتمام الصفقة',
  previewData: {
    recipientName: 'أحمد', dealTitle: 'مطعم شعبي - الرياض',
    agreementNumber: 'AGR-123456-V1', agreedPrice: '150,000',
    otherPartyName: 'محمد', role: 'buyer',
  },
} satisfies TemplateEntry
