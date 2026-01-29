'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

interface Tenant {
  tenant_id: number;
  tenant_code: string;
  salon_name: string;
  customer_id?: number;
  admin_id?: number;
  real_name: string;
  email: string;
  phone_number?: string;
  has_customer: boolean; // メールアドレスがcustomersテーブルに存在
  has_admin: boolean;    // メールアドレスがtenant_adminsテーブルに存在
  needs_password?: boolean; // パスワードが設定されていない場合はtrue
}

function CustomerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTenantCode = searchParams.get('tenant') || 'beauty-salon-001';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showTenantSelection, setShowTenantSelection] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // ページ読み込み時にメールアドレスフィールドにフォーカス
    emailInputRef.current?.focus();
  }, []);

  const handleCheckTenants = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowTenantSelection(false);

    // バリデーション
    if (!email || !password) {
      setError('メールアドレスまたはユーザー名とパスワードを入力してください');
      setLoading(false);
      return;
    }

    try {
      // まず店舗一覧を取得
      console.log('店舗一覧取得開始:', { email: email.trim() });
      const tenantsResponse = await fetch('/api/customers/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const tenantsResult = await tenantsResponse.json();
      console.log('店舗一覧取得レスポンス:', tenantsResult);

      if (!tenantsResult.success) {
        console.error('店舗一覧取得失敗:', tenantsResult.error);
        setError(tenantsResult.error || 'ログインに失敗しました');
        setPassword('');
        setLoading(false);
        return;
      }

      const tenantList: Tenant[] = tenantsResult.tenants || [];
      console.log('店舗リスト:', { count: tenantList.length, tenants: tenantList });

      if (tenantList.length === 0) {
        console.error('店舗が見つかりません');
        setError('登録されている店舗が見つかりません');
        setPassword('');
        setLoading(false);
        return;
      }

      // 店舗が1つの場合は直接ログイン
      if (tenantList.length === 1) {
        console.log('店舗が1つのため直接ログイン:', tenantList[0].tenant_code, 'isAdmin:', tenantList[0].has_admin);
        await performLogin(tenantList[0].tenant_code, tenantList[0].needs_password, tenantList[0].has_admin);
      } else {
        // 複数の店舗がある場合は選択画面を表示
        console.log('複数店舗のため選択画面を表示:', tenantList.length);
        setTenants(tenantList);
        setShowTenantSelection(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('店舗一覧取得エラー:', error);
      setError('ログイン処理中にエラーが発生しました。しばらくしてから再度お試しください。');
      setPassword('');
      setLoading(false);
    }
  };

  const performLogin = async (selectedTenantCode: string, needsPassword?: boolean, hasAdmin?: boolean) => {
    setLoading(true);
    setError('');

    // パスワードが設定されていない店舗を選択した場合
    // ただし、パスワードが入力されている場合は、ログインを試みる（パスワード設定処理が行われる可能性がある）
    if (needsPassword && !password) {
      setError('この店舗ではパスワードが設定されていません。パスワードを設定してください。');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/customers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
          tenantCode: selectedTenantCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // 少し待ってからリダイレクト（UX向上）
        setTimeout(() => {
          const redirect = searchParams.get('redirect');
          if (redirect) {
            router.push(`${redirect}?tenant=${selectedTenantCode}`);
          } else {
            // 管理者の場合は管理画面に、顧客の場合はマイページにリダイレクト
            // result.isAdminまたはhasAdminフラグで判定
            const isAdmin = result.isAdmin || hasAdmin;
            console.log('ログイン成功、リダイレクト判定:', { isAdmin, resultIsAdmin: result.isAdmin, hasAdmin });
            if (isAdmin) {
              router.push(`/admin/dashboard?tenant=${selectedTenantCode}`);
            } else {
              router.push(`/mypage?tenant=${selectedTenantCode}`);
            }
          }
        }, 500);
      } else {
        setError(result.error || 'ログインに失敗しました');
        setPassword('');
        setShowTenantSelection(false);
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログイン処理中にエラーが発生しました。しばらくしてから再度お試しください。');
      setPassword('');
      setShowTenantSelection(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant: Tenant) => {
    performLogin(tenant.tenant_code, tenant.needs_password, tenant.has_admin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-center text-2xl font-semibold text-gray-900">
            {showTenantSelection ? '店舗を選択' : 'ログイン'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showTenantSelection 
              ? 'ログインする店舗を選択してください'
              : 'メールアドレスまたはユーザー名とパスワードでログイン'
            }
          </p>
        </div>

        {showTenantSelection ? (
          // 店舗選択画面
          <div className="mt-8 space-y-4">
            {tenants.map((tenant) => (
              <button
                key={tenant.tenant_id}
                onClick={() => handleTenantSelect(tenant)}
                disabled={loading}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0">
                  <BuildingStorefrontIcon className="h-8 w-8 text-pink-600" />
                </div>
                <div className="ml-4 flex-1 text-left">
                  <p className="text-lg font-semibold text-gray-900">
                    {tenant.salon_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {tenant.has_customer && tenant.has_admin 
                      ? '（顧客・管理者として登録済み）'
                      : tenant.has_admin 
                        ? '（管理者として登録済み）'
                        : '（顧客として登録済み）'
                    }
                    {tenant.needs_password && (
                      <span className="text-orange-600 font-medium ml-1">※パスワード設定が必要</span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
            <button
              onClick={() => {
                setShowTenantSelection(false);
                setTenants([]);
              }}
              className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              戻る
            </button>
          </div>
        ) : (
          // ログインフォーム
          <form className="mt-8 space-y-6" onSubmit={handleCheckTenants}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>ログイン成功！リダイレクト中...</span>
            </div>
          )}
          {searchParams.get('registered') === 'true' && !error && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>登録が完了しました。ログインしてください。</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレスまたはユーザー名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="example@email.com または username"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ログイン中...
                </>
              ) : success ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ログイン成功
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </div>
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない方は{' '}
                <Link 
                  href={`/register?tenant=${defaultTenantCode}`} 
                  className="text-pink-600 hover:text-pink-700 font-medium underline-offset-2 hover:underline"
                >
                  新規登録
                </Link>
              </p>
              <div className="pt-3 border-t border-gray-200">
                <Link 
                  href={`/?tenant=${defaultTenantCode}`} 
                  className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  ホームに戻る
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CustomerLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <CustomerLoginContent />
    </Suspense>
  );
}

