'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BuildingStorefrontIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Tenant {
  tenantId: number;
  tenantCode: string;
  salonName: string;
  isActive: boolean;
  maxConcurrentReservations: number;
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    tenantCode: '',
    salonName: '',
    isActive: true,
    maxConcurrentReservations: 3,
    adminUsername: '',
    adminPassword: '',
    adminFullName: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants', {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/super-admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('店舗一覧の取得に失敗しました');
      }

      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (err: any) {
      console.error('店舗一覧取得エラー:', err);
      setError(err.message || '店舗一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      tenantCode: '',
      salonName: '',
      isActive: true,
      maxConcurrentReservations: 3,
      adminUsername: '',
      adminPassword: '',
      adminFullName: ''
    });
    setEditingTenant(null);
    setShowAddModal(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setFormData({
      tenantCode: tenant.tenantCode,
      salonName: tenant.salonName,
      isActive: tenant.isActive,
      maxConcurrentReservations: tenant.maxConcurrentReservations,
      adminUsername: '',
      adminPassword: '',
      adminFullName: ''
    });
    setEditingTenant(tenant);
    setShowAddModal(true);
  };

  const handleDelete = async (tenantId: number) => {
    if (!confirm('本当にこの店舗を削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await loadTenants();
    } catch (err: any) {
      alert(err.message || '削除に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingTenant
        ? `/api/super-admin/tenants/${editingTenant.tenantId}`
        : '/api/super-admin/tenants';
      
      const method = editingTenant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      setShowAddModal(false);
      await loadTenants();
    } catch (err: any) {
      setError(err.message || '保存に失敗しました');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/super-admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/super-admin/login');
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">店舗管理</h1>
            <div className="flex gap-4">
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                店舗を追加
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ログアウト
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

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tenants.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                店舗が登録されていません
              </li>
            ) : (
              tenants.map((tenant) => (
                <li key={tenant.tenantId} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Link 
                      href={`/super-admin/tenants/${tenant.tenantId}`}
                      className="flex items-center flex-1 cursor-pointer"
                    >
                      <BuildingStorefrontIcon className="h-8 w-8 text-gray-400 mr-4" />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            {tenant.salonName}
                          </h3>
                          {tenant.isActive ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          店舗コード: {tenant.tenantCode}
                        </p>
                        <p className="text-sm text-gray-500">
                          最大同時予約数: {tenant.maxConcurrentReservations}
                        </p>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 ml-4" />
                    </Link>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(tenant);
                        }}
                        className="p-2 text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tenant.tenantId);
                        }}
                        className="p-2 text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* 追加/編集モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingTenant ? '店舗を編集' : '店舗を追加'}
            </h3>
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
                
                {/* 新規作成時のみ管理者アカウント情報を入力 */}
                {!editingTenant && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">管理者アカウント情報</h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        管理者ユーザー名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.adminUsername}
                        onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        管理者パスワード <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        placeholder="6文字以上"
                      />
                      <p className="mt-1 text-xs text-gray-500">6文字以上で入力してください</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        管理者氏名
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.adminFullName}
                        onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                        placeholder="管理者名（任意）"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingTenant ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

