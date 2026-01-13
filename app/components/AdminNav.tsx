'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl } from '@/lib/admin-utils';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface AdminNavProps {
  currentPath: string;
  title?: string;
  tenantName?: string;
}

export default function AdminNav({ currentPath, title, tenantName }: AdminNavProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // デモモードかどうかを判定（currentPathが/demo/admin/*で始まる場合）
  const isDemoMode = currentPath.startsWith('/demo/admin');

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
  const demoAvailablePages = ['/admin/dashboard', '/admin/reservations'];

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

  return (
    <>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {title || tenantName || '管理画面'}
                </h1>
                {tenantName && title && (
                  <span className="ml-2 text-sm text-gray-500">管理画面</span>
                )}
              </div>
              {/* デスクトップナビゲーション */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={getAdminLinkUrl(item.href)}
                    className={`${
                      isActive(item.href)
                        ? 'border-pink-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* デスクトップログアウトボタン */}
              <button
                onClick={handleLogout}
                className="hidden sm:block text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                {isDemoMode ? 'デモトップに戻る' : 'ログアウト'}
              </button>
              {/* モバイルメニューボタン */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden text-gray-500 hover:text-gray-700 p-2"
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
              {/* フッター（ログアウトボタン） */}
              <div className="px-4 py-4 border-t border-gray-200">
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



