'use client';

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BreakTime {
  start: string;
  end: string;
}

interface ShiftData {
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakTimes: BreakTime[];
  isOff: boolean;
}

interface TimeTableProps {
  shifts: Record<string, ShiftData>;
  onUpdate: (date: string, shift: ShiftData) => void;
  currentDate: Date;
  selectedStaffId: string;
}

export default function TimeTable({ shifts, onUpdate, currentDate, selectedStaffId }: TimeTableProps) {
  const [dragging, setDragging] = useState<{ type: 'shift' | 'break'; date: string; startY: number } | null>(null);
  const [editingBreak, setEditingBreak] = useState<{ date: string; index: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // 時間スロット（0:00-24:00、30分刻み）
  const timeSlots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // 月の日付を生成
  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: string[] = [];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    
    return dates;
  };

  const monthDates = getMonthDates();

  // 時間を分に変換
  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };

  // 分を時間文字列に変換
  const minutesToTime = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Y座標から時間を取得
  const getTimeFromY = (y: number) => {
    if (!tableRef.current) return null;
    const rect = tableRef.current.getBoundingClientRect();
    const relativeY = y - rect.top - 60; // ヘッダー分を引く
    const slotHeight = 30; // 各時間スロットの高さ（px）
    const minutesPerSlot = 30;
    const totalMinutes = (relativeY / slotHeight) * minutesPerSlot;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    if (hours < 0 || hours >= 24) return null;
    return minutesToTime(hours * 60 + minutes);
  };

  // 時間ブロックの位置と高さを計算
  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const slotHeight = 30;
    const minutesPerSlot = 30;
    
    // 開始時間を基準にした位置（0:00からの分を計算）
    const top = (startMinutes / minutesPerSlot) * slotHeight;
    const height = ((endMinutes - startMinutes) / minutesPerSlot) * slotHeight;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '20px'
    };
  };

  // マウスダウン（ドラッグ開始）
  const handleMouseDown = (e: React.MouseEvent, type: 'shift' | 'break', date: string, breakIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ type, date, startY: e.clientY });
  };

  // シフトブロックの端をドラッグして時間を調整
  const handleShiftResize = (date: string, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shift = shifts[date];
    if (!shift || !shift.startTime || !shift.endTime) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromY(moveEvent.clientY);
      if (!time) return;

      const updatedShift = { ...shift };
      if (edge === 'start' && shift.endTime) {
        const endMinutes = timeToMinutes(shift.endTime);
        const newStartMinutes = timeToMinutes(time);
        if (newStartMinutes < endMinutes) {
          updatedShift.startTime = time;
        }
      } else if (edge === 'end' && shift.startTime) {
        const startMinutes = timeToMinutes(shift.startTime);
        const newEndMinutes = timeToMinutes(time);
        if (newEndMinutes > startMinutes) {
          updatedShift.endTime = time;
        }
      }
      onUpdate(date, updatedShift);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // セルをクリックしてシフトを追加
  const handleCellClick = (date: string, time: string) => {
    const shift = shifts[date] || {
      date,
      startTime: null,
      endTime: null,
      breakTimes: [],
      isOff: false
    };

    // 既にシフトがある場合は上書き
    if (shift.startTime && shift.endTime) {
      // クリックした時間が既存のシフト時間内の場合は、シフトを削除
      const clickMinutes = timeToMinutes(time);
      const startMinutes = timeToMinutes(shift.startTime);
      const endMinutes = timeToMinutes(shift.endTime);
      
      if (clickMinutes >= startMinutes && clickMinutes <= endMinutes) {
        // シフトを削除
        onUpdate(date, {
          date,
          startTime: null,
          endTime: null,
          breakTimes: [],
          isOff: false
        });
        return;
      }
    }

    if (!shift.startTime) {
      shift.startTime = time;
      shift.endTime = minutesToTime(timeToMinutes(time) + 480); // デフォルト8時間
    } else if (!shift.endTime) {
      const startMinutes = timeToMinutes(shift.startTime);
      const clickMinutes = timeToMinutes(time);
      if (clickMinutes > startMinutes) {
        shift.endTime = time;
      } else {
        // 開始時間より前をクリックした場合は開始時間を更新
        shift.startTime = time;
        shift.endTime = minutesToTime(timeToMinutes(time) + 480);
      }
    } else {
      // 既にシフトがある場合は、新しいシフトとして開始
      shift.startTime = time;
      shift.endTime = minutesToTime(timeToMinutes(time) + 480);
    }

    onUpdate(date, shift);
  };

  // 休憩時間を追加
  const handleAddBreak = (date: string) => {
    const shift = shifts[date] || {
      date,
      startTime: null,
      endTime: null,
      breakTimes: [],
      isOff: false
    };

    if (!shift.startTime || !shift.endTime) {
      alert('まず勤務時間を設定してください');
      return;
    }

    const newBreak: BreakTime = {
      start: minutesToTime(timeToMinutes(shift.startTime) + 240), // デフォルト4時間後
      end: minutesToTime(timeToMinutes(shift.startTime) + 300) // 1時間休憩
    };

    shift.breakTimes.push(newBreak);
    onUpdate(date, shift);
    setEditingBreak({ date, index: shift.breakTimes.length - 1 });
  };

  // 休憩時間を削除
  const handleDeleteBreak = (date: string, index: number) => {
    const shift = shifts[date];
    if (!shift) return;

    shift.breakTimes.splice(index, 1);
    onUpdate(date, shift);
  };

  // 休憩時間を更新
  const handleBreakTimeChange = (date: string, index: number, field: 'start' | 'end', value: string) => {
    const shift = shifts[date];
    if (!shift) return;

    shift.breakTimes[index][field] = value;
    onUpdate(date, shift);
  };

  return (
    <div className="overflow-x-auto" ref={tableRef}>
      <div className="inline-block min-w-full">
        {/* ヘッダー */}
        <div className="flex border-b border-gray-300 sticky top-0 bg-white z-10">
          <div className="w-24 border-r border-gray-300 p-2 font-semibold bg-gray-50">
            時間
          </div>
          {monthDates.map((date) => {
            const dateObj = new Date(date);
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
            const isWeekend = dayOfWeek === '日' || dayOfWeek === '土';
            
            return (
              <div
                key={date}
                className={`flex-1 min-w-[120px] border-r border-gray-300 p-2 text-center ${
                  isWeekend ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className={`text-sm font-semibold ${isWeekend ? 'text-red-600' : 'text-gray-900'}`}>
                  {dateObj.getMonth() + 1}/{dateObj.getDate()}
                </div>
                <div className={`text-xs ${isWeekend ? 'text-red-500' : 'text-gray-600'}`}>
                  {dayOfWeek}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間スロット */}
        <div className="relative" style={{ height: `${timeSlots.length * 30}px` }}>
          {timeSlots.map((time, index) => (
            <div
              key={time}
              className="flex border-b border-gray-200"
              style={{ height: '30px' }}
            >
              {/* 時間ラベル */}
              <div className="w-24 border-r border-gray-300 p-1 text-xs text-gray-600 bg-gray-50 flex items-center">
                {index % 2 === 0 && time}
              </div>

              {/* 各日のセル */}
              {monthDates.map((date) => {
                const shift = shifts[date];
                const hasShift = shift && shift.startTime && shift.endTime && !shift.isOff;
                
                return (
                  <div
                    key={`${date}-${time}`}
                    className="flex-1 min-w-[120px] border-r border-gray-200 relative cursor-pointer hover:bg-gray-50"
                    onClick={() => handleCellClick(date, time)}
                    style={{ height: '30px' }}
                  >
                    {/* シフト時間ブロック */}
                    {hasShift && time === shift.startTime && shift.startTime && shift.endTime && (
                      <div
                        className="absolute left-0 right-0 bg-blue-500 text-white text-xs rounded z-20 group"
                        style={getBlockStyle(shift.startTime, shift.endTime)}
                      >
                        {/* 開始時間リサイズハンドル */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2 bg-blue-600 cursor-ns-resize hover:bg-blue-700"
                          onMouseDown={(e) => handleShiftResize(date, 'start', e)}
                        />
                        
                        {/* シフト内容 */}
                        <div className="p-1 h-full overflow-y-auto">
                          <div className="font-semibold">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          {/* 休憩時間 */}
                          {shift.startTime && shift.breakTimes.map((breakTime, idx) => {
                            if (!shift.startTime) return null;
                            
                            const breakStartMinutes = timeToMinutes(breakTime.start);
                            const breakEndMinutes = timeToMinutes(breakTime.end);
                            const shiftStartMinutes = timeToMinutes(shift.startTime);
                            
                            return (
                              <div
                                key={idx}
                                className="absolute bg-orange-400 text-white text-xs p-1 rounded mt-1 group/break"
                                style={{
                                  top: `${((breakStartMinutes - shiftStartMinutes) / 30) * 30}px`,
                                  height: `${((breakEndMinutes - breakStartMinutes) / 30) * 30}px`,
                                  left: '4px',
                                  right: '4px',
                                  minHeight: '20px'
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  // 休憩時間のドラッグ（実装は後で）
                                }}
                              >
                                {/* 休憩開始時間リサイズハンドル */}
                                <div
                                  className="absolute top-0 left-0 right-0 h-1 bg-orange-500 cursor-ns-resize hover:bg-orange-600 opacity-0 group-hover/break:opacity-100"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    // 休憩開始時間の調整
                                  }}
                                />
                                
                                <div className="flex justify-between items-center h-full">
                                  <span className="text-xs">{breakTime.start} - {breakTime.end}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBreak(date, idx);
                                    }}
                                    className="text-white hover:text-red-200 opacity-0 group-hover/break:opacity-100 transition-opacity"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </div>
                                
                                {/* 休憩終了時間リサイズハンドル */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 cursor-ns-resize hover:bg-orange-600 opacity-0 group-hover/break:opacity-100"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    // 休憩終了時間の調整
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* 終了時間リサイズハンドル */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 bg-blue-600 cursor-ns-resize hover:bg-blue-700"
                          onMouseDown={(e) => handleShiftResize(date, 'end', e)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 休憩時間追加ボタン */}
        <div className="mt-4 flex gap-2">
          {monthDates.map((date) => {
            const shift = shifts[date];
            const hasShift = shift && shift.startTime && shift.endTime && !shift.isOff;
            
            return (
              <div key={date} className="flex-1 min-w-[120px]">
                {hasShift && (
                  <button
                    onClick={() => handleAddBreak(date)}
                    className="w-full px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    休憩追加
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

