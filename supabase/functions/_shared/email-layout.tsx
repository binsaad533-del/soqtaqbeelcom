/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Section, Text, Img, Hr, Link,
} from 'npm:@react-email/components@0.0.22'

// ─── Brand Constants ───
export const SITE_NAME = 'سوق تقبيل'
export const SITE_NAME_EN = 'SOQ TAQBEEL'
export const SITE_URL = 'https://soqtaqbeel.com'
export const BRAND_BLUE = '#00AEEF'
export const TEXT_PRIMARY = '#333333'
export const TEXT_SECONDARY = '#666666'
export const TEXT_MUTED = '#999999'
export const BG_OUTER = '#F5F5F5'
export const BG_CARD = '#FFFFFF'
export const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
export const FONT_URL = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap'

const LOGO_URL = 'https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/email-assets/logo-icon-gold.png'

// Social icons (small, gray)
const SOCIAL = [
  { key: 'snapchat', url: 'https://www.snapchat.com/add/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='%23999999'%3E%3Cpath d='M12.166 1c1.34 0 2.747.49 3.51 1.87.548 1.001.49 2.28.415 3.335l-.015.2c-.01.135-.02.27-.025.4a.606.606 0 0 0 .39.56c.156.06.33.09.496.09.26 0 .53-.06.75-.15.12-.05.25-.08.38-.08.2 0 .39.06.55.17.29.2.38.51.35.78-.04.38-.32.68-.68.88-.16.09-.34.16-.52.22-.1.03-.2.07-.3.11-.46.19-.78.44-.78.75 0 .04.01.08.02.12.26 1.06 1.43 2.07 2.19 2.39.09.04.18.08.24.12.41.24.63.54.63.89 0 .31-.18.58-.52.78a4.53 4.53 0 0 1-1.48.56c-.07.01-.14.04-.2.07-.14.08-.19.19-.25.37-.03.08-.06.17-.11.26-.13.27-.38.54-.94.54-.15 0-.33-.02-.54-.06a6.04 6.04 0 0 0-1.15-.13c-.4 0-.72.05-1.03.16-.41.14-.79.41-1.22.71-.63.45-1.35.96-2.41.96h-.11c-1.06 0-1.78-.51-2.41-.96-.43-.3-.81-.57-1.22-.71-.31-.11-.62-.16-1.03-.16-.42 0-.82.05-1.15.13-.21.04-.39.06-.54.06-.49 0-.77-.2-.93-.52-.05-.09-.08-.18-.11-.26-.06-.18-.12-.29-.25-.37-.06-.03-.13-.05-.2-.07a4.53 4.53 0 0 1-1.48-.56C1.18 14.88 1 14.61 1 14.3c0-.35.22-.65.63-.89.06-.04.15-.08.24-.12.76-.32 1.93-1.33 2.19-2.39.01-.04.02-.08.02-.12 0-.31-.32-.56-.78-.75-.1-.04-.2-.08-.3-.11-.18-.06-.36-.13-.52-.22-.36-.2-.64-.5-.68-.88a.74.74 0 0 1 .35-.78.93.93 0 0 1 .55-.17c.13 0 .26.03.38.08.22.09.49.15.75.15.17 0 .34-.03.5-.09a.606.606 0 0 0 .38-.56c-.01-.13-.02-.27-.03-.4l-.01-.2c-.08-1.05-.13-2.33.41-3.34C8.42 1.49 9.83 1 11.17 1h1z'/%3E%3C/svg%3E` },
  { key: 'tiktok', url: 'https://www.tiktok.com/@soq_taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='%23999999'%3E%3Cpath d='M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0z'/%3E%3C/svg%3E` },
  { key: 'x', url: 'https://x.com/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='%23999999'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E` },
  { key: 'linkedin', url: 'https://www.linkedin.com/company/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='%23999999'%3E%3Cpath d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'/%3E%3Crect width='4' height='12' x='2' y='9'/%3E%3Ccircle cx='4' cy='4' r='2'/%3E%3C/svg%3E` },
]

// ─── Shared Styles ───
export const styles = {
  // Layout
  main: { backgroundColor: BG_OUTER, fontFamily: FONT, direction: 'rtl' as const } as React.CSSProperties,
  outerContainer: { padding: '32px 16px', maxWidth: '600px', margin: '0 auto' } as React.CSSProperties,
  card: { backgroundColor: BG_CARD, borderRadius: '12px', overflow: 'hidden' as const } as React.CSSProperties,
  cardBody: { padding: '32px 28px' } as React.CSSProperties,

  // Header
  headerSection: { textAlign: 'center' as const, padding: '28px 28px 0' } as React.CSSProperties,
  logoImg: { margin: '0 auto 12px' } as React.CSSProperties,
  brandName: { fontSize: '20px', fontWeight: '700' as const, color: TEXT_PRIMARY, margin: '0', fontFamily: FONT } as React.CSSProperties,
  brandNameEn: { fontSize: '10px', fontWeight: '500' as const, color: TEXT_MUTED, margin: '4px 0 0', letterSpacing: '3px', textTransform: 'uppercase' as const, fontFamily: FONT } as React.CSSProperties,
  headerDivider: { borderColor: BRAND_BLUE, borderWidth: '2px', borderStyle: 'solid', margin: '20px 28px 0' } as React.CSSProperties,

  // Content
  greeting: { fontSize: '16px', fontWeight: '600' as const, color: TEXT_PRIMARY, margin: '0 0 16px', fontFamily: FONT } as React.CSSProperties,
  text: { fontSize: '15px', color: TEXT_SECONDARY, lineHeight: '1.8', margin: '0 0 16px', fontFamily: FONT } as React.CSSProperties,
  hint: { fontSize: '12px', color: TEXT_MUTED, lineHeight: '1.6', margin: '0', fontFamily: FONT } as React.CSSProperties,

  // Details box
  detailsBox: { backgroundColor: '#F0F8FF', borderRadius: '10px', padding: '18px 22px', margin: '0 0 24px', border: '1px solid #D6EEFF' } as React.CSSProperties,
  detailRow: { fontSize: '14px', color: TEXT_PRIMARY, margin: '0 0 8px', lineHeight: '1.6', fontFamily: FONT } as React.CSSProperties,
  detailLabel: { fontWeight: '600' as const } as React.CSSProperties,

  // Buttons
  buttonSection: { textAlign: 'center' as const, margin: '8px 0 24px' } as React.CSSProperties,
  button: { backgroundColor: BRAND_BLUE, color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, padding: '13px 36px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT } as React.CSSProperties,
  secondaryButton: { backgroundColor: TEXT_PRIMARY, color: '#ffffff', fontSize: '14px', fontWeight: '500' as const, padding: '11px 28px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block', fontFamily: FONT } as React.CSSProperties,

  // Icon
  iconSection: { textAlign: 'center' as const, marginBottom: '16px' } as React.CSSProperties,

  // Code box (for OTP)
  codeBox: { backgroundColor: '#F0F8FF', borderRadius: '10px', padding: '20px', margin: '0 0 24px', border: '1px solid #D6EEFF', textAlign: 'center' as const } as React.CSSProperties,
  codeStyle: { fontFamily: "'IBM Plex Sans Arabic', Courier, monospace", fontSize: '32px', fontWeight: 'bold' as const, color: BRAND_BLUE, margin: '0', letterSpacing: '6px' } as React.CSSProperties,
}

// ─── Email Header Component ───
export const EmailHeader = () => (
  <>
    <Section style={styles.headerSection}>
      <Img src={LOGO_URL} width="48" height="48" alt={SITE_NAME} style={styles.logoImg} />
      <Text style={styles.brandName}>{SITE_NAME}</Text>
      <Text style={styles.brandNameEn}>{SITE_NAME_EN}</Text>
    </Section>
    <Hr style={styles.headerDivider} />
  </>
)

// ─── Email Footer Component (compact, no logo) ───
export const EmailFooterV2 = () => (
  <Section style={footerWrapper}>
    <Hr style={footerDivider} />

    {/* Social icons */}
    <Section style={socialSection}>
      <Text style={socialRow}>
        {SOCIAL.map(({ key, url, icon }) => (
          <Link key={key} href={url} style={socialLink}>
            <Img src={icon} width="18" height="18" alt={key} style={socialIconStyle} />
          </Link>
        ))}
      </Text>
    </Section>

    {/* Brand tagline */}
    <Text style={tagline}>سوق تقبيل — منصة الفرص المتعثرة</Text>
    <Text style={saudiTag}>في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦</Text>
    <Text style={copyright}>© 2026 المنصة مملوكة ومدارة بواسطة شركة عين جساس</Text>

    {/* Links */}
    <Text style={linksRow}>
      <Link href={`${SITE_URL}/notification-settings`} style={footerLink}>تفضيلات الإشعارات</Link>
    </Text>
  </Section>
)

// ─── Email Layout Wrapper ───
interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <link rel="stylesheet" href={FONT_URL} />
    </Head>
    {preview && <Text style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{preview}</Text>}
    <Body style={styles.main}>
      <Container style={styles.outerContainer}>
        <Section style={styles.card}>
          <EmailHeader />
          <Section style={styles.cardBody}>
            {children}
          </Section>
        </Section>
        <EmailFooterV2 />
      </Container>
    </Body>
  </Html>
)

// Footer styles
const footerWrapper = { padding: '20px 0 8px', textAlign: 'center' as const } as React.CSSProperties
const footerDivider = { borderColor: '#E0E0E0', margin: '0 0 20px' } as React.CSSProperties
const socialSection = { textAlign: 'center' as const, marginBottom: '12px' } as React.CSSProperties
const socialRow = { margin: '0', lineHeight: '1' } as React.CSSProperties
const socialLink = { display: 'inline-block', marginLeft: '10px', marginRight: '10px', textDecoration: 'none' } as React.CSSProperties
const socialIconStyle = { display: 'inline-block', verticalAlign: 'middle' } as React.CSSProperties
const tagline = { fontSize: '12px', color: TEXT_MUTED, margin: '0 0 4px', fontFamily: FONT } as React.CSSProperties
const saudiTag = { fontSize: '11px', color: '#AAAAAA', margin: '0 0 4px', fontFamily: FONT } as React.CSSProperties
const copyright = { fontSize: '10px', color: '#CCCCCC', margin: '0 0 8px', fontFamily: FONT } as React.CSSProperties
const linksRow = { fontSize: '11px', margin: '0', fontFamily: FONT } as React.CSSProperties
const footerLink = { color: BRAND_BLUE, textDecoration: 'underline', fontSize: '11px', fontFamily: FONT } as React.CSSProperties
