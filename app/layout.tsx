import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'らくっぽリザーブ - 個人サロン向け予約管理システム',
  description: '個人サロン向けの予約管理システム',
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





