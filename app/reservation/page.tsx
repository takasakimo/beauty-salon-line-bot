'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Menu {
  menu_id: number;
  name: string;
  price: number;
  duration: number;
  category?: string;
  is_active?: boolean;
}

interface Staff {
  staff_id: number;
  name: string;
  image_url?: string | null;
}

function ReservationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantCode = searchParams.get('tenant') || 'beauty-salon-001';

  const [step, setStep] = useState<'menu' | 'staff' | 'datetime' | 'confirm' | 'complete'>('menu');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<Menu[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlotsByDate, setAvailableSlotsByDate] = useState<Record<string, string[]>>({});
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date());
  const [closedDaysInfo, setClosedDaysInfo] = useState<{
    closedDays: number[];
    temporaryClosedDays: string[];
  }>({ closedDays: [], temporaryClosedDays: [] });
  // データベースから取得した臨時休業日を保持（上書きされないように）
  const [dbTemporaryClosedDays, setDbTemporaryClosedDays] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [businessHours, setBusinessHours] = useState<any>({});
  const [specialBusinessHours, setSpecialBusinessHours] = useState<Record<string, { open: string; close: string }>>({});

  useEffect(() => {
    checkAuth();
    loadMenus();
    loadTenantInfo();
  }, []);

  const loadTenantInfo = async () => {
    try {
      const response = await fetch(`/api/tenants/info?tenant=${tenantCode}`);
      if (response.ok) {
        const data = await response.json();
        setBusinessHours(data.business_hours || {});
        setSpecialBusinessHours(data.special_business_hours || {});
        // データベースから取得した臨時休業日を保持
        const dbTemporaryClosedDays = Array.isArray(data.temporary_closed_days) ? data.temporary_closed_days : [];
        setDbTemporaryClosedDays(dbTemporaryClosedDays);
        // 臨時休業日と定休日を設定
        setClosedDaysInfo({
          closedDays: Array.isArray(data.closed_days) ? data.closed_days : [],
          temporaryClosedDays: dbTemporaryClosedDays
        });
        console.log('データベースから取得した臨時休業日:', dbTemporaryClosedDays);
      }
    } catch (error) {
      console.error('テナント情報取得エラー:', error);
    }
  };

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
    if (selectedMenus.length > 0 && selectedStaff !== undefined) {
      loadAvailableSlotsForAllDates();
    }
  }, [selectedMenus, selectedStaff, weekStartDate]);
  
  // 空きスロットが更新されたら休業日情報も更新（データベースの情報を優先し、空きスロットがない日を補完）
  useEffect(() => {
    if (Object.keys(availableSlotsByDate).length > 0) {
      setClosedDaysInfo(prev => {
        const dates = getTwoWeekDates();
        // データベースから取得した臨時休業日を基準にする
        const currentClosedDays = [...prev.closedDays];
        // データベースから取得した臨時休業日をコピー（カレンダーに表示されている日付のみを保持）
        const currentTemporaryClosedDays = dbTemporaryClosedDays.filter(dateStr => {
          return dates.some(d => d.toISOString().split('T')[0] === dateStr);
        });
        
        // 各日付をチェック（空きスロットがない日を補完的に追加）
        // ただし、データベースから取得した臨時休業日リストに含まれていない日付は追加しない
        for (const date of dates) {
          const dateStr = date.toISOString().split('T')[0];
          const availableSlots = availableSlotsByDate[dateStr] || [];
          const dayOfWeek = date.getDay();
          
          // 空きスロットが0件で、かつ既に臨時休業日や定休日に含まれていない場合のみ追加
          if (availableSlots.length === 0) {
            // 定休日に含まれているかチェック
            const isClosedDay = currentClosedDays.includes(dayOfWeek);
            // 臨時休業日に含まれているかチェック
            const isTemporaryClosedDay = currentTemporaryClosedDays.includes(dateStr);
            
            if (!isClosedDay && !isTemporaryClosedDay) {
              // 同じ曜日が複数回出現する場合は定休日として扱う
              const sameDayOfWeekCount = dates.filter(d => d.getDay() === dayOfWeek && (availableSlotsByDate[d.toISOString().split('T')[0]] || []).length === 0).length;
              if (sameDayOfWeekCount >= 2) {
                // 同じ曜日が2回以上休業の場合は定休日として扱う
                if (!currentClosedDays.includes(dayOfWeek)) {
                  currentClosedDays.push(dayOfWeek);
                }
              }
              // 臨時休業日として追加する処理は削除（データベースの情報のみを使用）
            }
          }
        }
        
        return { 
          closedDays: currentClosedDays, 
          temporaryClosedDays: currentTemporaryClosedDays 
        };
      });
    }
  }, [availableSlotsByDate, weekStartDate, dbTemporaryClosedDays]);

  const loadMenus = async () => {
    try {
      const response = await fetch(`/api/menus?tenant=${tenantCode}`);
      const data = await response.json();
      // 有効なメニューのみをフィルタリング（is_activeがfalseでないもの）
      setMenus(data.filter((menu: Menu) => menu.is_active !== false));
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  // カテゴリーでフィルタリングされたメニュー
  const filteredMenus = selectedCategory
    ? menus.filter(menu => {
        const category = menu.category || 'カテゴリなし';
        return category === selectedCategory;
      })
    : menus;

  // メニューをカテゴリごとにグループ化
  const groupedMenus = filteredMenus.reduce((acc, menu) => {
    const category = menu.category || 'カテゴリなし';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  // カテゴリをソート（その他系とカテゴリなしを最後に）
  const sortedCategories = Object.keys(groupedMenus).sort((a, b) => {
    // 「その他」で始まるカテゴリを最後に
    if (a.startsWith('その他')) return 1;
    if (b.startsWith('その他')) return -1;
    // 「カテゴリなし」を「その他」の前（最後から2番目）に
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    // その他のカテゴリはアルファベット順
    return a.localeCompare(b);
  });

  // 利用可能なカテゴリー一覧（重複を除去）
  const availableCategories = Array.from(
    new Set(menus.map(menu => menu.category || 'カテゴリなし').filter(Boolean))
  ).sort((a, b) => {
    // 「その他」で始まるカテゴリを最後に
    if (a.startsWith('その他')) return 1;
    if (b.startsWith('その他')) return -1;
    // 「カテゴリなし」を「その他」の前（最後から2番目）に
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    // その他のカテゴリはアルファベット順
    return a.localeCompare(b);
  });

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

  const loadAvailableSlotsForAllDates = async () => {
    if (selectedMenus.length === 0) return;
    
    setLoadingSlots(true);
    try {
      // 複数メニューの合計時間を計算
      const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);
      // 複数メニューIDをカンマ区切りで渡す
      const menuIds = selectedMenus.map(m => m.menu_id).join(',');
      
      // staff_idパラメータを追加（スタッフが選択されている場合）
      const staffParam = selectedStaff ? `&staff_id=${selectedStaff.staff_id}` : '';
      
      console.log('loadAvailableSlotsForAllDates:', {
        selectedStaff: selectedStaff ? { staff_id: selectedStaff.staff_id, name: selectedStaff.name } : null,
        staffParam,
        menuIds,
        totalDuration
      });
      
      // すべての日付の空き時間を取得（1ヶ月分 + 2週間カレンダー用）
      const dates = getDateOptions();
      const twoWeekDates = getTwoWeekDates().map(d => d.toISOString().split('T')[0]);
      // 重複を除去して結合
      const allDates = Array.from(new Set([...dates, ...twoWeekDates]));
      const slotsByDate: Record<string, string[]> = {};
      
      await Promise.all(
        allDates.map(async (date) => {
          try {
            const url = `/api/reservations/available-slots?tenant=${tenantCode}&date=${date}&menu_id=${menuIds}&duration=${totalDuration}${staffParam}`;
            console.log('available-slots API呼び出し:', { date, url });
            const response = await fetch(url);
            if (response.ok) {
      const data = await response.json();
              slotsByDate[date] = data;
            }
          } catch (error) {
            console.error(`空き時間取得エラー (${date}):`, error);
            slotsByDate[date] = [];
          }
        })
      );
      
      setAvailableSlotsByDate(slotsByDate);
    } catch (error) {
      console.error('空き時間取得エラー:', error);
    } finally {
      setLoadingSlots(false);
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
    // 選択状態を更新するだけで、次のステップには進まない
    // 「次へ進む」ボタンで次のステップに進む
  };

  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (selectedMenus.length === 0 || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      // JST時間として明示的に送信（toISOString()は使わない）
      const reservationDate = `${selectedDate}T${selectedTime}:00+09:00`;
      
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
          reservation_date: reservationDate
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

  // 日付選択用の日付リスト（今日から1ヶ月後まで）
  const getDateOptions = () => {
    const dates = [];
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // 2週間分の日付を生成（週の開始日から14日間）
  const getTwoWeekDates = () => {
    const dates: Date[] = [];
    const startDate = new Date(weekStartDate);
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // 日付をフォーマット（1/3(土)形式）
  const formatDateForCalendar = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[date.getDay()];
    return { month, day, dayName, dateStr: date.toISOString().split('T')[0] };
  };

  // 前の一週間へ
  const handlePreviousWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(weekStartDate.getDate() - 7);
    setWeekStartDate(newDate);
  };

  // 次の一週間へ
  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(weekStartDate.getDate() + 7);
    setWeekStartDate(newDate);
  };

  // 現在の週の年月を取得
  const getCurrentMonthYear = () => {
    const firstDate = getTwoWeekDates()[0];
    return `${firstDate.getFullYear()}年${firstDate.getMonth() + 1}月`;
  };

  if (!authenticated) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* 戻るボタン */}
          <Link
            href={`/mypage?tenant=${tenantCode}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            マイページに戻る
          </Link>
          <h1 className="text-2xl font-bold mb-8 text-gray-900 text-center">
            予約フォーム
          </h1>

          {step === 'menu' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">メニューを選択</h2>
              <p className="text-sm text-gray-600 mb-4">
                複数のメニューを選択できます
              </p>
              
              {/* カテゴリー検索プルダウン */}
              {availableCategories.length > 0 && (
                <div className="mb-6">
                  <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリーで絞り込み
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 bg-white"
                  >
                    <option value="">すべてのカテゴリー</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {menus.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">メニューが登録されていません</p>
                </div>
              ) : filteredMenus.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">選択したカテゴリーにメニューがありません</p>
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="mt-4 text-pink-600 hover:text-pink-700 underline"
                  >
                    すべてのカテゴリーを表示
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-6 mb-6">
                    {sortedCategories.map((category) => (
                      <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-pink-100 px-4 py-2 border-b border-gray-200">
                          <h3 className="text-md font-semibold text-gray-800">
                            {category}
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              ({groupedMenus[category].length}件)
                            </span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4">
                          {groupedMenus[category].map((menu) => {
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
                      </div>
                    ))}
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
              <h2 className="text-xl font-semibold mb-6 text-gray-800">スタッフ指名</h2>
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
                <div>
                  {/* 横スクロール可能なスタッフ一覧 */}
                  <div className="mb-6">
                    <div className="overflow-x-auto pb-4 -mx-4 px-4">
                      <div className="flex space-x-4 min-w-max">
                        {staff.map((staffMember) => {
                          const isSelected = selectedStaff?.staff_id === staffMember.staff_id;
                          return (
                            <button
                              key={staffMember.staff_id}
                              onClick={() => handleStaffSelect(staffMember)}
                              className="flex flex-col items-center min-w-[80px] transition-all"
                            >
                              <div className="relative">
                                {/* 選択インジケーター */}
                                {isSelected && (
                                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-pink-500 rounded-full z-10"></div>
                                )}
                                {/* プロフィール写真 */}
                                <div className={`w-20 h-20 rounded-full overflow-hidden border-2 flex-shrink-0 ${
                                  isSelected ? 'border-white shadow-lg' : 'border-gray-300'
                                }`}>
                                  {staffMember.image_url ? (
                                    <img
                                      src={staffMember.image_url}
                                      alt={staffMember.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">写真なし</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* 名前 */}
                              <h3 className={`text-sm font-semibold mt-2 text-center ${
                                isSelected ? 'text-pink-600' : 'text-gray-900'
                              }`}>
                                {staffMember.name}
                              </h3>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* スタッフ選択なしオプション */}
                  <button
                    onClick={() => handleStaffSelect(null)}
                    className={`w-full p-6 border-2 rounded-lg text-left transition-all shadow-sm hover:shadow-md mb-4 ${
                      selectedStaff === null
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-500 hover:bg-pink-50'
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-gray-900">スタッフ選択なし</h3>
                    <p className="text-sm text-gray-600 mt-1">スタッフを指定しない場合はこちらを選択してください</p>
                  </button>
                  
                  {/* 次へ進むボタン */}
                  <button
                    onClick={() => setStep('datetime')}
                    className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                  >
                    次へ進む
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

          {step === 'datetime' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-800">日時を選択</h2>
              
              {loadingSlots ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">空き時間を取得中...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 時間選択 - 2週間カレンダー形式（画像と同じ表記） */}
                  {selectedMenus.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        日時を選択
                      </label>
                      {(() => {
                        // 営業時間に基づいて時間スロットを動的に生成
                        // すべての曜日の営業時間を確認して、最も早い開店時間と最も遅い閉店時間を取得
                        let minOpenHour = 9;
                        let minOpenMinute = 0;
                        let maxCloseHour = 19;
                        let maxCloseMinute = 0;
                        
                        // 曜日名のマッピング（0=日曜日、1=月曜日、...、6=土曜日）
                        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        
                        // すべての曜日の営業時間を確認
                        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                          const dayName = dayNames[dayOfWeek];
                          const dayBusinessHours = businessHours[dayName] || businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '19:00' };
                          
                          if (dayBusinessHours.open) {
                            const [openHour, openMinute] = dayBusinessHours.open.split(':').map(Number);
                            if (openHour < minOpenHour || (openHour === minOpenHour && openMinute < minOpenMinute)) {
                              minOpenHour = openHour;
                              minOpenMinute = openMinute;
                            }
                          }
                          
                          if (dayBusinessHours.close) {
                            const [closeHour, closeMinute] = dayBusinessHours.close.split(':').map(Number);
                            if (closeHour > maxCloseHour || (closeHour === maxCloseHour && closeMinute > maxCloseMinute)) {
                              maxCloseHour = closeHour;
                              maxCloseMinute = closeMinute;
                            }
                          }
                        }
                        
                        // 特別営業時間も確認
                        Object.values(specialBusinessHours).forEach((hours: any) => {
                          if (hours.open) {
                            const [openHour, openMinute] = hours.open.split(':').map(Number);
                            if (openHour < minOpenHour || (openHour === minOpenHour && openMinute < minOpenMinute)) {
                              minOpenHour = openHour;
                              minOpenMinute = openMinute;
                            }
                          }
                          if (hours.close) {
                            const [closeHour, closeMinute] = hours.close.split(':').map(Number);
                            if (closeHour > maxCloseHour || (closeHour === maxCloseHour && closeMinute > maxCloseMinute)) {
                              maxCloseHour = closeHour;
                              maxCloseMinute = closeMinute;
                            }
                          }
                        });
                        
                        // デフォルト値（営業時間が設定されていない場合）
                        if (Object.keys(businessHours).length === 0 && Object.keys(specialBusinessHours).length === 0) {
                          minOpenHour = 9;
                          minOpenMinute = 0;
                          maxCloseHour = 19;
                          maxCloseMinute = 0;
                        }
                        
                        // 時間スロットを生成（30分間隔）
                        const timeSlots: string[] = [];
                        const startTimeInMinutes = minOpenHour * 60 + minOpenMinute;
                        const endTimeInMinutes = maxCloseHour * 60 + maxCloseMinute;
                        
                        for (let timeInMinutes = startTimeInMinutes; timeInMinutes <= endTimeInMinutes; timeInMinutes += 30) {
                          const hour = Math.floor(timeInMinutes / 60);
                          const minute = timeInMinutes % 60;
                          timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
                        }
                        
                        const twoWeekDates = getTwoWeekDates();
                        
                        return (
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {/* ヘッダー */}
                            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
                              <button
                                onClick={handlePreviousWeek}
                                className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
                              >
                                &lt;前の一週間
                              </button>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {getCurrentMonthYear()}
                              </h3>
                              <button
                                onClick={handleNextWeek}
                                className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
                              >
                                次の一週間&gt;
                              </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <div className="inline-block min-w-full">
                                <div className="flex border-b border-gray-200 relative">
                                  {/* 左側の時間列（固定） */}
                                  <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                                    <div className="h-12 border-b border-gray-200"></div>
                                    {timeSlots.map((time) => (
                                      <div
                                        key={time}
                                        className="h-8 border-b border-gray-100 text-xs text-gray-600 px-1 flex items-center justify-center"
                                        style={{ height: '32px' }}
                                      >
                                        {time}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* 日付列 */}
                                  {twoWeekDates.map((date) => {
                                    const { month, day, dayName, dateStr } = formatDateForCalendar(date);
                                    const availableSlots = availableSlotsByDate[dateStr] || [];
                                    const dayOfWeek = date.getDay();
                                    const isClosed = availableSlots.length === 0 && (closedDaysInfo.closedDays.includes(dayOfWeek) || closedDaysInfo.temporaryClosedDays.includes(dateStr));
                                    
                                    // 日付の背景色を決定（土曜日=薄い青、日曜日/祝日=薄い赤）
                                    const isSaturday = dayOfWeek === 6;
                                    const isSunday = dayOfWeek === 0;
                                    const isHoliday = dayName === '祝';
                                    const dateBgColor = isSaturday 
                                      ? 'bg-blue-50' 
                                      : (isSunday || isHoliday) 
                                        ? 'bg-red-50' 
                                        : 'bg-gray-50';
                                    const dateTextColor = isSaturday 
                                      ? 'text-blue-600' 
                                      : (isSunday || isHoliday) 
                                        ? 'text-red-600' 
                                        : 'text-gray-900';
                                    
                                    return (
                                      <div key={dateStr} className="flex-1 min-w-[60px] border-r border-gray-200 relative">
                                        {/* 日付ヘッダー */}
                                        <div className={`h-12 border-b border-gray-200 ${dateBgColor} px-1 py-1 flex flex-col items-center justify-center`}>
                                          <div className={`text-xs font-semibold ${dateTextColor}`}>{day}</div>
                                          <div className={`text-xs ${dateTextColor}`}>({dayName})</div>
                                        </div>
                                        
                                        {/* 時間スロット */}
                                        <div className="relative" style={{ height: `${timeSlots.length * 32}px` }}>
                                          {timeSlots.map((time) => {
                                            const isAvailable = availableSlots.includes(time);
                                            const isSelected = selectedDate === dateStr && selectedTime === time;
                                            
                                            return (
                                              <div
                                                key={time}
                                                className={`h-8 border-b border-gray-100 flex items-center justify-center cursor-pointer transition-colors ${
                                                  isSelected
                                                    ? 'bg-pink-100'
                                                    : isAvailable
                                                    ? 'hover:bg-pink-50'
                                                    : 'bg-gray-50 opacity-50 cursor-not-allowed'
                                                }`}
                                                style={{ height: '32px' }}
                                                onClick={() => {
                                                  if (isAvailable) {
                                                    setSelectedDate(dateStr);
                                                    setSelectedTime(time);
                                                  }
                                                }}
                                              >
                                                {isAvailable ? (
                                                  <span className={`text-lg ${isSelected ? 'text-pink-600 font-bold' : 'text-red-600'}`}>
                                                    ○
                                                  </span>
                                                ) : (
                                                  <span className="text-lg text-black font-bold">×</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                          
                                          {/* 休業日の表示（縦書き） */}
                                          {isClosed && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 pointer-events-none">
                                              <span 
                                                className="text-xs text-gray-600 font-semibold"
                                                style={{ 
                                                  writingMode: 'vertical-rl',
                                                  textOrientation: 'upright'
                                                }}
                                              >
                                                休業日
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* 右側の時間列（固定） */}
                                  <div className="w-16 flex-shrink-0 border-l border-gray-200 bg-gray-50 sticky right-0 z-10">
                                    <div className="h-12 border-b border-gray-200"></div>
                                    {timeSlots.map((time) => (
                                      <div
                                        key={time}
                                        className="h-8 border-b border-gray-100 text-xs text-gray-600 px-1 flex items-center justify-center"
                                        style={{ height: '32px' }}
                                      >
                                        {time}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {selectedTime && selectedDate && (
                        <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                          <p className="text-sm text-gray-700">
                            選択された時間: <span className="font-semibold text-pink-600">{selectedDate} {selectedTime}</span>
                          </p>
                          <button
                            onClick={() => handleDateTimeSelect(selectedDate, selectedTime)}
                            className="mt-2 w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
                          >
                            この時間で予約を確定
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setStep('staff')}
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
                <div className="text-xs text-gray-600">
                  <span className="text-red-600">○</span> 予約可能 / <span className="text-black">×</span> 予約不可
            </div>
              </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">スタッフ:</span>
                    {selectedStaff ? (
                      <div className="flex items-center gap-3">
                        {selectedStaff.image_url && (
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0">
                            <img
                              src={selectedStaff.image_url}
                              alt={selectedStaff.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="text-gray-900">{selectedStaff.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-900">スタッフ選択なし</span>
                    )}
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
                  onClick={() => setStep('datetime')}
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

