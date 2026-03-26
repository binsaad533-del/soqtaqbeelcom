/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Section, Text, Link, Hr, Img,
} from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://soqtaqbeel.com'

const SOCIAL = {
  linkedin: { url: 'https://www.linkedin.com/company/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'/%3E%3Crect width='4' height='12' x='2' y='9'/%3E%3Ccircle cx='4' cy='4' r='2'/%3E%3C/svg%3E` },
  x: { url: 'https://x.com/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E` },
  tiktok: { url: 'https://www.tiktok.com/@soq_taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath d='M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0z'/%3E%3C/svg%3E` },
  snapchat: { url: 'https://www.snapchat.com/add/taqbeel', icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath d='M12.166 1c1.34 0 2.747.49 3.51 1.87.548 1.001.49 2.28.415 3.335l-.015.2c-.01.135-.02.27-.025.4a.606.606 0 0 0 .39.56c.156.06.33.09.496.09.26 0 .53-.06.75-.15.12-.05.25-.08.38-.08.2 0 .39.06.55.17.29.2.38.51.35.78-.04.38-.32.68-.68.88-.16.09-.34.16-.52.22-.1.03-.2.07-.3.11-.46.19-.78.44-.78.75 0 .04.01.08.02.12.26 1.06 1.43 2.07 2.19 2.39.09.04.18.08.24.12.41.24.63.54.63.89 0 .31-.18.58-.52.78a4.53 4.53 0 0 1-1.48.56c-.07.01-.14.04-.2.07-.14.08-.19.19-.25.37-.03.08-.06.17-.11.26-.13.27-.38.54-.94.54-.15 0-.33-.02-.54-.06a6.04 6.04 0 0 0-1.15-.13c-.4 0-.72.05-1.03.16-.41.14-.79.41-1.22.71-.63.45-1.35.96-2.41.96h-.11c-1.06 0-1.78-.51-2.41-.96-.43-.3-.81-.57-1.22-.71-.31-.11-.62-.16-1.03-.16-.42 0-.82.05-1.15.13-.21.04-.39.06-.54.06-.49 0-.77-.2-.93-.52-.05-.09-.08-.18-.11-.26-.06-.18-.12-.29-.25-.37-.06-.03-.13-.05-.2-.07a4.53 4.53 0 0 1-1.48-.56C1.18 14.88 1 14.61 1 14.3c0-.35.22-.65.63-.89.06-.04.15-.08.24-.12.76-.32 1.93-1.33 2.19-2.39.01-.04.02-.08.02-.12 0-.31-.32-.56-.78-.75-.1-.04-.2-.08-.3-.11-.18-.06-.36-.13-.52-.22-.36-.2-.64-.5-.68-.88a.74.74 0 0 1 .35-.78.93.93 0 0 1 .55-.17c.13 0 .26.03.38.08.22.09.49.15.75.15.17 0 .34-.03.5-.09a.606.606 0 0 0 .38-.56c-.01-.13-.02-.27-.03-.4l-.01-.2c-.08-1.05-.13-2.33.41-3.34C8.42 1.49 9.83 1 11.17 1h1z'/%3E%3C/svg%3E` },
}

const NAV_LINKS = [
  { label: 'الرئيسية', href: SITE_URL },
  { label: 'السوق', href: `${SITE_URL}/marketplace` },
  { label: 'كيف تعمل المنصة', href: `${SITE_URL}/how-it-works` },
  { label: 'تواصل معنا', href: `${SITE_URL}/contact` },
  { label: 'مركز المساعدة', href: `${SITE_URL}/help` },
]

const LOGO_URL = 'https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/email-assets/logo-icon-gold.png'

const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"

export const EmailFooter = () => (
  <Section style={footerWrapper}>
    <Hr style={divider} />

    {/* Navigation links */}
    <Section style={navSection}>
      <Text style={navRow}>
        {NAV_LINKS.map((link, i) => (
          <React.Fragment key={link.href}>
            {i > 0 && <span style={navSep}> | </span>}
            <Link href={link.href} style={navLink}>{link.label}</Link>
          </React.Fragment>
        ))}
      </Text>
    </Section>

    {/* Logo icon */}
    <Section style={logoSection}>
      <Img src={LOGO_URL} width="36" height="36" alt="سوق تقبيل" style={{ margin: '0 auto' }} />
    </Section>

    {/* Social icons */}
    <Section style={socialSection}>
      <Text style={socialRow}>
        {Object.entries(SOCIAL).map(([key, { url, icon }]) => (
          <Link key={key} href={url} style={socialLink}>
            <Img src={icon} width="20" height="20" alt={key} style={socialIcon} />
          </Link>
        ))}
      </Text>
    </Section>

    {/* Saudi tagline */}
    <Text style={tagline}>في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦</Text>

    {/* Copyright */}
    <Text style={copyright}>© 2026 المنصة مملوكة ومدارة بواسطة شركة Ain Jasaas</Text>
  </Section>
)

const footerWrapper = { padding: '0 0 20px', textAlign: 'center' as const }
const divider = { borderColor: '#e8ecf0', margin: '32px 0 24px' }
const navSection = { textAlign: 'center' as const, marginBottom: '20px' }
const navRow = { fontSize: '12px', lineHeight: '2', margin: '0', fontFamily: FONT }
const navLink = { color: '#7a8a9c', textDecoration: 'none', fontSize: '12px', fontFamily: FONT }
const navSep = { color: '#d1d5db', fontSize: '12px', padding: '0 4px' }
const logoSection = { textAlign: 'center' as const, marginBottom: '16px' }
const socialSection = { textAlign: 'center' as const, marginBottom: '16px' }
const socialRow = { margin: '0', lineHeight: '1' }
const socialLink = { display: 'inline-block', marginLeft: '12px', marginRight: '12px', textDecoration: 'none' }
const socialIcon = { display: 'inline-block', verticalAlign: 'middle' }
const tagline = { fontSize: '13px', color: '#9ca3af', margin: '0 0 8px', fontFamily: FONT }
const copyright = { fontSize: '11px', color: '#c0c5cc', margin: '0', fontFamily: FONT }
