'use client';

import Link from 'next/link';
import { SparklesIcon, UserIcon, BuildingStorefrontIcon } from '@heroicons/react/24/solid';

export default function DemoPage() {
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
            <p className="text-gray-500 text-base mb-2">
              デモ画面
            </p>
            <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              ログイン不要でご覧いただけます
            </div>
          </div>

          {/* 顧客側デモ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">顧客側デモ</h2>
                <p className="text-sm text-gray-600">お客様向けの画面をご覧いただけます</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/demo/customer/reservation"
                className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                予約ページ
              </Link>
              <Link
                href="/demo/customer/mypage"
                className="bg-white border-2 border-pink-600 text-pink-600 hover:bg-pink-50 font-medium py-4 px-6 rounded-lg text-center transition-all"
              >
                マイページ
              </Link>
            </div>
          </div>

          {/* 店舗側デモ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <BuildingStorefrontIcon className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">店舗側デモ</h2>
                <p className="text-sm text-gray-600">管理画面をご覧いただけます</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/demo/admin/dashboard"
                className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                ダッシュボード
              </Link>
              <Link
                href="/demo/admin/reservations"
                className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                予約管理
              </Link>
              <Link
                href="/demo/admin/shifts"
                className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                シフト管理
              </Link>
              <Link
                href="/demo/admin/products"
                className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-lg text-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                商品管理
              </Link>
            </div>
          </div>

          {/* 本番環境へのリンク */}
          <div className="mt-8 text-center space-y-2">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              本番環境に戻る
            </Link>
            <div className="text-xs text-gray-400">
              GitHub: <a href="https://github.com/takasakimo/beauty-salon-line-bot" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">https://github.com/takasakimo/beauty-salon-line-bot</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

