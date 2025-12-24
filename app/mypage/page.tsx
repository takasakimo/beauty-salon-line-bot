'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Reservation {
  reservation_id: number;
  reservation_date: string;
  menu_name: string;
  staff_name: string;
  price: number;
  status: string;
}

interface Customer {
  customer_id: number;
  real_name: string;
  email: string;
  phone_number: string;
  registered_date: string;
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantCode = searchParams.get('tenant') || 'beauty-salon-001';
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/customers/me', {
        credentials: 'include'
      });

      if (response.status === 401) {
        // 未認証 - ログインページにリダイレクト
        router.push(`/login?tenant=${tenantCode}&redirect=/mypage`);
        return;
      }

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
        setCustomerId(customerData.customer_id);
        setAuthenticated(true);
        loadCustomerData(customerData.customer_id);
      }
    } catch (error) {
      console.error('認証確認エラー:', error);
      router.push(`/login?tenant=${tenantCode}&redirect=/mypage`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customers/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push(`/?tenant=${tenantCode}`);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const loadCustomerData = async (id: number) => {
    try {
      // 予約履歴を取得
      const historyResponse = await fetch(
        `/api/reservations/history?tenant=${tenantCode}&customer_id=${id}`,
        { credentials: 'include' }
      );
      const historyData = await historyResponse.json();
      setReservations(historyData);

      // 現在の予約を取得
      const currentResponse = await fetch(
        `/api/reservations/current?tenant=${tenantCode}&customer_id=${id}`,
        { credentials: 'include' }
      );
      const currentData = await currentResponse.json();
      setCurrentReservation(currentData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !customerId) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              マイページ
            </h1>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>

          {customer && (
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-gray-900">お客様情報</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">お名前:</span> {customer.real_name}</p>
                <p className="text-gray-700"><span className="font-medium">メール:</span> {customer.email}</p>
                <p className="text-gray-700"><span className="font-medium">電話:</span> {customer.phone_number}</p>
              </div>
            </div>
          )}

          {currentReservation && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">現在の予約</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">日時:</span> {new Date(currentReservation.reservation_date).toLocaleString('ja-JP')}</p>
                <p className="text-gray-700"><span className="font-medium">メニュー:</span> {currentReservation.menu_name}</p>
                <p className="text-gray-700"><span className="font-medium">スタッフ:</span> {currentReservation.staff_name || 'スタッフ選択なし'}</p>
                <p className="text-gray-700"><span className="font-medium">料金:</span> ¥{currentReservation.price.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">予約履歴</h2>
            {reservations.length === 0 ? (
              <p className="text-gray-600">予約履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
                  <div key={reservation.reservation_id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                    <p className="font-semibold text-gray-900 mb-1">{new Date(reservation.reservation_date).toLocaleString('ja-JP')}</p>
                    <p className="text-gray-700 mb-1">{reservation.menu_name} - {reservation.staff_name || 'スタッフ選択なし'}</p>
                    <p className="text-gray-900 font-medium mb-1">¥{reservation.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">ステータス: {reservation.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/reservation?tenant=${tenantCode}`)}
              className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
            >
              新規予約
            </button>
            <button
              onClick={() => router.push(`/?tenant=${tenantCode}`)}
              className="px-6 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <MyPageContent />
    </Suspense>
  );
}
