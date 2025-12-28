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
  const [selectedMenus, setSelectedMenus] = useState<Menu[]>([]);
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
  }, []);

  useEffect(() => {
    if (selectedMenus.length > 0) {
      loadStaff();
    }
  }, [selectedMenus]);

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
    if (selectedMenus.length > 0 && selectedDate && selectedStaff !== undefined) {
      loadAvailableSlots();
    }
  }, [selectedMenus, selectedDate, selectedStaff]);

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
      // 複数メニューに対応可能なスタッフを取得（最初のメニューIDを使用）
      const url = selectedMenus.length > 0
        ? `/api/staff?tenant=${tenantCode}&menu_id=${selectedMenus[0].menu_id}`
        : `/api/staff?tenant=${tenantCode}`;
      const response = await fetch(url);
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (selectedMenus.length === 0 || !selectedDate) return;
    
    try {
      // 複数メニューの合計時間を計算
      const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);
      // 複数メニューIDをカンマ区切りで渡す
      const menuIds = selectedMenus.map(m => m.menu_id).join(',');
      
      // staff_idパラメータを追加（スタッフが選択されている場合）
      const staffParam = selectedStaff ? `&staff_id=${selectedStaff.staff_id}` : '';
      
      const response = await fetch(
        `/api/reservations/available-slots?tenant=${tenantCode}&date=${selectedDate}&menu_id=${menuIds}&duration=${totalDuration}${staffParam}`
      );
      const data = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error('空き時間取得エラー:', error);
    }
  };

  const handleMenuToggle = (menu: Menu) => {
    setSelectedMenus(prev => {
      const exists = prev.find(m => m.menu_id === menu.menu_id);
      if (exists) {
        return prev.filter(m => m.menu_id !== menu.menu_id);
      } else {
        return [...prev, menu];
      }
    });
  };

  const handleMenuSelect = () => {
    if (selectedMenus.length === 0) {
      alert('少なくとも1つのメニューを選択してください');
      return;
    }
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
    if (selectedMenus.length === 0 || !selectedDate || !selectedTime) return;

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
          menu_ids: selectedMenus.map(m => m.menu_id),
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
              <p className="text-sm text-gray-600 mb-4">
                複数のメニューを選択できます
              </p>
              {menus.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">メニューが登録されていません</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    {menus.map((menu) => {
                      const isSelected = selectedMenus.some(m => m.menu_id === menu.menu_id);
                      return (
                        <label
                          key={menu.menu_id}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-pink-500 bg-pink-50 shadow-md'
                              : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMenuToggle(menu)}
                            className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-4 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{menu.name}</h3>
                            <p className="text-gray-600 text-sm">
                              ¥{menu.price.toLocaleString()} / {menu.duration}分
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedMenus.length > 0 && (
                    <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">選択中のメニュー</h3>
                      <div className="space-y-1 mb-3">
                        {selectedMenus.map((menu) => (
                          <div key={menu.menu_id} className="flex justify-between text-sm">
                            <span className="text-gray-700">{menu.name}</span>
                            <span className="text-gray-600">¥{menu.price.toLocaleString()} / {menu.duration}分</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-pink-200 pt-2 flex justify-between items-center">
                        <span className="font-semibold text-gray-900">合計:</span>
                        <div className="text-right">
                          <div className="font-bold text-lg text-pink-600">
                            ¥{selectedMenus.reduce((sum, m) => sum + m.price, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedMenus.reduce((sum, m) => sum + m.duration, 0)}分
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleMenuSelect}
                    disabled={selectedMenus.length === 0}
                    className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    次へ進む
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'staff' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">スタッフを選択</h2>
              {selectedMenus.length > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  {selectedMenus.map(m => m.name).join('、')}に対応可能なスタッフを表示しています
                </p>
              )}
              {staff.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {selectedMenus.length > 0
                      ? `${selectedMenus.map(m => m.name).join('、')}に対応可能なスタッフがありません`
                      : 'スタッフが登録されていません'}
                  </p>
                </div>
              ) : (
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
              )}
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
                  <div>
                    <span className="text-gray-600 font-medium block mb-2">メニュー:</span>
                    <div className="space-y-1">
                      {selectedMenus.map((menu) => (
                        <div key={menu.menu_id} className="flex justify-between text-gray-900">
                          <span>{menu.name}</span>
                          <span>¥{menu.price.toLocaleString()} / {menu.duration}分</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">スタッフ:</span>
                    <span className="text-gray-900">{selectedStaff ? selectedStaff.name : 'スタッフ選択なし'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">日時:</span>
                    <span className="text-gray-900">{selectedDate} {selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">合計時間:</span>
                    <span className="text-gray-900">{selectedMenus.reduce((sum, m) => sum + m.duration, 0)}分</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-3">
                    <span className="text-gray-600 font-semibold">合計料金:</span>
                    <span className="text-gray-900 font-semibold text-lg">
                      ¥{selectedMenus.reduce((sum, m) => sum + m.price, 0).toLocaleString()}
                    </span>
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
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push(`/mypage?tenant=${tenantCode}`)}
                  className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
                >
                  マイページへ
                </button>
                <button
                  onClick={() => router.push(`/?tenant=${tenantCode}`)}
                  className="px-6 py-3 bg-white border-2 border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
                >
                  ホームに戻る
                </button>
              </div>
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

