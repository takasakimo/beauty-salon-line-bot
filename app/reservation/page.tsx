'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Menu {
  menu_id: number;
  name: string;
  price: number;
  duration: number;
  category?: string;
}

interface Staff {
  staff_id: number;
  name: string;
}

function ReservationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantCode = searchParams.get('tenant') || 'beauty-salon-001';

  const [step, setStep] = useState<'menu' | 'staff' | 'date' | 'time' | 'confirm' | 'complete'>('menu');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMenus();
    loadStaff();
  }, []);

  useEffect(() => {
    if (selectedMenu && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedMenu, selectedDate]);

  const loadMenus = async () => {
    try {
      const response = await fetch(`/api/menus?tenant=${tenantCode}`);
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch(`/api/staff?tenant=${tenantCode}`);
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedMenu || !selectedDate) return;
    
    try {
      const response = await fetch(
        `/api/reservations/available-slots?tenant=${tenantCode}&date=${selectedDate}&menu_id=${selectedMenu.menu_id}`
      );
      const data = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error('空き時間取得エラー:', error);
    }
  };

  const handleMenuSelect = (menu: Menu) => {
    setSelectedMenu(menu);
    setStep('staff');
  };

  const handleStaffSelect = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setStep('date');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedMenu || !selectedStaff || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const reservationDate = new Date(`${selectedDate}T${selectedTime}`);
      
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Code': tenantCode
        },
        body: JSON.stringify({
          customer_name: customerInfo.name,
          email: customerInfo.email,
          phone_number: customerInfo.phone,
          menu_id: selectedMenu.menu_id,
          staff_id: selectedStaff.staff_id,
          reservation_date: reservationDate.toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStep('complete');
      } else {
        alert('予約に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('予約エラー:', error);
      alert('予約処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 日付選択用の日付リスト（今日から7日後まで）
  const getDateOptions = () => {
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900 text-center">
            予約フォーム
          </h1>

          {step === 'menu' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">メニューを選択</h2>
              <div className="grid grid-cols-1 gap-4">
                {menus.map((menu) => (
                  <button
                    key={menu.menu_id}
                    onClick={() => handleMenuSelect(menu)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-left transition-all shadow-sm hover:shadow-md"
                  >
                    <h3 className="text-xl font-semibold mb-2">{menu.name}</h3>
                    <p className="text-gray-600">
                      ¥{menu.price.toLocaleString()} / {menu.duration}分
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'staff' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">スタッフを選択</h2>
              <div className="grid grid-cols-1 gap-4">
                {staff.map((staffMember) => (
                  <button
                    key={staffMember.staff_id}
                    onClick={() => handleStaffSelect(staffMember)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-left transition-all shadow-sm hover:shadow-md"
                  >
                    <h3 className="text-xl font-semibold">{staffMember.name}</h3>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('menu')}
                className="mt-4 text-pink-600 hover:text-pink-700"
              >
                ← 戻る
              </button>
            </div>
          )}

          {step === 'date' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">日付を選択</h2>
              <div className="grid grid-cols-2 gap-4">
                {getDateOptions().map((date) => {
                  const dateObj = new Date(date);
                  const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
                  return (
                    <button
                      key={date}
                      onClick={() => handleDateSelect(date)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all shadow-sm hover:shadow-md"
                    >
                      {dateObj.getMonth() + 1}/{dateObj.getDate()}({dayName})
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setStep('staff')}
                className="mt-4 text-pink-600 hover:text-pink-700"
              >
                ← 戻る
              </button>
            </div>
          )}

          {step === 'time' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">時間を選択</h2>
              <div className="grid grid-cols-3 gap-4">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleTimeSelect(slot)}
                    className="p-4 border-2 border-pink-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {availableSlots.length === 0 && (
                <p className="text-gray-600 text-center py-8">
                  この日の空き時間がありません
                </p>
              )}
              <button
                onClick={() => setStep('date')}
                className="mt-4 text-pink-600 hover:text-pink-700"
              >
                ← 戻る
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">予約内容の確認</h2>
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">メニュー:</span>
                    <span className="text-gray-900">{selectedMenu?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">スタッフ:</span>
                    <span className="text-gray-900">{selectedStaff?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">日時:</span>
                    <span className="text-gray-900">{selectedDate} {selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-3">
                    <span className="text-gray-600 font-semibold">料金:</span>
                    <span className="text-gray-900 font-semibold text-lg">¥{selectedMenu?.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">お客様情報</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="お名前"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="電話番号"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('time')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  戻る
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || !customerInfo.name || !customerInfo.phone}
                  className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                  {loading ? '予約中...' : '予約確定'}
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">予約が完了しました</h2>
              <p className="text-gray-600 mb-8">
                ご予約ありがとうございます。当日お待ちしております。
              </p>
              <button
                onClick={() => router.push(`/?tenant=${tenantCode}`)}
                className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
              >
                ホームに戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
      <p>読み込み中...</p>
    </div>}>
      <ReservationPageContent />
    </Suspense>
  );
}

