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
      <AdminNav 
        currentPath="/demo/admin/dashboard" 
        tenantName={mockStats.tenantName}
      />
      
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Link
              href="/demo/admin/customers"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        総顧客数
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {mockStats.totalCustomers}人
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/demo/admin/reservations"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今日の予約
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {mockStats.todayReservations}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/demo/admin/sales"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <CurrencyYenIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今日の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{mockStats.todaySales.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/demo/admin/sales"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今月の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{mockStats.monthlySales.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Link
              href="/demo/admin/customers"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  今月の新規顧客
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {mockStats.newCustomersMonth}人
                </p>
              </div>
            </Link>

            <Link
              href="/demo/admin/reservations"
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  平均客単価
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{mockStats.averageSpending.toLocaleString()}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

