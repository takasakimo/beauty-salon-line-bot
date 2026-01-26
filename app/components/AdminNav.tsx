'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl } from '@/lib/admin-utils';
import { Bars3Icon, XMarkIcon, BuildingStorefrontIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface AdminNavProps {
  currentPath: string;
  title?: string;
  tenantName?: string;
}

interface Tenant {
  tenantId: number;
  tenantCode: string;
  salonName: string;
  isActive: boolean;
}

export default function AdminNav({ currentPath, title, tenantName }: AdminNavProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(null);

  // デモモードかどうかを判定（currentPathが/demo/admin/*で始まる場合）
  const isDemoMode = currentPath.startsWith('/demo/admin');

  // セッション情報と店舗一覧を取得
  useEffect(() => {
    if (isDemoMode) return;

    const loadSessionAndTenants = async () => {
      try {
        // セッション情報を取得
        const sessionResponse = await fetch('/api/admin/session', {
          credentials: 'include',
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setIsSuperAdmin(sessionData.isSuperAdmin || false);

          // スーパー管理者の場合、店舗一覧を取得
          if (sessionData.isSuperAdmin) {
            const tenantsResponse = await fetch('/api/super-admin/tenants', {
              credentials: 'include',
            });

            if (tenantsResponse.ok) {
              const tenantsData = await tenantsResponse.json();
              setTenants(tenantsData.tenants || []);
            }
          }
        }

        // 現在のtenantIdを取得（URLパラメータから）
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const tenantIdParam = urlParams.get('tenantId');
          if (tenantIdParam) {
            setCurrentTenantId(parseInt(tenantIdParam));
          }
        }
      } catch (error) {
        console.error('セッション情報取得エラー:', error);
      }
    };

    loadSessionAndTenants();
  }, [isDemoMode]);

  const handleLogout = async () => {
    try {
      if (isDemoMode) {
        // デモモードの場合はログアウトせず、デモトップに戻る
        router.push('/demo');
        return;
      }
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      if (isDemoMode) {
        router.push('/demo');
      }
    }
  };

  const baseNavigation = [
    { name: 'ダッシュボード', href: '/admin/dashboard' },
    { name: 'スケジュール管理', href: '/admin/reservations' },
    { name: '顧客管理', href: '/admin/customers' },
    { name: 'メニュー管理', href: '/admin/menus' },
    { name: '商品管理', href: '/admin/products' },
    { name: '売上管理', href: '/admin/sales' },
    { name: '従業員管理', href: '/admin/staff' },
    { name: 'シフト管理', href: '/admin/shifts' },
    { name: '設定', href: '/admin/settings' },
  ];

  // デモモードで存在するページのみ
  const demoAvailablePages = ['/admin/dashboard', '/admin/reservations', '/admin/shifts', '/admin/products'];

  // デモモードの場合はパスを/demo/admin/*に変換し、存在するページのみを表示
  const navigation = baseNavigation
    .filter(item => !isDemoMode || demoAvailablePages.includes(item.href))
    .map(item => ({
      ...item,
      href: isDemoMode ? item.href.replace('/admin/', '/demo/admin/') : item.href
    }));

  const isActive = (href: string) => {
    return currentPath === href;
  };

  const handleTenantChange = (tenantId: number) => {
    setCurrentTenantId(tenantId);
    setShowTenantSelector(false);
    
    // 現在のパスにtenantIdを追加して遷移
    const url = new URL(window.location.href);
    url.searchParams.set('tenantId', tenantId.toString());
    router.push(url.pathname + url.search);
  };

  const currentTenant = tenants.find(t => t.tenantId === currentTenantId);

  return (
    <>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左側: タイトルとナビゲーション */}
            <div className="flex items-center flex-1 min-w-0">
              {/* タイトル */}
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
                  {title || tenantName || '管理画面'}
                </h1>
              </div>
              {/* デスクトップナビゲーション */}
              <div className="hidden sm:flex sm:items-center sm:ml-8 sm:space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={getAdminLinkUrl(item.href)}
                    className={`${
                      isActive(item.href)
                        ? 'border-pink-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-3 py-1 border-b-2 text-sm font-medium transition-colors`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            {/* 右側: 店舗切り替えボタンとログアウトボタン */}
            <div className="flex items-center flex-shrink-0 gap-2">
              {/* スーパー管理者の場合のみ店舗切り替えボタンを表示 */}
              {isSuperAdmin && !isDemoMode && tenants.length > 0 && (
                <div className="hidden sm:block relative">
                  <button
                    onClick={() => setShowTenantSelector(!showTenantSelector)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <BuildingStorefrontIcon className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">
                      {currentTenant ? currentTenant.salonName : '店舗を選択'}
                    </span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  
                  {/* 店舗選択ドロップダウン */}
                  {showTenantSelector && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTenantSelector(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border border-gray-200 max-h-96 overflow-y-auto">
                        <div className="py-1">
                          {tenants.map((tenant) => (
                            <button
                              key={tenant.tenantId}
                              onClick={() => handleTenantChange(tenant.tenantId)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                currentTenantId === tenant.tenantId
                                  ? 'bg-pink-50 text-pink-700 font-medium'
                                  : 'text-gray-700'
                              } ${!tenant.isActive ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">{tenant.salonName}</span>
                                {!tenant.isActive && (
                                  <span className="text-xs text-gray-400 ml-2">無効</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{tenant.tenantCode}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* デスクトップログアウトボタン */}
              <button
                onClick={handleLogout}
                className="hidden sm:block text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors"
              >
                {isDemoMode ? 'デモトップに戻る' : 'ログアウト'}
              </button>
              {/* モバイルメニューボタン */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden text-gray-500 hover:text-gray-700 p-2 transition-colors"
                aria-label="メニューを開く"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* モバイルサイドバーメニュー */}
      {mobileMenuOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* サイドバー */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg sm:hidden">
            <div className="flex flex-col h-full">
              {/* ヘッダー */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {tenantName || '管理画面'}
                </h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="メニューを閉じる"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {/* ナビゲーション */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={getAdminLinkUrl(item.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${
                      isActive(item.href)
                        ? 'bg-pink-50 text-pink-700 border-pink-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } block px-3 py-2 rounded-md text-base font-medium border-l-4`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              {/* フッター（店舗切り替えとログアウトボタン） */}
              <div className="px-4 py-4 border-t border-gray-200 space-y-2">
                {/* スーパー管理者の場合のみ店舗切り替えボタンを表示 */}
                {isSuperAdmin && !isDemoMode && tenants.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1 px-2">店舗切り替え</div>
                    <select
                      value={currentTenantId || ''}
                      onChange={(e) => {
                        const tenantId = parseInt(e.target.value);
                        if (tenantId) {
                          handleTenantChange(tenantId);
                          setMobileMenuOpen(false);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700"
                    >
                      <option value="">店舗を選択</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.tenantId} value={tenant.tenantId}>
                          {tenant.salonName} {!tenant.isActive ? '(無効)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  {isDemoMode ? 'デモトップに戻る' : 'ログアウト'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}



