'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [tenantCode, setTenantCode] = useState<string>('beauty-salon-001');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-100 rounded-full mb-6">
              <SparklesIcon className="w-10 h-10 text-pink-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900">
              らくポチビューティー
            </h1>
            <p className="text-gray-600 text-lg">
              美容院予約管理システム
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              店舗コードを入力
            </h2>
            <div className="mb-6">
              <input
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="店舗コードを入力"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href={`/reservation?tenant=${tenantCode}`}
                className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                予約する
              </Link>
              <Link
                href={`/mypage?tenant=${tenantCode}`}
                className="bg-white border-2 border-pink-600 text-pink-600 hover:bg-pink-50 font-medium py-3 px-6 rounded-lg text-center transition-all"
              >
                マイページ
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              スタッフの方はこちら
            </h2>
            <Link
              href="/admin/login"
              className="block bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg"
            >
              管理画面にログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

