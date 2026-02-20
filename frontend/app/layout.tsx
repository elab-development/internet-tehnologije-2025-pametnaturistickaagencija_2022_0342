import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/context/AuthContext'
import { Footer } from './components/layout/Footer'
import { getSettings } from '@/lib/settings'
import Main from './components/Main'
const inter = Inter({ subsets: ['latin'] })

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const settings = getSettings()

  return (
    <html lang="sr">
      <head>
        <title>{settings.siteName}</title>
        <meta name="description" content={settings.siteDescription} />
      </head>
      <body className={`${inter.className}`}>
        <Main>{children}</Main>
        <Footer email={settings.contactEmail} phoneNumber={settings.contactPhoneNumber} />
      </body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RootLayoutContent>{children}</RootLayoutContent>
    </AuthProvider>
  )
}
