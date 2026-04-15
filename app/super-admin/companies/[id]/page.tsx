'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { BuildingOfficeIcon, BuildingStorefrontIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

interface Company {
  companyId: number;
  companyCode: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
}

interface Tenant {
  tenantId: number;
  tenantCode: string;
  salonName: string;
  isActive: boolean;
  maxConcurrentReservations: number;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [formTenant, setFormTenant] = useState({
    tenantCode: '',
    salonName: '',
    maxConcurrentReservations: 3,
    adminUsername: '',
    adminPassword: '',
    adminFullName: ''
  });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadTenants();
      fetch('/api/admin/session', { credentials: 'include' })
        .then((r) => r.ok ? r.json() as Promise<{ isCompanyAdmin?: boolean }> : Promise.resolve({ isCompanyAdmin: false }))
        .then((d: { isCompanyAdmin?: boolean }) => setIsCompanyAdmin(!!d.isCompanyAdmin))
        .catch(() => {});
    }
  }, [companyId]);

  const loadCompany = async () => {
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('企業の取得に失敗しました');
      const data = await res.json();
      setCompany(data.company);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラー');
    }
  };

  const loadTenants = async () => {
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/tenants`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (res.status === 403) {
        router.push('/company-admin/dashboard');
        return;
      }
      if (!res.ok) throw new Error('店舗一覧の取得に失敗しました');
      const data = await res.json();
      setTenants(data.tenants || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantCode: formTenant.tenantCode.trim(),
          salonName: formTenant.salonName.trim(),
          maxConcurrentReservations: formTenant.maxConcurrentReservations,
          adminUsername: formTenant.adminUsername.trim(),
          adminPassword: formTenant.adminPassword,
          adminFullName: formTenant.adminFullName.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '店舗の作成に失敗しました');
      setFormTenant({
        tenantCode: '',
        salonName: '',
        maxConcurrentReservations: 3,
        adminUsername: '',
        adminPassword: '',
        adminFullName: ''
      });
      setShowAddTenant(false);
      loadTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '店舗の作成に失敗しました');
    }
  };

  if (loading && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">企業が見つかりません</p>
        <Link href="/super-admin/companies" className="ml-4 text-pink-600 hover:underline">企業一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            {isCompanyAdmin ? (
              <Link href="/company-admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                ← 店舗一覧に戻る
              </Link>
            ) : (
              <Link href="/super-admin/companies" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                ← 企業一覧に戻る
              </Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{company.companyName}</h1>
            <p className="text-sm text-gray-500">{company.companyCode}</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddTenant(true); setError(''); }}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            店舗を追加
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {showAddTenant && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">新規店舗</h2>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">店舗コード *</label>
                  <input
                    type="text"
                    value={formTenant.tenantCode}
                    onChange={(e) => setFormTenant((s) => ({ ...s, tenantCode: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">店舗名 *</label>
                  <input
                    type="text"
                    value={formTenant.salonName}
                    onChange={(e) => setFormTenant((s) => ({ ...s, salonName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">店舗管理者アカウント（最初の1人）</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600">ユーザー名 *</label>
                    <input
                      type="text"
                      value={formTenant.adminUsername}
                      onChange={(e) => setFormTenant((s) => ({ ...s, adminUsername: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">パスワード（6文字以上）*</label>
                    <input
                      type="password"
                      value={formTenant.adminPassword}
                      onChange={(e) => setFormTenant((s) => ({ ...s, adminPassword: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">表示名</label>
                    <input
                      type="text"
                      value={formTenant.adminFullName}
                      onChange={(e) => setFormTenant((s) => ({ ...s, adminFullName: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700">
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTenant(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <h2 className="px-4 py-3 text-lg font-medium text-gray-900 border-b">店舗一覧</h2>
          <ul className="divide-y divide-gray-200">
            {tenants.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-500">店舗がありません。店舗を追加してください。</li>
            ) : (
              tenants.map((t) => (
                <li key={t.tenantId} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <Link
                    href={`/admin/dashboard?tenantId=${t.tenantId}`}
                    className="flex items-center flex-1"
                  >
                    <BuildingStorefrontIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{t.salonName}</p>
                      <p className="text-sm text-gray-500">{t.tenantCode}</p>
                    </div>
                  </Link>
                  <Link
                    href={`/super-admin/tenants/${t.tenantId}`}
                    className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    店舗を編集
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
