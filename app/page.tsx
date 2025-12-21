'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [tenantCode, setTenantCode] = useState<string>('beauty-salon-001');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4 text-pink-600">
            💅 らくポチビューティー 💅
          </h1>
          <p className="text-center text-gray-700 mb-12 text-lg">
            美容院予約管理システム
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              店舗コードを入力
            </h2>
            <div className="mb-6">
              <input
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="店舗コードを入力"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href={`/reservation?tenant=${tenantCode}`}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors"
              >
                予約する
              </Link>
              <Link
                href={`/mypage?tenant=${tenantCode}`}
                className="bg-pink-300 hover:bg-pink-400 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors"
              >
                マイページ
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              スタッフの方はこちら
            </h2>
            <Link
              href="/admin/login"
              className="block bg-gray-700 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors"
            >
              管理画面にログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

