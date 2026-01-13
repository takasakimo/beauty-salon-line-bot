'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  image_url?: string | null;
}

// モックデータ
const mockMenus: Menu[] = [
  { menu_id: 1, name: 'カット', price: 3000, duration: 60, category: 'カット' },
  { menu_id: 2, name: 'カラー', price: 5000, duration: 90, category: 'カラー' },
  { menu_id: 3, name: 'カットカラー', price: 7500, duration: 120, category: 'カット' },
  { menu_id: 4, name: 'パーマ', price: 8000, duration: 120, category: 'パーマ' },
  { menu_id: 5, name: 'トリートメント', price: 2000, duration: 30, category: 'トリートメント' },
];

const mockStaff: Staff[] = [
  { staff_id: 1, name: '山田 花子', image_url: null },
  { staff_id: 2, name: '佐藤 太郎', image_url: null },
  { staff_id: 3, name: '鈴木 美咲', image_url: null },
];

export default function DemoReservationPage() {
  const [step, setStep] = useState<'menu' | 'staff' | 'datetime' | 'confirm'>('menu');
  const [menus] = useState<Menu[]>(mockMenus);
  const [staff] = useState<Staff[]>(mockStaff);
  const [selectedMenus, setSelectedMenus] = useState<Menu[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const groupedMenus = menus.reduce((acc, menu) => {
    const category = menu.category || 'カテゴリなし';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  const categories = Object.keys(groupedMenus).sort();

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

  const handleNext = () => {
    if (step === 'menu' && selectedMenus.length > 0) {
      setStep('staff');
    } else if (step === 'staff') {
      setStep('datetime');
    } else if (step === 'datetime' && selectedDate && selectedTime) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'staff') {
      setStep('menu');
    } else if (step === 'datetime') {
      setStep('staff');
    } else if (step === 'confirm') {
      setStep('datetime');
    }
  };

  // 利用可能な時間スロット（デモ用）
  const availableTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* デモバナー */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-semibold">デモモード</p>
                <p className="text-yellow-700 text-sm">この画面はデモ用です。実際の予約は行われません。</p>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">予約ページ（デモ）</h1>

            {/* ステップインジケーター */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'menu' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <div className={`w-24 h-1 ${step === 'menu' ? 'bg-gray-200' : 'bg-pink-600'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'staff' ? 'bg-pink-600 text-white' : step === 'datetime' || step === 'confirm' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <div className={`w-24 h-1 ${step === 'datetime' || step === 'confirm' ? 'bg-pink-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'datetime' ? 'bg-pink-600 text-white' : step === 'confirm' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
                <div className={`w-24 h-1 ${step === 'confirm' ? 'bg-pink-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  4
                </div>
              </div>
            </div>

            {/* メニュー選択 */}
            {step === 'menu' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">メニューを選択</h2>
                {categories.length > 0 && (
                  <div className="mb-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">すべてのカテゴリ</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedCategory ? groupedMenus[selectedCategory] : menus).map(menu => (
                    <div
                      key={menu.menu_id}
                      onClick={() => handleMenuToggle(menu)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedMenus.some(m => m.menu_id === menu.menu_id)
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{menu.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ¥{menu.price.toLocaleString()} / {menu.duration}分
                      </div>
                    </div>
                  ))}
                </div>
                {selectedMenus.length > 0 && (
                  <div className="mt-6 p-4 bg-pink-50 rounded-lg">
                    <p className="font-semibold mb-2">選択中のメニュー</p>
                    {selectedMenus.map(menu => (
                      <div key={menu.menu_id} className="text-sm">
                        {menu.name} - ¥{menu.price.toLocaleString()} ({menu.duration}分)
                      </div>
                    ))}
                    <div className="mt-2 font-semibold">
                      合計: ¥{selectedMenus.reduce((sum, m) => sum + m.price, 0).toLocaleString()} / {selectedMenus.reduce((sum, m) => sum + m.duration, 0)}分
                    </div>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={selectedMenus.length === 0}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* スタッフ選択 */}
            {step === 'staff' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">スタッフを選択（任意）</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setSelectedStaff(null)}
                    className={`p-4 border-2 rounded-lg cursor-pointer text-center ${
                      selectedStaff === null
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="font-semibold">スタッフ選択なし</div>
                  </div>
                  {staff.map(s => (
                    <div
                      key={s.staff_id}
                      onClick={() => setSelectedStaff(s)}
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center ${
                        selectedStaff?.staff_id === s.staff_id
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="font-semibold">{s.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* 日時選択 */}
            {step === 'datetime' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">日時を選択</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">時間</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      disabled={!selectedDate}
                    >
                      <option value="">選択してください</option>
                      {availableTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selectedDate || !selectedTime}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* 確認 */}
            {step === 'confirm' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">予約内容の確認</h2>
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">メニュー</p>
                    <p className="font-semibold">
                      {selectedMenus.map(m => m.name).join('、')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      合計: ¥{selectedMenus.reduce((sum, m) => sum + m.price, 0).toLocaleString()} / {selectedMenus.reduce((sum, m) => sum + m.duration, 0)}分
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">スタッフ</p>
                    <p className="font-semibold">{selectedStaff?.name || 'スタッフ選択なし'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">日時</p>
                    <p className="font-semibold">{selectedDate} {selectedTime}</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ これはデモ画面です。実際の予約は行われません。
                  </p>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    戻る
                  </button>
                  <button
                    onClick={() => alert('デモモードでは予約できません')}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    予約確定（デモ）
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

