'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 入力値のトリム処理
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedTenantCode = tenantCode.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('ユーザー名とパスワードを入力してください');
      setLoading(false);
      return;
    }

    // 店舗コードが空の場合はスーパー管理者としてログインを試みる
    // 店舗コードが入力されている場合は店舗管理者としてログインを試みる

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
          tenantCode: trimmedTenantCode,
        }),
      });

      // レスポンスのステータスコードを確認
      if (!response.ok) {
        console.error('HTTPエラー:', response.status, response.statusText);
      }

      const result = await response.json();
      console.log('ログイン結果:', result);

      if (result.success) {
        // スーパー管理者の場合はスーパー管理者ダッシュボードへ、それ以外は店舗管理者ダッシュボードへ
        if (result.isSuperAdmin) {
          router.push('/super-admin/dashboard');
        } else {
          router.push('/admin/dashboard');
        }
      } else {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログイン処理中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            管理画面ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            スタッフ専用ログイン
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="tenantCode" className="block text-sm font-medium text-gray-700">
                店舗コード <span className="text-gray-400 font-normal">(スーパー管理者の場合は空欄)</span>
              </label>
              <input
                id="tenantCode"
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="例: beauty-salon-001"
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                店舗管理者の場合は店舗コードを入力してください。スーパー管理者の場合は空欄のままログインしてください。
              </p>
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
        <div className="text-center">
          <a href="/" className="text-sm text-pink-600 hover:text-pink-700">
            ← ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}

