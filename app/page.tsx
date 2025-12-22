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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 tracking-tight">
              らくポチビューティー
            </h1>
            <p className="text-gray-500 text-base">
              美容院予約管理システム
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
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
                href={`/login?tenant=${tenantCode}&redirect=/reservation`}
                className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                予約する
              </Link>
              <Link
                href={`/login?tenant=${tenantCode}&redirect=/mypage`}
                className="bg-white border-2 border-pink-600 text-pink-600 hover:bg-pink-50 font-medium py-3 px-6 rounded-lg text-center transition-all"
              >
                マイページ
              </Link>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                初めてご利用の方は{' '}
                <Link href={`/register?tenant=${tenantCode}`} className="text-pink-600 hover:text-pink-700 font-medium">
                  新規登録
                </Link>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
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

