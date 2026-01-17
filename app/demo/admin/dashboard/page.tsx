'use client';

import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  CurrencyYenIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';

// モックデータ
const mockStats = {
  totalCustomers: 150,
  newCustomersMonth: 12,
  averageSpending: 8500,
  monthlySales: 1250000,
  todayReservations: 8,
  todaySales: 68000,
  tenantName: 'らくっぽリザーブ デモ店'
};

export default function DemoAdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/demo/admin/dashboard" title="ダッシュボード（デモ）" />
      
      {/* デモバナー */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 mt-4 rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-800 font-semibold">デモモード</p>
            <p className="text-yellow-700 text-sm">この画面はデモ用です。実際のデータは表示されません。</p>
          </div>
          <Link
            href="/demo"
            className="text-yellow-800 hover:text-yellow-900 underline text-sm"
          >
            デモトップに戻る
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード（デモ）</h2>

            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">総顧客数</p>
                    <p className="text-3xl font-bold mt-2">{mockStats.totalCustomers}</p>
                  </div>
                  <UsersIcon className="h-12 w-12 text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">今月の新規顧客</p>
                    <p className="text-3xl font-bold mt-2">{mockStats.newCustomersMonth}</p>
                  </div>
                  <UsersIcon className="h-12 w-12 text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">平均単価</p>
                    <p className="text-3xl font-bold mt-2">¥{mockStats.averageSpending.toLocaleString()}</p>
                  </div>
                  <CurrencyYenIcon className="h-12 w-12 text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm">月間売上</p>
                    <p className="text-3xl font-bold mt-2">¥{mockStats.monthlySales.toLocaleString()}</p>
                  </div>
                  <ChartBarIcon className="h-12 w-12 text-pink-200" />
                </div>
              </div>
            </div>

            {/* 今日の予約 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-pink-600" />
                今日の予約
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">予約件数</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.todayReservations}件</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">今日の売上</p>
                  <p className="text-2xl font-bold text-gray-900">¥{mockStats.todaySales.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/demo/admin/reservations"
                  className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
                >
                  予約管理
                </Link>
                <Link
                  href="/demo/admin/customers"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
                >
                  顧客管理
                </Link>
                <Link
                  href="/demo/admin/menus"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
                >
                  メニュー管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

