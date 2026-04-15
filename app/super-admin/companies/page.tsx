'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BuildingOfficeIcon, PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface Company {
  companyId: number;
  companyCode: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState<number | null>(null);
  const [formCompany, setFormCompany] = useState({ companyCode: '', companyName: '' });
  const [formAdmin, setFormAdmin] = useState({ username: '', password: '', email: '', fullName: '' });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/super-admin/companies', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('企業一覧の取得に失敗しました');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/super-admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyCode: formCompany.companyCode.trim(),
          companyName: formCompany.companyName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '作成に失敗しました');
      setFormCompany({ companyCode: '', companyName: '' });
      setShowAddCompany(false);
      loadCompanies();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    }
  };

  const handleCreateCompanyAdmin = async (e: React.FormEvent, companyId: number) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/company-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formAdmin.username.trim(),
          password: formAdmin.password,
          email: formAdmin.email.trim() || undefined,
          fullName: formAdmin.fullName.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '作成に失敗しました');
      setFormAdmin({ username: '', password: '', email: '', fullName: '' });
      setShowAddAdmin(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">企業管理</h1>
          <div className="flex gap-2">
            <Link
              href="/super-admin/dashboard"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              店舗一覧に戻る
            </Link>
            <button
              type="button"
              onClick={() => { setShowAddCompany(true); setError(''); }}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              企業を追加
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {showAddCompany && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">新規企業</h2>
            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">企業コード *</label>
                <input
                  type="text"
                  value={formCompany.companyCode}
                  onChange={(e) => setFormCompany((s) => ({ ...s, companyCode: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">企業名 *</label>
                <input
                  type="text"
                  value={formCompany.companyName}
                  onChange={(e) => setFormCompany((s) => ({ ...s, companyName: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700">
                  作成
                </button>
                <button type="button" onClick={() => setShowAddCompany(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {companies.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-500">企業がありません。企業を追加してください。</li>
            ) : (
              companies.map((c) => (
                <li key={c.companyId} className="px-4 py-3 flex items-center justify-between">
                  <Link
                    href={`/super-admin/companies/${c.companyId}`}
                    className="flex items-center flex-1 hover:opacity-80"
                  >
                    <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{c.companyName}</p>
                      <p className="text-sm text-gray-500">{c.companyCode}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setShowAddAdmin(c.companyId); setFormAdmin({ username: '', password: '', email: '', fullName: '' }); setError(''); }}
                    className="inline-flex items-center px-2 py-1 text-sm font-medium text-pink-600 hover:text-pink-700"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    企業管理者を追加
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {showAddAdmin !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">企業管理者を追加</h2>
              <form onSubmit={(e) => handleCreateCompanyAdmin(e, showAddAdmin)} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ユーザー名 *</label>
                  <input
                    type="text"
                    value={formAdmin.username}
                    onChange={(e) => setFormAdmin((s) => ({ ...s, username: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">パスワード *</label>
                  <input
                    type="password"
                    value={formAdmin.password}
                    onChange={(e) => setFormAdmin((s) => ({ ...s, password: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">メール</label>
                  <input
                    type="email"
                    value={formAdmin.email}
                    onChange={(e) => setFormAdmin((s) => ({ ...s, email: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">表示名</label>
                  <input
                    type="text"
                    value={formAdmin.fullName}
                    onChange={(e) => setFormAdmin((s) => ({ ...s, fullName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700">
                    作成
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAdmin(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
