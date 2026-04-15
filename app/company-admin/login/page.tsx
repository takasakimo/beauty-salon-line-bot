'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 企業管理者専用ログインは廃止。トップのログインに集約 */
export default function CompanyAdminLoginRedirect() {
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
