'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  CurrencyYenIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface Statistics {
  totalCustomers: number;
  newCustomersMonth: number;
  regularCustomers: number;
  averageSpending: number;
  monthlySales: number;
  todayReservations: number;
  todaySales: number;
  tenantName: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ページロード時にURLを確認
    if (typeof window !== 'undefined') {
      console.log('AdminDashboard ページロード:', {
        href: window.location.href,
        search: window.location.search,
        pathname: window.location.pathname
      });
    }
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // クエリパラメータからtenantIdを取得（スーパー管理者の場合）
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      const url = tenantId ? `/api/admin/statistics?tenantId=${tenantId}` : '/api/admin/statistics';
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('統計データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>データの取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {stats.tenantName}
                </h1>
                <span className="ml-2 text-sm text-gray-500">管理画面</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href={getAdminLinkUrl('/admin/dashboard')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  ダッシュボード
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/reservations')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  予約管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/customers')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  顧客管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/menus')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/products')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  商品管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/sales')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  売上管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/staff')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  従業員管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/shifts')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  シフト管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/settings')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  設定
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Link
              href={getAdminLinkUrl('/admin/customers')}
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
                        {stats.totalCustomers}人
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={`${getAdminLinkUrl('/admin/reservations')}?date=${new Date().toISOString().split('T')[0]}`}
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
                        {stats.todayReservations}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={getAdminLinkUrl('/admin/sales')}
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
                        ¥{stats.todaySales.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={getAdminLinkUrl('/admin/sales')}
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
                        ¥{stats.monthlySales.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={getAdminLinkUrl('/admin/customers')}
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  今月の新規顧客
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.newCustomersMonth}人
                </p>
              </div>
            </Link>

            <Link
              href={getAdminLinkUrl('/admin/customers')}
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  常連顧客
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.regularCustomers}人
                </p>
              </div>
            </Link>

            <Link
              href={getAdminLinkUrl('/admin/reservations')}
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  平均客単価
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{stats.averageSpending.toLocaleString()}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

