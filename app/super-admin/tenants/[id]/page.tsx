'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  BuildingStorefrontIcon,
  ArrowLeftIcon,
  PencilIcon,
  UsersIcon,
  CalendarDaysIcon,
  CurrencyYenIcon,
  ListBulletIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface TenantDetail {
  tenantId: number;
  tenantCode: string;
  salonName: string;
  isActive: boolean;
  maxConcurrentReservations: number;
  businessHours: any;
  closedDays: number[];
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  admins: number;
  customers: number;
  reservations: number;
  monthlyReservations: number;
  monthlySales: number;
  menus: number;
  staff: number;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    tenantCode: '',
    salonName: '',
    isActive: true,
    maxConcurrentReservations: 3
  });

  useEffect(() => {
    if (tenantId) {
      loadTenantDetail();
    }
  }, [tenantId]);

  const loadTenantDetail = async () => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/detail`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/super-admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('店舗詳細の取得に失敗しました');
      }

      const data = await response.json();
      setTenant(data.tenant);
      setStatistics(data.statistics);
      
      // フォームデータを初期化
      setFormData({
        tenantCode: data.tenant.tenantCode,
        salonName: data.tenant.salonName,
        isActive: data.tenant.isActive,
        maxConcurrentReservations: data.tenant.maxConcurrentReservations
      });
    } catch (err: any) {
      console.error('店舗詳細取得エラー:', err);
      setError(err.message || '店舗詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (tenant) {
      setFormData({
        tenantCode: tenant.tenantCode,
        salonName: tenant.salonName,
        isActive: tenant.isActive,
        maxConcurrentReservations: tenant.maxConcurrentReservations
      });
      setShowEditModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      setShowEditModal(false);
      await loadTenantDetail();
    } catch (err: any) {
      setError(err.message || '更新に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!tenant || !statistics) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">店舗情報の取得に失敗しました</p>
          <Link href="/super-admin/dashboard" className="text-indigo-600 hover:text-indigo-900">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/super-admin/dashboard"
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tenant.salonName}</h1>
                <p className="text-sm text-gray-500">店舗コード: {tenant.tenantCode}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/admin/dashboard?tenantId=${tenantId}`}
                onClick={(e) => {
                  console.log('店舗管理画面を開くボタンクリック:', {
                    tenantId,
                    href: `/admin/dashboard?tenantId=${tenantId}`
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                店舗管理画面を開く
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </a>
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PencilIcon className="h-5 w-5 mr-2" />
                編集
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* 統計情報 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">管理者数</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.admins}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">顧客数</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.customers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">予約数（全体）</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.reservations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyYenIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">今月の売上</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ¥{statistics.monthlySales.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">店舗情報</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">店舗コード</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.tenantCode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">店舗名</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.salonName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      無効
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">最大同時予約数</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.maxConcurrentReservations}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">メニュー数</dt>
                <dd className="mt-1 text-sm text-gray-900">{statistics.menus}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">スタッフ数</dt>
                <dd className="mt-1 text-sm text-gray-900">{statistics.staff}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">今月の予約数</dt>
                <dd className="mt-1 text-sm text-gray-900">{statistics.monthlyReservations}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(tenant.createdAt).toLocaleString('ja-JP')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">店舗を編集</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    店舗コード
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.tenantCode}
                    onChange={(e) => setFormData({ ...formData, tenantCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    店舗名
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.salonName}
                    onChange={(e) => setFormData({ ...formData, salonName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最大同時予約数
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.maxConcurrentReservations}
                    onChange={(e) => setFormData({ ...formData, maxConcurrentReservations: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    有効
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

