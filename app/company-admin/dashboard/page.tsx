'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BuildingStorefrontIcon, ArrowRightOnRectangleIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

interface Tenant {
  tenantId: number;
  tenantCode: string;
  salonName: string;
  isActive: boolean;
}

export default function CompanyAdminDashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch('/api/company-admin/tenants', { credentials: 'include' });
        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.status === 403) {
          setError('このページにアクセスする権限がありません');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError('店舗一覧の取得に失敗しました');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTenants(data.tenants ?? []);
        setCompanyId(data.companyId ?? null);
      } catch {
        setError('通信エラー');
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">企業管理者 - 店舗一覧</h1>
          <div className="flex items-center gap-3">
            {companyId != null && (
              <Link
                href={`/super-admin/companies/${companyId}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                店舗の登録・一覧
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {tenants.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            <p>この企業に紐づく店舗がありません。</p>
            {companyId != null && (
              <p className="mt-2">
                <Link href={`/super-admin/companies/${companyId}`} className="text-pink-600 hover:underline">
                  店舗の登録・一覧
                </Link>
                から店舗を追加できます。
              </p>
            )}
            {companyId == null && (
              <p className="mt-2 text-sm">プラットフォーム管理者にご連絡ください。</p>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {tenants.map((t) => (
              <li key={t.tenantId} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <Link href={`/admin/dashboard?tenantId=${t.tenantId}`} className="flex items-center flex-1">
                    <BuildingStorefrontIcon className="h-8 w-8 text-pink-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{t.salonName}</p>
                      <p className="text-sm text-gray-500">{t.tenantCode}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/super-admin/tenants/${t.tenantId}`}
                      className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      店舗を編集
                    </Link>
                    <span className="text-gray-400">|</span>
                    <Link
                      href={`/admin/dashboard?tenantId=${t.tenantId}`}
                      className="text-pink-600 text-sm font-medium hover:underline"
                    >
                      管理画面を開く →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
