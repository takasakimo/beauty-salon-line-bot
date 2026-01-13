'use client';

import Link from 'next/link';

// モックデータ
const mockReservations = [
  {
    reservation_id: 1,
    reservation_date: '2025-01-15T14:00:00+09:00',
    menu_name: 'カットカラー',
    menus: [
      { menu_id: 1, menu_name: 'カット', price: 3000, duration: 60 },
      { menu_id: 2, menu_name: 'カラー', price: 5000, duration: 90 }
    ],
    total_price: 8000,
    total_duration: 150,
    staff_name: '山田 花子',
    status: 'confirmed'
  },
  {
    reservation_id: 2,
    reservation_date: '2024-12-20T10:00:00+09:00',
    menu_name: 'カット',
    price: 3000,
    menu_duration: 60,
    staff_name: '佐藤 太郎',
    status: 'completed'
  },
  {
    reservation_id: 3,
    reservation_date: '2024-12-10T15:00:00+09:00',
    menu_name: 'パーマ',
    price: 8000,
    menu_duration: 120,
    staff_name: null,
    status: 'cancelled'
  }
];

const mockCurrentReservation = {
  reservation_id: 1,
  reservation_date: '2025-01-15T14:00:00+09:00',
  menu_name: 'カットカラー',
  menus: [
    { menu_id: 1, menu_name: 'カット', price: 3000, duration: 60 },
    { menu_id: 2, menu_name: 'カラー', price: 5000, duration: 90 }
  ],
  total_price: 8000,
  total_duration: 150,
  staff_name: '山田 花子',
  status: 'confirmed'
};

export default function DemoMyPage() {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '予約確定';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* デモバナー */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 font-semibold">デモモード</p>
              <p className="text-yellow-700 text-sm">この画面はデモ用です。実際のデータは表示されません。</p>
            </div>
            <Link
              href="/demo"
              className="text-yellow-800 hover:text-yellow-900 underline text-sm"
            >
              デモトップに戻る
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">マイページ（デモ）</h1>
            <Link
              href="/demo/customer/reservation"
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
            >
              予約する
            </Link>
          </div>

          {/* 顧客情報 */}
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">お客様情報</h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700"><span className="font-medium">お名前:</span> デモ 太郎</p>
              <p className="text-gray-700"><span className="font-medium">メール:</span> demo@example.com</p>
              <p className="text-gray-700"><span className="font-medium">電話:</span> 090-1234-5678</p>
            </div>
          </div>

          {/* 現在の予約 */}
          {mockCurrentReservation && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">現在の予約</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">日時:</span> {formatDate(mockCurrentReservation.reservation_date)}</p>
                <p className="text-gray-700">
                  <span className="font-medium">メニュー:</span>
                  {mockCurrentReservation.menus && mockCurrentReservation.menus.length > 1 ? (
                    <div className="mt-1 ml-4">
                      {mockCurrentReservation.menus.map((menu, idx) => (
                        <div key={menu.menu_id}>
                          {idx > 0 && ' + '}
                          {menu.menu_name} (¥{menu.price.toLocaleString()}, {menu.duration}分)
                        </div>
                      ))}
                      <div className="mt-1 font-semibold text-gray-900">
                        合計: ¥{mockCurrentReservation.total_price.toLocaleString()} / {mockCurrentReservation.total_duration}分
                      </div>
                    </div>
                  ) : (
                    <span> {mockCurrentReservation.menu_name}</span>
                  )}
                </p>
                {mockCurrentReservation.staff_name && (
                  <p className="text-gray-700"><span className="font-medium">スタッフ:</span> {mockCurrentReservation.staff_name}</p>
                )}
                <p className="text-gray-700"><span className="font-medium">料金:</span> ¥{mockCurrentReservation.total_price.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* 予約履歴 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">予約履歴</h2>
            {mockReservations.length === 0 ? (
              <p className="text-gray-600">予約履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {mockReservations.map((reservation) => (
                  <div key={reservation.reservation_id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                    <p className="font-semibold text-gray-900 mb-1">{formatDate(reservation.reservation_date)}</p>
                    <p className="text-gray-700 mb-1">
                      {reservation.menus && reservation.menus.length > 1 ? (
                        <div>
                          {reservation.menus.map((menu, idx) => (
                            <span key={menu.menu_id}>
                              {idx > 0 && ' + '}
                              {menu.menu_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        reservation.menu_name
                      )}
                      {' - '}
                      {reservation.staff_name || ''}
                    </p>
                    <p className="text-gray-900 font-medium mb-1">
                      ¥{(reservation.total_price || reservation.price || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      ステータス: {getStatusLabel(reservation.status)}
                    </p>
                    <button
                      onClick={() => {
                        const menuIds = reservation.menus && reservation.menus.length > 0
                          ? reservation.menus.map(m => m.menu_id).join(',')
                          : reservation.reservation_id.toString();
                        window.location.href = `/demo/customer/reservation?menu_ids=${menuIds}`;
                      }}
                      className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      同じメニューで予約する
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

