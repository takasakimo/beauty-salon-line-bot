'use client';

import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

// モックデータ
const mockReservations = [
  {
    reservation_id: 1,
    reservation_date: '2025-01-15T14:00:00+09:00',
    customer_name: '山田 太郎',
    menu_name: 'カットカラー',
    menus: [
      { menu_id: 1, menu_name: 'カット', price: 3000, duration: 60 },
      { menu_id: 2, menu_name: 'カラー', price: 5000, duration: 90 }
    ],
    total_price: 8000,
    total_duration: 150,
    staff_id: 1,
    staff_name: '山田 花子',
    status: 'confirmed'
  },
  {
    reservation_id: 2,
    reservation_date: '2025-01-15T10:00:00+09:00',
    customer_name: '佐藤 花子',
    menu_name: 'カット',
    price: 3000,
    menu_duration: 60,
    staff_id: 2,
    staff_name: '佐藤 太郎',
    status: 'confirmed'
  },
  {
    reservation_id: 3,
    reservation_date: '2025-01-15T16:00:00+09:00',
    customer_name: '鈴木 一郎',
    menu_name: 'パーマ',
    price: 8000,
    menu_duration: 120,
    staff_id: null,
    staff_name: null,
    status: 'confirmed'
  }
];

const mockStaff = [
  { staff_id: 1, name: '山田 花子' },
  { staff_id: 2, name: '佐藤 太郎' },
  { staff_id: 3, name: '鈴木 美咲' }
];

