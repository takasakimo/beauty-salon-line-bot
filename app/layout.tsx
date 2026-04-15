import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from './contexts/CartContext'

export const metadata: Metadata = {
  title: 'らくっぽリザーブ - 美容室・サロン向け会員制予約システム｜予約手数料0円',
  description: '美容室・サロン向けの完全会員制Web予約・顧客管理システム。予約手数料0円・月額固定で顧客を自社に囲い込み。ホットペッパーからの乗り換えにも。',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}





