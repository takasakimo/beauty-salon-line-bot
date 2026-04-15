'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** スーパー管理者専用ログインは廃止。トップのログインに集約 */
export default function SuperAdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">ログインページへ移動しています...</p>
    </div>
  );
}
