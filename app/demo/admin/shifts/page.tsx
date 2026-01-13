'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const mockStaff = [
  { staff_id: 1, name: '山田 花子' },
  { staff_id: 2, name: '佐藤 太郎' },
  { staff_id: 3, name: '鈴木 美咲' }
];

// モックデータ - シフトデータを生成
const generateMockShifts = () => {
  const shifts: Record<string, Record<number, any>> = {};
  const baseDate = new Date();
  baseDate.setDate(1); // 月初めに設定
  
  // 各スタッフのシフトを生成
  mockStaff.forEach(staff => {
    shifts[staff.staff_id] = {};
    
    // 今月の各日付に対してシフトを生成
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // 日曜日は休み、土曜日は50%の確率で休み
      if (dayOfWeek === 0 || (dayOfWeek === 6 && Math.random() < 0.5)) {
        shifts[staff.staff_id][dateKey] = {
          date: dateKey,
          startTime: null,
          endTime: null,
          isOff: true,
          breakTimes: []
        };
      } else {
        // 通常の勤務時間をランダムに設定
        const startHour = Math.floor(Math.random() * 2) + 10; // 10:00 or 11:00
        const startMinute = Math.random() < 0.5 ? 0 : 30;
        const endHour = Math.floor(Math.random() * 3) + 18; // 18:00, 19:00, or 20:00
        const endMinute = Math.random() < 0.5 ? 0 : 30;
        
        shifts[staff.staff_id][dateKey] = {
          date: dateKey,
          startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
          endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
          isOff: false,
          breakTimes: Math.random() < 0.3 ? [{ start: '13:00', end: '14:00' }] : []
        };
      }
    }
  });
  
  return shifts;
};

const mockShifts = generateMockShifts();

