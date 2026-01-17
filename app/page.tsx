'use client';

import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const defaultTenantCode = 'beauty-salon-001';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 tracking-tight">
              らくっぽリザーブ
            </h1>
            <p className="text-gray-500 text-base">
              個人サロン向け予約管理システム
            </p>
          </div>

          {/* 顧客向けメインセクション */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Link
                href={`/login?tenant=${defaultTenantCode}&redirect=/reservation`}
                className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-lg"
              >
                予約する
              </Link>
              <Link
                href={`/login?tenant=${defaultTenantCode}&redirect=/mypage`}
                className="bg-white border-2 border-pink-600 text-pink-600 hover:bg-pink-50 font-medium py-4 px-6 rounded-lg text-center transition-all text-lg"
              >
                マイページ
              </Link>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                初めてご利用の方は{' '}
                <Link href={`/register?tenant=${defaultTenantCode}`} className="text-pink-600 hover:text-pink-700 font-medium underline">
                  新規登録
                </Link>
              </p>
            </div>
          </div>

          {/* スタッフ向けセクション（小さく控えめに） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">スタッフの方はこちら</p>
              <Link
                href="/admin/login"
                className="text-sm bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                管理画面にログイン
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

