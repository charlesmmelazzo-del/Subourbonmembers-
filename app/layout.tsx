import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Subourbon — Members',
    template: '%s · Subourbon',
  },
  description: 'The members portal for Subourbon, Wheaton, Illinois.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0d0d10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Adobe Typekit — the same kit the public site loads. */}
        <link rel="stylesheet" href="https://use.typekit.net/tia6vzj.css" />
        <link rel="icon" href="/brand/logos/mark/Subourbon_Logo_Mark_gold.svg" />
      </head>
      <body className="min-h-dvh bg-ink text-cream antialiased">{children}</body>
    </html>
  )
}
