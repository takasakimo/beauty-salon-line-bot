'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SparklesIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, BuildingStorefrontIcon } from '@heroicons/react/24/solid';

interface Tenant {
  tenant_id: number;
  tenant_code: string;
  salon_name: string;
  customer_id?: number;
  admin_id?: number;
  real_name: string;
  email: string;
  phone_number?: string;
  has_customer: boolean;
  has_admin: boolean;
  needs_password?: boolean;
}

export default function Home() {
  const router = useRouter();
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
    emailInputRef.current?.focus();
  }, []);

  const handleCheckTenants = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowTenantSelection(false);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      setLoading(false);
      return;
    }

    try {
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

      if (!tenantsResult.success) {
        setError(tenantsResult.error || 'ログインに失敗しました');
        setPassword('');
        setLoading(false);
        return;
      }

      const tenantList: Tenant[] = tenantsResult.tenants || [];

      if (tenantList.length === 0) {
        setError('登録されている店舗が見つかりません');
        setPassword('');
        setLoading(false);
        return;
      }

      if (tenantList.length === 1) {
        await performLogin(tenantList[0].tenant_code, tenantList[0].has_admin, tenantList[0].has_customer);
      } else {
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

  const performLogin = async (selectedTenantCode: string, hasAdmin: boolean, hasCustomer: boolean) => {
    setLoading(true);
    setError('');

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
        
        // 管理者かどうかを判定（APIレスポンスのisAdminフラグを使用）
        const isAdmin = result.isAdmin || (hasAdmin && (!hasCustomer || result.customer?.isAdmin));
        
        setTimeout(() => {
          if (isAdmin) {
            router.push(`/admin/dashboard?tenant=${selectedTenantCode}`);
          } else {
            router.push(`/mypage?tenant=${selectedTenantCode}`);
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
    performLogin(tenant.tenant_code, tenant.has_admin, tenant.has_customer);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 tracking-tight">
              らくっぽリザーブ
            </h1>
            <p className="text-gray-500 text-base">
              個人サロン向け予約管理システム
            </p>
          </div>

          {showTenantSelection ? (
            // 店舗選択画面
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                店舗を選択
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                ログインする店舗を選択してください
              </p>
              <div className="space-y-4">
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
            </div>
          ) : (
            // ログインフォーム
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                ログイン
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                メールアドレスとパスワードでログイン
              </p>

              <form onSubmit={handleCheckTenants} className="space-y-6">
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

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        ref={emailInputRef}
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        disabled={loading}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="example@email.com"
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

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    アカウントをお持ちでない方は{' '}
                    <Link 
                      href="/register" 
                      className="text-pink-600 hover:text-pink-700 font-medium underline-offset-2 hover:underline"
                    >
                      新規登録
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
