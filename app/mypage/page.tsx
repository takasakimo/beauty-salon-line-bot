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
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    // ローカルストレージから顧客IDを取得
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(parseInt(storedCustomerId));
      loadCustomerData(parseInt(storedCustomerId));
    }
  }, []);

  const searchCustomer = async () => {
    if (!searchEmail && !searchPhone) {
      alert('メールアドレスまたは電話番号を入力してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customers/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Code': tenantCode
        },
        body: JSON.stringify({
          email: searchEmail || undefined,
          phone_number: searchPhone || undefined
        })
      });

      const result = await response.json();
      
      if (result.exists && result.customer) {
        setCustomer(result.customer);
        setCustomerId(result.customer.customer_id);
        localStorage.setItem('customer_id', result.customer.customer_id);
        loadCustomerData(result.customer.customer_id);
      } else {
        alert('顧客情報が見つかりませんでした');
      }
    } catch (error) {
      console.error('顧客検索エラー:', error);
      alert('検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerData = async (id: number) => {
    setLoading(true);
    try {
      // 予約履歴を取得
      const historyResponse = await fetch(
        `/api/reservations/history?tenant=${tenantCode}&customer_id=${id}`
      );
      const historyData = await historyResponse.json();
      setReservations(historyData);

      // 現在の予約を取得
      const currentResponse = await fetch(
        `/api/reservations/current?tenant=${tenantCode}&customer_id=${id}`
      );
      const currentData = await currentResponse.json();
      setCurrentReservation(currentData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!customerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold mb-8 text-pink-600 text-center">
              マイページ
            </h1>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">お客様情報を検索</h2>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div className="text-center text-gray-500">または</div>
                <input
                  type="tel"
                  placeholder="電話番号"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={searchCustomer}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300"
                >
                  {loading ? '検索中...' : '検索'}
                </button>
              </div>
            </div>
            <button
              onClick={() => router.push(`/?tenant=${tenantCode}`)}
              className="text-pink-600 hover:text-pink-700"
            >
              ← ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p>読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900 text-center">
            マイページ
          </h1>

          {currentReservation && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">現在の予約</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">日時:</span> {new Date(currentReservation.reservation_date).toLocaleString('ja-JP')}</p>
                <p className="text-gray-700"><span className="font-medium">メニュー:</span> {currentReservation.menu_name}</p>
                <p className="text-gray-700"><span className="font-medium">スタッフ:</span> {currentReservation.staff_name}</p>
                <p className="text-gray-700"><span className="font-medium">料金:</span> ¥{currentReservation.price.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">予約履歴</h2>
            {reservations.length === 0 ? (
              <p className="text-gray-600">予約履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
                  <div key={reservation.reservation_id} className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-semibold">{new Date(reservation.reservation_date).toLocaleString('ja-JP')}</p>
                    <p>{reservation.menu_name} - {reservation.staff_name}</p>
                    <p className="text-gray-600">¥{reservation.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">ステータス: {reservation.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/reservation?tenant=${tenantCode}`)}
              className="flex-1 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              新規予約
            </button>
            <button
              onClick={() => router.push(`/?tenant=${tenantCode}`)}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
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

