import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'らくポチビューティー - 美容院予約管理システム',
  description: '美容院向けの予約管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}



