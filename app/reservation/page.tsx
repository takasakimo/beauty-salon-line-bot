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
  const [authenticated, setAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadMenus();
    loadStaff();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/customers/me', {
        credentials: 'include'
      });

      if (response.status === 401) {
        // 未認証 - ログインページにリダイレクト
        router.push(`/login?tenant=${tenantCode}&redirect=/reservation`);
        return;
      }

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
        setCustomerInfo({
          name: customerData.real_name || '',
          email: customerData.email || '',
          phone: customerData.phone_number || ''
        });
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('認証確認エラー:', error);
      router.push(`/login?tenant=${tenantCode}&redirect=/reservation`);
    }
  };

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

  const handleStaffSelect = (staffMember: Staff | null) => {
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
    if (!selectedMenu || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const reservationDate = new Date(`${selectedDate}T${selectedTime}`);
      
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Code': tenantCode
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customer?.customer_id,
          email: customer?.email || customerInfo.email,
          customer_name: customer?.real_name || customerInfo.name,
          phone_number: customer?.phone_number || customerInfo.phone,
          menu_id: selectedMenu.menu_id,
          staff_id: selectedStaff ? selectedStaff.staff_id : null,
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

  if (!authenticated) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold mb-8 text-gray-900 text-center">
            予約フォーム
          </h1>

          {step === 'menu' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">メニューを選択</h2>
              <div className="grid grid-cols-1 gap-4">
                {menus.map((menu) => (
                  <button
                    key={menu.menu_id}
                    onClick={() => handleMenuSelect(menu)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-left transition-all shadow-sm hover:shadow-md"
                  >
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">{menu.name}</h3>
                    <p className="text-gray-600 text-sm">
                      ¥{menu.price.toLocaleString()} / {menu.duration}分
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'staff' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">スタッフを選択</h2>
              <div className="grid grid-cols-1 gap-4">
                {staff.map((staffMember) => (
                  <button
                    key={staffMember.staff_id}
                    onClick={() => handleStaffSelect(staffMember)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-left transition-all shadow-sm hover:shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">{staffMember.name}</h3>
                  </button>
                ))}
                <button
                  onClick={() => handleStaffSelect(null)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-left transition-all shadow-sm hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900">スタッフ選択なし</h3>
                  <p className="text-sm text-gray-600 mt-1">スタッフを指定しない場合はこちらを選択してください</p>
                </button>
              </div>
              <button
                onClick={() => setStep('menu')}
                className="mt-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
            </div>
          )}

          {step === 'date' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">日付を選択</h2>
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
                className="mt-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
            </div>
          )}

          {step === 'time' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">時間を選択</h2>
              <div className="grid grid-cols-3 gap-4">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleTimeSelect(slot)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all shadow-sm hover:shadow-md"
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
                className="mt-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">予約内容の確認</h2>
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">メニュー:</span>
                    <span className="text-gray-900">{selectedMenu?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">スタッフ:</span>
                    <span className="text-gray-900">{selectedStaff ? selectedStaff.name : 'スタッフ選択なし'}</span>
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

              {customer && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">お客様:</span> {customer.real_name}様
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">メール:</span> {customer.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">電話:</span> {customer.phone_number}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('time')}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
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

