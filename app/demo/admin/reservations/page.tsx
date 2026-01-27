'use client';

import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const mockStaff = [
  { staff_id: 1, name: '山田 花子' },
  { staff_id: 2, name: '佐藤 太郎' },
  { staff_id: 3, name: '鈴木 美咲' }
];

// モックデータ - 1週間分の予約データを生成
const generateMockReservations = () => {
  const reservations = [];
  const baseDate = new Date();
  const customers = ['山田 太郎', '佐藤 花子', '鈴木 一郎', '田中 美咲', '高橋 健太', '伊藤 さくら', '渡辺 大輔', '中村 麻衣', '小林 翔太', '加藤 優香'];
  const menus = [
    { menu_id: 1, menu_name: 'カット', price: 3000, duration: 60 },
    { menu_id: 2, menu_name: 'カラー', price: 5000, duration: 90 },
    { menu_id: 3, menu_name: 'カットカラー', price: 7500, duration: 120 },
    { menu_id: 4, menu_name: 'パーマ', price: 8000, duration: 120 },
    { menu_id: 5, menu_name: 'トリートメント', price: 2000, duration: 30 }
  ];
  const staffIds = [1, 2, 3, null];
  const timeSlots = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
  
  let reservationId = 1;
  
  // 今日から7日間分の予約を生成
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    
    // 各日に3-5件の予約を生成
    const reservationsPerDay = Math.floor(Math.random() * 3) + 3;
    const usedTimes: string[] = [];
    
    for (let i = 0; i < reservationsPerDay; i++) {
      // 利用可能な時間スロットから選択
      const availableTimes = timeSlots.filter(t => !usedTimes.includes(t));
      if (availableTimes.length === 0) break;
      
      const time = availableTimes[Math.floor(Math.random() * availableTimes.length)];
      usedTimes.push(time);
      
      const [hour, minute] = time.split(':').map(Number);
      // JSTとして正しく日時を設定
      const reservationDate = new Date(date);
      reservationDate.setHours(hour, minute, 0, 0);
      
      // JSTとして扱うため、ISO文字列に変換せず、ローカル時間の文字列として保存
      const year = reservationDate.getFullYear();
      const month = String(reservationDate.getMonth() + 1).padStart(2, '0');
      const day = String(reservationDate.getDate()).padStart(2, '0');
      const hours = String(reservationDate.getHours()).padStart(2, '0');
      const minutes = String(reservationDate.getMinutes()).padStart(2, '0');
      const reservationDateStr = `${year}-${month}-${day}T${hours}:${minutes}:00+09:00`;
      
      const menu = menus[Math.floor(Math.random() * menus.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const staffId = staffIds[Math.floor(Math.random() * staffIds.length)];
      
      // 複数メニューの場合（30%の確率）
      const isMultipleMenus = Math.random() < 0.3 && menu.menu_id !== 3;
      let menuData: any;
      let totalPrice = menu.price;
      let totalDuration = menu.duration;
      
      if (isMultipleMenus) {
        const secondMenu = menus.find(m => m.menu_id !== menu.menu_id && m.menu_id !== 3);
        if (secondMenu) {
          menuData = {
            menus: [menu, secondMenu],
            menu_name: `${menu.menu_name} + ${secondMenu.menu_name}`
          };
          totalPrice = menu.price + secondMenu.price;
          totalDuration = menu.duration + secondMenu.duration;
        } else {
          menuData = { menu_name: menu.menu_name, price: menu.price, menu_duration: menu.duration };
        }
      } else {
        menuData = { menu_name: menu.menu_name, price: menu.price, menu_duration: menu.duration };
      }
      
      reservations.push({
        reservation_id: reservationId++,
        reservation_date: reservationDateStr,
        customer_name: customer,
        ...menuData,
        total_price: totalPrice,
        total_duration: totalDuration,
        staff_id: staffId,
        staff_name: staffId ? mockStaff.find(s => s.staff_id === staffId)?.name || null : null,
        status: Math.random() < 0.1 ? 'cancelled' : Math.random() < 0.3 ? 'completed' : 'confirmed'
      });
    }
  }
  
  return reservations;
};

const mockReservations = generateMockReservations();

export default function DemoAdminReservations() {
  const formatTime = (dateString: string) => {
    // JSTとして解釈（+09:00が含まれている場合）
    const date = new Date(dateString);
    // ローカル時間として表示（既にJSTとして設定されているため）
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
  for (let hour = 10; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  timeSlots.push('20:00');

  // 日付とスタッフをキーとして予約をグループ化
  const reservationsByDateAndStaff = weekDates.reduce((acc, date) => {
    // ローカル日付のキーを生成（YYYY-MM-DD形式）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    acc[dateKey] = {
      all: mockReservations.filter(r => {
        const rDate = new Date(r.reservation_date);
        const rYear = rDate.getFullYear();
        const rMonth = String(rDate.getMonth() + 1).padStart(2, '0');
        const rDay = String(rDate.getDate()).padStart(2, '0');
        const rDateKey = `${rYear}-${rMonth}-${rDay}`;
        return rDateKey === dateKey && (!r.staff_id || r.staff_id === null);
      }),
      byStaff: mockStaff.reduce((staffAcc, s) => {
        staffAcc[s.staff_id] = mockReservations.filter(r => {
          const rDate = new Date(r.reservation_date);
          const rYear = rDate.getFullYear();
          const rMonth = String(rDate.getMonth() + 1).padStart(2, '0');
          const rDay = String(rDate.getDate()).padStart(2, '0');
          const rDateKey = `${rYear}-${rMonth}-${rDay}`;
          return rDateKey === dateKey && r.staff_id === s.staff_id;
        });
        return staffAcc;
      }, {} as Record<number, typeof mockReservations>)
    };
    return acc;
  }, {} as Record<string, { all: typeof mockReservations; byStaff: Record<number, typeof mockReservations> }>);

  const getReservationTimeRange = (reservation: typeof mockReservations[0]) => {
    const start = new Date(reservation.reservation_date);
    // JSTとして設定されているため、ローカル時間として取得
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
    
    const top = ((startMinutes - timeToMinutes('10:00')) / minutesPerSlot) * slotHeight;
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
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateKey = `${year}-${month}-${day}`;
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
                    {timeSlots.map((time) => {
                      // 1時間ごと（:00で終わる）はより濃い枠線、30分ごとは薄い枠線
                      const isHourMark = time.endsWith(':00');
                      return (
                        <div
                          key={time}
                          className={`h-10 text-xs text-gray-600 px-2 flex items-center ${
                            isHourMark ? 'border-b border-gray-300' : 'border-b border-gray-100'
                          }`}
                          style={{ height: '40px' }}
                        >
                          {time}
                        </div>
                      );
                    })}
                  </div>
                  
                  {weekDates.map((date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateKey = `${year}-${month}-${day}`;
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
                            {/* 時間スロットの背景線 */}
                            {timeSlots.map((time, index) => {
                              const isHourMark = time.endsWith(':00');
                              return (
                                <div
                                  key={`time-${time}`}
                                  className={`absolute left-0 right-0 ${
                                    isHourMark ? 'border-b border-gray-300' : 'border-b border-gray-100'
                                  }`}
                                  style={{
                                    top: `${index * 40}px`,
                                    height: '40px',
                                    pointerEvents: 'none'
                                  }}
                                ></div>
                              );
                            })}
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
                                        {reservation.menus.map((menu: { menu_id: number; menu_name: string }, idx: number) => (
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
                                {/* 時間スロットの背景線 */}
                                {timeSlots.map((time, index) => {
                                  const isHourMark = time.endsWith(':00');
                                  return (
                                    <div
                                      key={`time-${time}`}
                                      className={`absolute left-0 right-0 ${
                                        isHourMark ? 'border-b border-gray-300' : 'border-b border-gray-100'
                                      }`}
                                      style={{
                                        top: `${index * 40}px`,
                                        height: '40px',
                                        pointerEvents: 'none'
                                      }}
                                    ></div>
                                  );
                                })}
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
                                            {reservation.menus.map((menu: { menu_id: number; menu_name: string }, idx: number) => (
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

