/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 本番環境での最適化
  compress: true,
  poweredByHeader: false,
  
  // 環境変数（クライアント側で使用する場合のみ）
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  
  // 本番環境での画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // 本番環境でのエラーハンドリング
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig

