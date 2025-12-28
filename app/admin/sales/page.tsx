'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl, getApiUrlWithTenantId } from '@/lib/admin-utils';
import { 
  CurrencyYenIcon,
  XMarkIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface SalesDetail {
  id: number;
  date: string;
  status: string;
  price: number;
  customer_name: string | null;
  staff_name: string | null;
  menu_name?: string;
  menus?: string[];
  product_name?: string;
  quantity?: number;
  type: 'reservation' | 'product';
}

interface SalesSummary {
  todayTotal: number;
  monthTotal: number;
  todayCount: number;
  monthCount: number;
}

export default function SalesManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [todaySales, setTodaySales] = useState<SalesDetail[]>([]);
  const [monthSales, setMonthSales] = useState<SalesDetail[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'month'>('today');
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    loadSummary();
    loadTodaySales();
  }, []);

  const loadSummary = async () => {
    try {
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

      if (response.ok) {
        const data = await response.json();
        setSummary({
          todayTotal: data.todaySales || 0,
          monthTotal: data.monthlySales || 0,
          todayCount: data.todayReservations || 0,
          monthCount: 0 // 月間件数は別途計算
        });
      }
    } catch (error) {
      console.error('売上サマリー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySales = async () => {
    setLoadingSales(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      const url = tenantId 
        ? `/api/admin/sales-details?type=today&tenantId=${tenantId}`
        : `/api/admin/sales-details?type=today`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTodaySales(data);
      }
    } catch (error) {
      console.error('今日の売上取得エラー:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const loadMonthSales = async () => {
    if (monthSales.length > 0) return; // 既に読み込み済み
    
    setLoadingSales(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      const url = tenantId 
        ? `/api/admin/sales-details?type=month&tenantId=${tenantId}`
        : `/api/admin/sales-details?type=month`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMonthSales(data);
      }
    } catch (error) {
      console.error('今月の売上取得エラー:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleTabChange = (tab: 'today' | 'month') => {
    setActiveTab(tab);
    if (tab === 'month') {
      loadMonthSales();
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

  const currentSales = activeTab === 'today' ? todaySales : monthSales;
  const currentTotal = activeTab === 'today' 
    ? (summary?.todayTotal || 0)
    : (summary?.monthTotal || 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">売上管理</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href={getAdminLinkUrl('/admin/dashboard')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">売上管理</h2>

          {/* サマリーカード */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今日の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{summary?.todayTotal.toLocaleString() || '0'}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {todaySales.length}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CurrencyYenIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今月の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{summary?.monthTotal.toLocaleString() || '0'}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {monthSales.length}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => handleTabChange('today')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'today'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  今日の売上
                </button>
                <button
                  onClick={() => handleTabChange('month')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'month'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  今月の売上
                </button>
              </nav>
            </div>

            <div className="p-6">
              {loadingSales ? (
                <div className="text-center py-8">
                  <p>読み込み中...</p>
                </div>
              ) : currentSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  売上データがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          種類
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          顧客
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          内容
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          スタッフ
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentSales.map((sale, index) => (
                        <tr key={`${sale.type}-${sale.id}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(sale.date).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              sale.type === 'reservation' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {sale.type === 'reservation' ? '予約' : '商品'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.customer_name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {sale.type === 'reservation' 
                              ? (sale.menus && sale.menus.length > 0 
                                  ? sale.menus.join(', ') 
                                  : sale.menu_name || '-')
                              : `${sale.product_name || '-'} × ${sale.quantity || 1}`
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.staff_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ¥{sale.price.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          合計
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                          ¥{currentSales.reduce((sum, sale) => sum + sale.price, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

