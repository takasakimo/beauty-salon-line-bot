/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // キャッシュを無効化（開発用、本番では削除推奨）
  // generateBuildId: async () => {
  //   return `build-${Date.now()}`
  // },
}

module.exports = nextConfig