export default function DemoAdminReservations() {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayName})`;
  };

  // 1週間分の日付を生成
  const getWeekDates = () => {
    const dates = [];
    const baseDate = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const timeSlots: string[] = [];
  for (let hour = 9; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // 日付とスタッフをキーとして予約をグループ化
  const reservationsByDateAndStaff = weekDates.reduce((acc, date) => {
    const dateKey = date.toISOString().split('T')[0];
    acc[dateKey] = {
      all: mockReservations.filter(r => {
        const rDate = new Date(r.reservation_date);
        const rDateKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
        return rDateKey === dateKey && (!r.staff_id || r.staff_id === null);
      }),
      byStaff: mockStaff.reduce((staffAcc, s) => {
        staffAcc[s.staff_id] = mockReservations.filter(r => {
          const rDate = new Date(r.reservation_date);
          const rDateKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
          return rDateKey === dateKey && r.staff_id === s.staff_id;
        });
        return staffAcc;
      }, {} as Record<number, typeof mockReservations>)
    };
    return acc;
  }, {} as Record<string, { all: typeof mockReservations; byStaff: Record<number, typeof mockReservations> }>);

  const getReservationTimeRange = (reservation: typeof mockReservations[0]) => {
    const start = new Date(reservation.reservation_date);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = reservation.total_duration || reservation.menu_duration || 60;
    const endMinutes = startMinutes + duration;
    return { startMinutes, endMinutes, start, duration };
  };

  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };

  const getReservationStyle = (reservation: typeof mockReservations[0]) => {
    const { startMinutes, duration } = getReservationTimeRange(reservation);
    const slotHeight = 40;
    const minutesPerSlot = 30;
    
    const top = ((startMinutes - timeToMinutes('09:00')) / minutesPerSlot) * slotHeight;
    const height = Math.max((duration / minutesPerSlot) * slotHeight, 60);
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '60px'
    };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/demo/admin/reservations" title="スケジュール管理（デモ）" />
      
      {/* デモバナー */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 mt-4 rounded">
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">スケジュール一覧（デモ）</h2>

            {/* タイムライン表示 */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* 日付ヘッダー行 */}
                <div className="flex border-b border-gray-200">
                  <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                    <div className="h-12 border-b border-gray-200"></div>
                  </div>
                  
                  {weekDates.map((date) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const dayData = reservationsByDateAndStaff[dateKey] || { all: [], byStaff: {} };
                    const totalCount = dayData.all.length + Object.values(dayData.byStaff).reduce((sum, arr) => sum + arr.length, 0);
                    const columnCount = 1 + mockStaff.length;
                    
                    return (
                      <div 
                        key={dateKey}
                        className="border-r border-gray-200 bg-gray-50"
                        style={{ 
                          flex: `0 0 ${columnCount * 100}px`,
                          minWidth: `${columnCount * 100}px`,
                          width: `${columnCount * 100}px`
                        }}
                      >
                        <div className="h-12 border-b border-gray-200 px-2 py-1 flex items-center justify-center relative">
                          <div className="flex items-center">
                            <CalendarDaysIcon className="h-3 w-3 text-pink-600 mr-1" />
                            <span className="text-xs font-semibold text-gray-900">
                              {formatDate(date)}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({totalCount})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 列ヘッダー行 */}
                <div className="flex border-b border-gray-200">
                  <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                    <div className="h-10 border-b border-gray-200"></div>
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="h-10 border-b border-gray-100 text-xs text-gray-600 px-2 flex items-center"
                        style={{ height: '40px' }}
                      >
                        {time}
                      </div>
                    ))}
                  </div>
                  
                  {weekDates.map((date) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const dayData = reservationsByDateAndStaff[dateKey] || { all: [], byStaff: {} };
                    
                    return (
                      <div key={dateKey} className="flex border-r border-gray-200">
                        {/* 店舗全体の列 */}
                        <div className="flex-1 min-w-[100px] border-r border-gray-200 relative">
                          <div className="h-10 border-b border-gray-200 bg-blue-50 px-2 py-1 flex items-center">
                            <span className="text-xs font-semibold text-gray-900">店舗全体</span>
                            <span className="ml-1 text-xs text-gray-500">({dayData.all.length})</span>
                          </div>
                          
                          <div className="relative" style={{ height: `${timeSlots.length * 40}px` }}>
                            {dayData.all.map((reservation) => {
                              const style = getReservationStyle(reservation);
                              return (
                                <div
                                  key={reservation.reservation_id}
                                  className="absolute rounded p-1 shadow-sm border-l-2 bg-pink-50 border-pink-400"
                                  style={{ ...style, marginLeft: '2px', marginRight: '2px', width: 'calc(100% - 4px)' }}
                                >
                                  <div className="text-xs font-semibold text-gray-900 mb-0.5">
                                    {formatTime(reservation.reservation_date)}
                                  </div>
                                  <div className="text-xs text-gray-700 font-medium mb-0.5">
                                    {reservation.customer_name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {reservation.menus && reservation.menus.length > 1 ? (
                                      <div>
                                        {reservation.menus.map((menu, idx) => (
                                          <div key={menu.menu_id} className="truncate">
                                            {idx > 0 && ' + '}
                                            {menu.menu_name}
                                          </div>
                                        ))}
                                        <div className="mt-0.5 font-semibold text-xs">
                                          ¥{(reservation.total_price || 0).toLocaleString()}
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="truncate">{reservation.menu_name}</div>
                                        <div className="mt-0.5 text-xs">
                                          ¥{(reservation.total_price || reservation.price || 0).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 各スタッフの列 */}
                        {mockStaff.map((s) => {
                          const staffReservations = dayData.byStaff[s.staff_id] || [];
                          
                          return (
                            <div 
                              key={s.staff_id} 
                              className="flex-1 min-w-[100px] border-r border-gray-200 relative"
                            >
                              <div className="h-10 border-b border-gray-200 px-2 py-1 flex items-center bg-purple-50">
                                <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                                <span className="ml-1 text-xs text-gray-500">({staffReservations.length})</span>
                              </div>
                              
                              <div className="relative" style={{ height: `${timeSlots.length * 40}px` }}>
                                {staffReservations.map((reservation) => {
                                  const style = getReservationStyle(reservation);
                                  return (
                                    <div
                                      key={reservation.reservation_id}
                                      className="absolute rounded p-1 shadow-sm border-l-2 bg-pink-50 border-pink-400"
                                      style={{ ...style, marginLeft: '2px', marginRight: '2px', width: 'calc(100% - 4px)' }}
                                    >
                                      <div className="text-xs font-semibold text-gray-900 mb-0.5">
                                        {formatTime(reservation.reservation_date)}
                                      </div>
                                      <div className="text-xs text-gray-700 font-medium mb-0.5">
                                        {reservation.customer_name}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {reservation.menus && reservation.menus.length > 1 ? (
                                          <div>
                                            {reservation.menus.map((menu, idx) => (
                                              <div key={menu.menu_id} className="truncate">
                                                {idx > 0 && ' + '}
                                                {menu.menu_name}
                                              </div>
                                            ))}
                                            <div className="mt-0.5 font-semibold text-xs">
                                              ¥{(reservation.total_price || 0).toLocaleString()}
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="truncate">{reservation.menu_name}</div>
                                            <div className="mt-0.5 text-xs">
                                              ¥{(reservation.total_price || reservation.price || 0).toLocaleString()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