export default function DemoAdminShifts() {
  const currentDate = new Date();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('1');
  const [viewMode, setViewMode] = useState<'table' | 'timetable'>('table');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const dates: string[] = [];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    
    return dates;
  };

  const monthDates = getMonthDates(currentMonth);
  const selectedStaffShifts = selectedStaffId ? mockShifts[parseInt(selectedStaffId)] || {} : {};

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/demo/admin/shifts" title="シフト管理（デモ）" />
      
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

      <div className="w-full mx-auto py-6 sm:px-6 lg:px-8" style={{ maxWidth: '100%' }}>
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 w-full" style={{ maxWidth: '100%' }}>
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">シフト管理（デモ）</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  今日
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <div className="text-lg font-semibold text-gray-900">
                  {formatMonthYear(currentMonth)}
                </div>
              </div>
            </div>

            {/* タブ切り替え */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setViewMode('table')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    viewMode === 'table'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TableCellsIcon className="h-5 w-5" />
                    テーブル表示
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('timetable')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    viewMode === 'timetable'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    タイムテーブル表示
                  </div>
                </button>
              </nav>
            </div>

            {/* 従業員選択 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                従業員 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              >
                {mockStaff.map(s => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {viewMode === 'table' ? (
              /* テーブル表示 */
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left font-semibold">日付</th>
                      <th className="border border-gray-300 p-2 text-left font-semibold">曜日</th>
                      <th className="border border-gray-300 p-2 text-center font-semibold">休み</th>
                      <th className="border border-gray-300 p-2 text-left font-semibold">開始時間</th>
                      <th className="border border-gray-300 p-2 text-left font-semibold">終了時間</th>
                      <th className="border border-gray-300 p-2 text-left font-semibold">勤務時間</th>
                      <th className="border border-gray-300 p-2 text-left font-semibold">休憩時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDates.map((dateKey) => {
                      const shift = selectedStaffShifts[dateKey] || {
                        date: dateKey,
                        startTime: null,
                        endTime: null,
                        isOff: true,
                        breakTimes: []
                      };
                      const dateObj = new Date(dateKey);
                      const dayOfWeek = dateObj.getDay();
                      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      // 勤務時間を計算
                      let workHours = '-';
                      if (shift.startTime && shift.endTime) {
                        const [sh, sm] = shift.startTime.split(':').map(Number);
                        const [eh, em] = shift.endTime.split(':').map(Number);
                        const startMinutes = sh * 60 + sm;
                        const endMinutes = eh * 60 + em;
                        const breakMinutes = shift.breakTimes.reduce((sum: number, bt: any) => {
                          const [bsh, bsm] = bt.start.split(':').map(Number);
                          const [beh, bem] = bt.end.split(':').map(Number);
                          return sum + (beh * 60 + bem - (bsh * 60 + bsm));
                        }, 0);
                        const diffMinutes = endMinutes - startMinutes - breakMinutes;
                        const hours = Math.floor(diffMinutes / 60);
                        const minutes = diffMinutes % 60;
                        workHours = `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
                      }
                      
                      return (
                        <tr
                          key={dateKey}
                          className={isWeekend ? 'bg-red-50' : ''}
                        >
                          <td className="border border-gray-300 p-2">
                            {dateObj.getMonth() + 1}/{dateObj.getDate()}
                          </td>
                          <td className={`border border-gray-300 p-2 ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : ''}`}>
                            {dayNames[dayOfWeek]}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {shift.isOff ? '✓' : '-'}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {shift.startTime || '-'}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {shift.endTime || '-'}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {workHours}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {shift.breakTimes.length > 0
                              ? shift.breakTimes.map((bt: any, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    {bt.start} - {bt.end}
                                  </div>
                                ))
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* タイムテーブル表示 */
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex border-b border-gray-200">
                    <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                      <div className="h-12 border-b border-gray-200 px-2 py-1 flex items-center">
                        <span className="text-xs font-semibold text-gray-900">時間</span>
                      </div>
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <div key={hour} className="h-16 border-b border-gray-100 px-2 py-1">
                          <div className="text-xs text-gray-600">{hour}:00</div>
                          <div className="text-xs text-gray-400 mt-1">{hour}:30</div>
                        </div>
                      ))}
                    </div>
                    {monthDates.map((dateKey) => {
                      const shift = selectedStaffShifts[dateKey] || {
                        date: dateKey,
                        startTime: null,
                        endTime: null,
                        isOff: true,
                        breakTimes: []
                      };
                      const dateObj = new Date(dateKey);
                      const dayOfWeek = dateObj.getDay();
                      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      return (
                        <div
                          key={dateKey}
                          className="flex-1 min-w-[80px] border-r border-gray-200 relative"
                        >
                          <div className={`h-12 border-b border-gray-200 px-2 py-1 flex flex-col items-center justify-center ${isWeekend ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <span className="text-xs font-semibold text-gray-900">
                              {dateObj.getDate()}
                            </span>
                            <span className={`text-xs ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-500'}`}>
                              {dayNames[dayOfWeek]}
                            </span>
                          </div>
                          <div className="relative" style={{ height: '384px' }}>
                            {shift.startTime && shift.endTime && !shift.isOff && (
                              <>
                                {/* 勤務時間 */}
                                {(() => {
                                  const [sh, sm] = shift.startTime.split(':').map(Number);
                                  const [eh, em] = shift.endTime.split(':').map(Number);
                                  const startMinutes = sh * 60 + sm;
                                  const endMinutes = eh * 60 + em;
                                  const top = (startMinutes / 30) * 8;
                                  const height = ((endMinutes - startMinutes) / 30) * 8;
                                  
                                  return (
                                    <div
                                      className="absolute bg-blue-200 border-l-2 border-blue-500 rounded px-1 text-xs"
                                      style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: '2px',
                                        right: '2px',
                                        minHeight: '20px'
                                      }}
                                    >
                                      <div className="font-semibold text-blue-900">
                                        {shift.startTime} - {shift.endTime}
                                      </div>
                                    </div>
                                  );
                                })()}
                                
                                {/* 休憩時間 */}
                                {shift.breakTimes.map((bt: any, idx: number) => {
                                  const [bsh, bsm] = bt.start.split(':').map(Number);
                                  const [beh, bem] = bt.end.split(':').map(Number);
                                  const breakStartMinutes = bsh * 60 + bsm;
                                  const breakEndMinutes = beh * 60 + bem;
                                  const top = (breakStartMinutes / 30) * 8;
                                  const height = ((breakEndMinutes - breakStartMinutes) / 30) * 8;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className="absolute bg-yellow-200 border-l-2 border-yellow-500 rounded px-1 text-xs"
                                      style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: '2px',
                                        right: '2px',
                                        minHeight: '16px'
                                      }}
                                    >
                                      <div className="text-yellow-900">
                                        休憩 {bt.start} - {bt.end}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                            {shift.isOff && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs text-gray-400">休み</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

