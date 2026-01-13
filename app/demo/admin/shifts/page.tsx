'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const mockStaff = [
  { staff_id: 1, name: '山田 花子' },
  { staff_id: 2, name: '佐藤 太郎' },
  { staff_id: 3, name: '鈴木 美咲' }
];

// モックデータ - シフトデータを生成
const generateMockShifts = () => {
  const shifts: Record<number, Record<string, any>> = {};
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

// デモ用の日別タイムテーブルコンポーネント
interface DemoDailyTimeTableProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  mockShifts: Record<number, Record<string, any>>;
  mockStaff: Array<{ staff_id: number; name: string }>;
}

function DemoDailyTimeTable({ 
  selectedDate, 
  onDateChange,
  mockShifts,
  mockStaff 
}: DemoDailyTimeTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const dateStr = selectedDate.toISOString().split('T')[0];
  const dateObj = new Date(selectedDate);
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  
  // 営業時間に基づいて時間スロットを計算（10:00-22:00）
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  
  // 選択した日付のシフトを取得
  const shifts: Record<number, any> = {};
  mockStaff.forEach(staff => {
    const shift = mockShifts[staff.staff_id]?.[dateStr];
    if (shift && shift.startTime && shift.endTime && !shift.isOff) {
      shifts[staff.staff_id] = {
        staff_id: staff.staff_id,
        shift_date: dateStr,
        start_time: shift.startTime,
        end_time: shift.endTime,
        is_off: false,
        break_times: shift.breakTimes || [],
        staff_name: staff.name
      };
    }
  });
  
  // シフトがある従業員のみフィルタ
  const staffWithShifts = mockStaff.filter(s => {
    const shift = shifts[s.staff_id];
    return shift && shift.start_time && shift.end_time && !shift.is_off;
  });
  
  const registeredCount = staffWithShifts.length;
  
  // 時間を分に変換
  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  
  // 分を時間文字列に変換
  const minutesToTime = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };
  
  // X座標から時間を取得
  const getTimeFromX = (x: number) => {
    if (!tableRef.current || timeSlots.length === 0) return null;
    const rect = tableRef.current.getBoundingClientRect();
    const employeeColumnWidth = 150;
    const relativeX = x - rect.left - employeeColumnWidth;
    if (relativeX < 0) return null;
    
    const timeSlotWidth = 120;
    const totalWidth = timeSlots.length * timeSlotWidth;
    const positionPercent = relativeX / totalWidth;
    
    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];
    const [firstHour] = firstSlot.split(':').map(Number);
    const [lastHour] = lastSlot.split(':').map(Number);
    
    if (positionPercent < 0) return firstSlot;
    if (positionPercent > 1) return minutesToTime((lastHour + 1) * 60);
    
    const totalMinutes = (lastHour - firstHour + 1) * 60;
    const minutes = firstHour * 60 + (positionPercent * totalMinutes);
    const hour = Math.floor(minutes / 60);
    const minute = Math.floor((minutes % 60) / 15) * 15;
    
    if (hour < firstHour) return firstSlot;
    if (hour > lastHour + 1) return minutesToTime((lastHour + 1) * 60);
    
    return minutesToTime(hour * 60 + minute);
  };
  
  // シフトブロックの位置と幅を計算
  const getShiftBlockStyle = (startTime: string, endTime: string, startSlotIndex: number) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (startSlotIndex === -1) {
      return { left: '0px', width: '100%', minWidth: '40px' };
    }
    
    const startSlotMinutes = timeToMinutes(timeSlots[startSlotIndex]);
    const offsetInCell = startMinutes - startSlotMinutes;
    
    let endSlotIndex = timeSlots.findIndex(time => {
      const timeMinutes = timeToMinutes(time);
      const nextTimeMinutes = timeMinutes + 60;
      return timeMinutes <= endMinutes && nextTimeMinutes > endMinutes;
    });
    
    if (endSlotIndex === -1) {
      const lastSlotMinutes = timeToMinutes(timeSlots[timeSlots.length - 1]);
      if (endMinutes >= lastSlotMinutes) {
        endSlotIndex = timeSlots.length - 1;
      } else {
        endSlotIndex = 0;
      }
    }
    
    const cellWidth = 120;
    const offsetPx = (offsetInCell / 60) * cellWidth;
    const spanCells = endSlotIndex - startSlotIndex + 1;
    
    const endSlotMinutes = timeToMinutes(timeSlots[endSlotIndex]);
    const endOffsetInCell = endMinutes - endSlotMinutes;
    
    if (endOffsetInCell === 0) {
      if (endSlotIndex > startSlotIndex) {
        endSlotIndex = endSlotIndex - 1;
        const endOffsetPx = cellWidth;
        const spanCells = endSlotIndex - startSlotIndex + 1;
        const widthPx = (spanCells * cellWidth) - offsetPx + endOffsetPx;
        
        return {
          left: `${offsetPx}px`,
          width: `${widthPx}px`,
          minWidth: '40px'
        };
      } else {
        const widthPx = cellWidth - offsetPx;
        return {
          left: `${offsetPx}px`,
          width: `${widthPx}px`,
          minWidth: '40px'
        };
      }
    }
    
    const endOffsetPx = Math.min((endOffsetInCell / 60) * cellWidth, cellWidth);
    const widthPx = (spanCells * cellWidth) - offsetPx + endOffsetPx;
    
    return {
      left: `${offsetPx}px`,
      width: `${widthPx}px`,
      minWidth: '40px'
    };
  };
  
  // 休憩ブロックの位置と幅を計算
  const getBreakBlockStyle = (startTime: string, endTime: string, shiftStartTime: string, shiftEndTime: string) => {
    const breakStartMinutes = timeToMinutes(startTime);
    const breakEndMinutes = timeToMinutes(endTime);
    const shiftStartMinutes = timeToMinutes(shiftStartTime);
    const shiftEndMinutes = timeToMinutes(shiftEndTime);
    
    const startOffset = breakStartMinutes - shiftStartMinutes;
    const duration = breakEndMinutes - breakStartMinutes;
    const shiftDuration = shiftEndMinutes - shiftStartMinutes;
    
    const leftPercent = (startOffset / shiftDuration) * 100;
    const widthPercent = (duration / shiftDuration) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      top: '8px',
      bottom: '8px',
      height: 'auto',
      minWidth: '20px'
    };
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full" ref={tableRef} style={{ maxWidth: '100%', overflow: 'visible' }}>
      {/* ヘッダー */}
      <div className="mb-4">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold">
                {dateObj.getMonth() + 1}月{dateObj.getDate()}日のシフト
              </div>
              <div className="text-sm mt-1">シフト登録者: {registeredCount}名</div>
            </div>
            <button
              onClick={() => onDateChange(new Date())}
              className="text-white hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="bg-blue-500 text-white px-4 py-2 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold">
              タイムテーブル - {dateObj.getMonth() + 1}月{dateObj.getDate()}日 ({dayOfWeek})
            </div>
            <div className="text-sm">シフト登録者: {registeredCount}名</div>
          </div>
        </div>
      </div>

      {/* タイムテーブル */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg w-full">
        <table className="border-collapse" style={{ minWidth: `${150 + timeSlots.length * 120}px`, width: 'auto' }}>
          <thead>
            <tr className="bg-blue-600 border-b border-blue-700">
              <th className="border-r border-blue-700 p-3 text-left font-semibold bg-blue-600 text-white sticky left-0 z-20 shadow-lg" style={{ minWidth: '150px', width: '150px' }}>
                従業員名
              </th>
              {timeSlots.map((time) => (
                <th
                  key={time}
                  className="border-r border-blue-700 p-2 text-center font-semibold text-white text-sm bg-blue-600"
                  style={{ minWidth: '120px', width: '120px' }}
                >
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ position: 'relative' }}>
            {staffWithShifts.map((s, staffIndex) => {
              const shift = shifts[s.staff_id];
              if (!shift || !shift.start_time || !shift.end_time || shift.is_off) return null;

              const breakTimes = Array.isArray(shift.break_times) ? shift.break_times : [];
              
              // 開始時間がどのセルに該当するかを計算
              const startMinutes = shift.start_time ? timeToMinutes(shift.start_time) : 0;
              const startSlotIndex = shift.start_time ? timeSlots.findIndex(time => {
                const timeMinutes = timeToMinutes(time);
                const nextTimeMinutes = timeMinutes + 60;
                return timeMinutes <= startMinutes && nextTimeMinutes > startMinutes;
              }) : -1;
              
              return (
                <tr key={s.staff_id} className="border-b border-gray-200 relative" style={{ height: '120px', position: 'relative' }}>
                  <td className="border-r border-gray-300 p-3 bg-gray-50 sticky left-0 z-10 font-medium shadow-md" style={{ minWidth: '150px', width: '150px' }}>
                    {s.name}
                  </td>
                  {timeSlots.map((time, timeIndex) => {
                    if (!shift.start_time || !shift.end_time) return null;
                    
                    const timeMinutes = timeToMinutes(time);
                    const startMinutes = timeToMinutes(shift.start_time);
                    const endMinutes = timeToMinutes(shift.end_time);
                    const isInShift = timeMinutes >= startMinutes && timeMinutes < endMinutes;
                    const isStartCell = startSlotIndex === timeIndex;
                    const isWorkingTime = isInShift;
                    
                    return (
                      <td
                        key={`${s.staff_id}-${time}`}
                        className={`border-r border-gray-200 p-0 ${
                          isWorkingTime ? 'bg-blue-50' : 'bg-white'
                        }`}
                        style={{ height: '120px', minWidth: '120px', width: '120px', position: 'relative', overflow: 'visible' }}
                      >
                        {/* シフト開始時間のセルにシフトブロックを表示 */}
                        {isStartCell && (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded shadow-lg z-20 group border-2 border-white"
                            style={{
                              ...getShiftBlockStyle(shift.start_time, shift.end_time, startSlotIndex),
                              position: 'absolute'
                            }}
                          >
                            {/* シフト内容 */}
                            <div className="p-1 h-full flex flex-col justify-center items-start pl-2">
                              <div className="font-semibold text-xs text-white whitespace-nowrap">
                                {shift.start_time} - {shift.end_time}
                              </div>
                            </div>

                            {/* 休憩時間 */}
                            {breakTimes.map((breakTime: { start: string; end: string }, idx: number) => {
                              if (!shift.start_time || !shift.end_time) return null;
                              
                              const breakStartMinutes = timeToMinutes(breakTime.start);
                              const breakEndMinutes = timeToMinutes(breakTime.end);
                              
                              if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
                                return null;
                              }

                              return (
                                <div
                                  key={idx}
                                  className="absolute bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs rounded z-30 group/break border-2 border-white shadow-md"
                                  style={getBreakBlockStyle(breakTime.start, breakTime.end, shift.start_time, shift.end_time)}
                                >
                                  <div className="p-1 h-full flex items-center justify-center relative">
                                    <div className="text-xs text-white whitespace-nowrap font-semibold pointer-events-none">
                                      {breakTime.start}-{breakTime.end}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 閉じるボタン */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onDateChange(new Date())}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function DemoAdminShifts() {
  const currentDate = new Date();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('1');
  const [viewMode, setViewMode] = useState<'table' | 'timetable' | 'daily'>('table');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDailyDate, setSelectedDailyDate] = useState<Date | null>(null);

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
                <button
                  onClick={() => {
                    setViewMode('daily');
                    if (!selectedDailyDate) {
                      setSelectedDailyDate(new Date());
                    }
                  }}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    viewMode === 'daily'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    日別タイムテーブル
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

            {viewMode === 'daily' ? (
              /* 日別タイムテーブル表示 */
              selectedDailyDate ? (
                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      表示日付
                    </label>
                    <input
                      type="date"
                      value={selectedDailyDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDailyDate(new Date(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  <DemoDailyTimeTable
                    selectedDate={selectedDailyDate}
                    onDateChange={(date) => {
                      setSelectedDailyDate(date);
                      if (date.getTime() === new Date().getTime()) {
                        setViewMode('table');
                        setSelectedDailyDate(null);
                      }
                    }}
                    mockShifts={mockShifts}
                    mockStaff={mockStaff}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">日付を選択してください</p>
                  <input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDailyDate(new Date(e.target.value));
                      setViewMode('daily');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              )
            ) : viewMode === 'table' ? (
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
                    {/* 時間列（10:00-20:00） */}
                    <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                      <div className="h-12 border-b border-gray-200 px-2 py-1 flex items-center">
                        <span className="text-xs font-semibold text-gray-900">時間</span>
                      </div>
                      {Array.from({ length: 11 }, (_, i) => i + 10).map(hour => (
                        <div key={hour} className="h-16 border-b border-gray-100 px-2 py-1">
                          <div className="text-xs text-gray-600">{hour}:00</div>
                          <div className="text-xs text-gray-400 mt-1">{hour}:30</div>
                        </div>
                      ))}
                    </div>
                    {/* 日付列 */}
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
                      
                      // 時間を分に変換（10:00を基準に0分とする）
                      const timeToMinutes = (time: string) => {
                        if (!time) return 0;
                        const [hour, minute] = time.split(':').map(Number);
                        return (hour - 10) * 60 + minute;
                      };
                      
                      // breakTimesが配列でない場合は空配列にする
                      const breakTimes = Array.isArray(shift.breakTimes) ? shift.breakTimes : [];
                      
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
                          {/* タイムテーブル本体（10:00-20:00 = 10時間 = 600分 = 20スロット） */}
                          <div className="relative" style={{ height: '320px' }}>
                            {shift.startTime && shift.endTime && !shift.isOff && (
                              <>
                                {/* 勤務時間 */}
                                {(() => {
                                  const startMinutes = timeToMinutes(shift.startTime);
                                  const endMinutes = timeToMinutes(shift.endTime);
                                  const slotHeight = 16; // 30分 = 16px
                                  const top = (startMinutes / 30) * slotHeight;
                                  const height = ((endMinutes - startMinutes) / 30) * slotHeight;
                                  
                                  return (
                                    <div
                                      className="absolute bg-blue-200 border-l-2 border-blue-500 rounded px-1 text-xs z-10"
                                      style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: '2px',
                                        right: '2px',
                                        minHeight: '20px'
                                      }}
                                    >
                                      <div className="font-semibold text-blue-900 whitespace-nowrap">
                                        {shift.startTime} - {shift.endTime}
                                      </div>
                                    </div>
                                  );
                                })()}
                                
                                {/* 休憩時間 */}
                                {breakTimes.map((bt: any, idx: number) => {
                                  if (!bt || !bt.start || !bt.end) return null;
                                  const breakStartMinutes = timeToMinutes(bt.start);
                                  const breakEndMinutes = timeToMinutes(bt.end);
                                  const slotHeight = 16; // 30分 = 16px
                                  const top = (breakStartMinutes / 30) * slotHeight;
                                  const height = ((breakEndMinutes - breakStartMinutes) / 30) * slotHeight;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className="absolute bg-yellow-200 border-l-2 border-yellow-500 rounded px-1 text-xs z-20"
                                      style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: '2px',
                                        right: '2px',
                                        minHeight: '16px'
                                      }}
                                    >
                                      <div className="text-yellow-900 whitespace-nowrap">
                                        休憩 {bt.start} - {bt.end}
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                            {shift.isOff && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-50">
                                <span className="text-xs text-gray-400 font-medium">休み</span>
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

