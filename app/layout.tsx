import type { Metadata } from 'next'
import { Fraunces, Instrument_Sans, Pacifico } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz', 'SOFT'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  style: ['normal', 'italic'],
  display: 'swap',
})

const pacifico = Pacifico({
  subsets: ['latin'],
  variable: '--font-pacifico',
  weight: '400',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'giftly — products find their creators',
  description:
    'giftly matches dtc brands with vetted creators. products ship free, no strings. creators post only if they love it. brands pay commission only when sales happen.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} ${pacifico.variable}`}
    >
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-ink focus:text-cream focus:px-4 focus:py-2 focus:rounded-full"
        >
          skip to content
        </a>
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
