import './globals.css'
import { Inter } from 'next/font/google'
import { WalletSelectorProvider } from './components/WalletSelectorProvider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial']
})

export const metadata = {
  title: 'AgriGuard - Smart Crop Insurance',
  description: 'Parametric crop insurance powered by WeatherXM\'s network of 8000+ weather stations. Get instant payouts when weather threatens your harvest.',
  keywords: 'crop insurance, parametric insurance, weather data, farming, agriculture, WeatherXM',
  authors: [{ name: 'AgriGuard Team' }],
  creator: 'AgriGuard',
  publisher: 'AgriGuard',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://agriguard.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AgriGuard - Smart Crop Insurance',
    description: 'Parametric crop insurance powered by WeatherXM\'s network of 8000+ weather stations.',
    url: 'https://agriguard.com',
    siteName: 'AgriGuard',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AgriGuard - Smart Crop Insurance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgriGuard - Smart Crop Insurance',
    description: 'Parametric crop insurance powered by WeatherXM\'s network of 8000+ weather stations.',
    creator: '@AgriGuard',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
    yandex: 'your-yandex-verification',
    yahoo: 'your-yahoo-verification',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">
        <WalletSelectorProvider>
          <div id="root">
            {children}
          </div>
        </WalletSelectorProvider>
      </body>
    </html>
  )
}
