'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl, getApiUrlWithTenantId } from '@/lib/admin-utils';
import AdminNav from '@/app/components/AdminNav';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  CurrencyYenIcon, 
  ChartBarIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface NewReservation {
  reservation_id: number;
  reservation_date: string;
  status: string;
  created_date: string;
  customer_name: string;
  customer_phone: string | null;
  menu_name: string;
  staff_name: string | null;
}

interface Statistics {
  totalCustomers: number;
  newCustomersMonth: number;
  averageSpending: number;
  monthlySales: number;
  todayReservations: number;
  todaySales: number;
  tenantName: string;
  newReservationsCount?: number;
  newReservations?: NewReservation[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReservations, setSelectedReservations] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);

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
      // クエリパラメータからtenantIdまたはtenantCodeを取得
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      const tenantCode = urlParams.get('tenant');
      
      let url = '/api/admin/statistics';
      if (tenantId) {
        url += `?tenantId=${tenantId}`;
      } else if (tenantCode) {
        url += `?tenant=${tenantCode}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setLoading(false);
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      // 選択状態をリセット（表示されなくなった予約を除外）
      if (data.newReservations) {
        const currentIds = new Set(data.newReservations.map((r: NewReservation) => r.reservation_id));
        setSelectedReservations(prev => {
          const newSet = new Set<number>();
          prev.forEach(id => {
            if (currentIds.has(id)) {
              newSet.add(id);
            }
          });
          return newSet;
        });
      } else {
        setSelectedReservations(new Set());
      }
    } catch (error) {
      console.error('統計データ取得エラー:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (!stats?.newReservations) return;
    if (selectedReservations.size === stats.newReservations.length) {
      // すべて選択されている場合は選択解除
      setSelectedReservations(new Set());
    } else {
      // すべて選択
      setSelectedReservations(new Set(stats.newReservations.map(r => r.reservation_id)));
    }
  };

  const handleSelectReservation = (reservationId: number) => {
    setSelectedReservations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  };

  const handleBulkMarkAsViewed = async (reservationIds?: number[]) => {
    if (processing) return;
    
    setProcessing(true);
    try {
      const apiUrl = getApiUrlWithTenantId('/api/admin/reservations/bulk-view');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reservationIds }),
      });

      if (!response.ok) {
        throw new Error('既読更新に失敗しました');
      }

      const result = await response.json();
      console.log('既読更新成功:', result);
      
      // 統計データを再読み込み
      await loadStatistics();
    } catch (error) {
      console.error('既読更新エラー:', error);
      alert('既読更新に失敗しました');
    } finally {
      setProcessing(false);
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
      <AdminNav 
        currentPath="/admin/dashboard" 
        tenantName={stats.tenantName}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

          {/* 新着予約通知 */}
          {stats.newReservationsCount && stats.newReservationsCount > 0 && (
            <div className="mb-6 bg-pink-50 border-l-4 border-pink-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <BellIcon className="h-6 w-6 text-pink-600 mr-3" />
                  <h3 className="text-lg font-semibold text-pink-900">
                    新着予約が{stats.newReservationsCount}件あります
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {stats.newReservations && stats.newReservations.length > 0 && (
                    <>
                      <button
                        onClick={() => handleBulkMarkAsViewed(Array.from(selectedReservations))}
                        disabled={processing || selectedReservations.size === 0}
                        className="px-3 py-1.5 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {processing ? '処理中...' : `選択を既読にする (${selectedReservations.size})`}
                      </button>
                      <button
                        onClick={() => handleBulkMarkAsViewed()}
                        disabled={processing}
                        className="px-3 py-1.5 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {processing ? '処理中...' : 'すべて既読にする'}
                      </button>
                    </>
                  )}
                  <Link
                    href={getAdminLinkUrl('/admin/reservations')}
                    className="px-4 py-1.5 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    すべての予約を見る
                  </Link>
                </div>
              </div>
              {stats.newReservations && stats.newReservations.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedReservations.size === stats.newReservations.length && stats.newReservations.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      すべて選択
                    </label>
                  </div>
                  {stats.newReservations.map((reservation) => {
                    // reservation_dateをJSTとして解釈
                    let dateStr = reservation.reservation_date;
                    // タイムゾーン情報がない場合は+09:00を付与
                    if (typeof dateStr === 'string' && !dateStr.includes('+') && !dateStr.includes('Z')) {
                      dateStr = dateStr.replace(' ', 'T') + '+09:00';
                    }
                    const reservationDate = new Date(dateStr);
                    const formattedDate = reservationDate.toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Tokyo'
                    });
                    
                    return (
                      <div
                        key={reservation.reservation_id}
                        className="flex items-start gap-3 bg-white p-3 rounded border border-pink-200 hover:border-pink-400 hover:shadow-md transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedReservations.has(reservation.reservation_id)}
                          onChange={() => handleSelectReservation(reservation.reservation_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded flex-shrink-0"
                        />
                        <Link
                          href={`${getAdminLinkUrl('/admin/reservations')}?date=${reservationDate.toISOString().split('T')[0]}&highlight=${reservation.reservation_id}`}
                          className="flex-1"
                          onClick={async () => {
                            // 予約を既読にする
                            try {
                              const apiUrl = getApiUrlWithTenantId(`/api/admin/reservations/${reservation.reservation_id}/view`);
                              await fetch(apiUrl, {
                                method: 'POST',
                                credentials: 'include',
                              });
                            } catch (error) {
                              console.error('既読更新エラー:', error);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {reservation.customer_name}
                                </span>
                                {reservation.customer_phone && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({reservation.customer_phone})
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-600">
                                {formattedDate} - {reservation.menu_name}
                              </div>
                              {reservation.staff_name && (
                                <div className="mt-1 text-xs text-gray-500">
                                  スタッフ: {reservation.staff_name}
                                </div>
                              )}
                            </div>
                            <CalendarDaysIcon className="h-5 w-5 text-pink-600 ml-4 flex-shrink-0" />
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

