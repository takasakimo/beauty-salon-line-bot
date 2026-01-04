'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Staff {
  staff_id: number;
  name: string;
}

interface Shift {
  shift_id?: number;
  staff_id: number;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
  break_times?: Array<{ start: string; end: string }> | string;
  staff_name?: string;
}

interface DailyTimeTableProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  getApiUrlWithTenantId: (path: string) => string;
}

export default function DailyTimeTable({ 
  selectedDate, 
  onDateChange,
  getApiUrlWithTenantId 
}: DailyTimeTableProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Record<number, Shift>>({});
  const [loading, setLoading] = useState(true);
  const [draggingShift, setDraggingShift] = useState<{ staffId: number; edge: 'start' | 'end' } | null>(null);
  const [draggingBreak, setDraggingBreak] = useState<{ staffId: number; breakIndex: number; edge: 'start' | 'end' } | null>(null);
  const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string; isOpen?: boolean }>>({});
  const [specialBusinessHours, setSpecialBusinessHours] = useState<Record<string, { open: string; close: string }>>({});
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // 営業時間を取得
  useEffect(() => {
    loadBusinessHours();
  }, []);

  // 営業時間と日付が変更されたら時間スロットを再計算
  useEffect(() => {
    calculateTimeSlots();
  }, [selectedDate, businessHours, specialBusinessHours]);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (staff.length > 0 && timeSlots.length > 0) {
      loadShifts();
    }
  }, [selectedDate, staff, timeSlots]);

  // 営業時間を取得
  const loadBusinessHours = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/settings');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBusinessHours(data.business_hours || {});
        setSpecialBusinessHours(data.special_business_hours || {});
      }
    } catch (error) {
      console.error('営業時間取得エラー:', error);
      // デフォルト値を設定
      setBusinessHours({});
      setSpecialBusinessHours({});
    }
  };

  // 選択された日付の営業時間を取得
  const getDayBusinessHours = () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // 特別営業時間があればそれを使用
    if (specialBusinessHours[dateStr]) {
      return specialBusinessHours[dateStr];
    }

    // 曜日の営業時間を使用
    const dayHours = businessHours[dayName] || businessHours[dayOfWeek.toString()] || businessHours['default'];
    
    if (dayHours && dayHours.isOpen !== false) {
      return { open: dayHours.open || '10:00', close: dayHours.close || '19:00' };
    }

    // デフォルト値
    return { open: '10:00', close: '19:00' };
  };

  // 営業時間に基づいて時間スロットを計算
  const calculateTimeSlots = () => {
    const dayHours = getDayBusinessHours();
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
    
    // 開始時間を1時間前に、終了時間を1時間後に拡張（余裕を持たせる）
    // また、シフトの終了時間が営業時間を超える場合にも対応できるように、最大22時まで表示
    const startHour = Math.max(0, openHour - 1);
    const endHour = Math.max(Math.min(23, closeHour + 1), 22); // 最低でも22時まで表示
    
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    setTimeSlots(slots);
  };

  const loadStaff = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/staff');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const startDate = dateStr;
      const endDate = dateStr;

      const url = getApiUrlWithTenantId(`/api/admin/shifts?start_date=${startDate}&end_date=${endDate}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: Shift[] = await response.json();
        const shiftsMap: Record<number, Shift> = {};
        
        data.forEach(shift => {
          // 時間フォーマットを正規化（HH:MM:SS -> HH:MM）
          const normalizedShift = {
            ...shift,
            start_time: shift.start_time ? shift.start_time.substring(0, 5) : null,
            end_time: shift.end_time ? shift.end_time.substring(0, 5) : null,
          };
          shiftsMap[shift.staff_id] = normalizedShift;
        });
        
        console.log('Loaded shifts:', shiftsMap); // デバッグ用

        // シフトがない従業員も含める
        staff.forEach(s => {
          if (!shiftsMap[s.staff_id]) {
            shiftsMap[s.staff_id] = {
              staff_id: s.staff_id,
              shift_date: dateStr,
              start_time: null,
              end_time: null,
              is_off: false,
              break_times: [],
              staff_name: s.name
            };
          }
        });

        setShifts(shiftsMap);
      }
    } catch (error) {
      console.error('シフト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 時間を分に変換（HH:MM:SS形式にも対応）
  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const parts = time.split(':');
    const hour = parseInt(parts[0] || '0', 10);
    const minute = parseInt(parts[1] || '0', 10);
    return hour * 60 + minute;
  };

  // 分を時間文字列に変換
  const minutesToTime = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // X座標から時間を取得（横軸のタイムテーブル用）
  const getTimeFromX = (x: number) => {
    if (!tableRef.current || timeSlots.length === 0) return null;
    const rect = tableRef.current.getBoundingClientRect();
    const employeeColumnWidth = 120; // 従業員名列の幅
    
    // テーブル内の相対X座標（従業員名列を除く）
    const relativeX = x - rect.left - employeeColumnWidth;
    if (relativeX < 0) return null;
    
    // 時間列の幅を計算（各時間セルの幅）
    const timeSlotWidth = 80; // 各時間セルの幅（min-w-[80px]）
    const totalWidth = timeSlots.length * timeSlotWidth;
    
    // 時間列内での位置を計算
    const positionPercent = relativeX / totalWidth;
    
    // 最初と最後の時間スロットを取得
    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];
    const [firstHour] = firstSlot.split(':').map(Number);
    const [lastHour] = lastSlot.split(':').map(Number);
    
    // 範囲外の場合は、最初または最後の時間を返す
    if (positionPercent < 0) {
      return firstSlot;
    }
    if (positionPercent > 1) {
      // 最後の時間スロットの1時間後まで許容
      return minutesToTime((lastHour + 1) * 60);
    }
    
    const totalMinutes = (lastHour - firstHour + 1) * 60; // 時間スロットの範囲
    const minutes = firstHour * 60 + (positionPercent * totalMinutes);
    
    const hour = Math.floor(minutes / 60);
    const minute = Math.floor((minutes % 60) / 30) * 30; // 30分刻み
    
    // 範囲を超える場合は、最後の時間スロットの1時間後まで許容
    if (hour < firstHour) {
      return firstSlot;
    }
    if (hour > lastHour + 1) {
      return minutesToTime((lastHour + 1) * 60);
    }
    
    return minutesToTime(hour * 60 + minute);
  };

  // シフトブロックの位置と幅を計算（開始セルのtdを基準、複数セルにまたがる）
  const getShiftBlockStyle = (startTime: string, endTime: string, startSlotIndex: number, staffIndex: number) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (startSlotIndex === -1) {
      return { left: '0px', width: '100%', minWidth: '40px' };
    }
    
    // セル内での開始位置（分単位）
    const startSlotMinutes = timeToMinutes(timeSlots[startSlotIndex]);
    const offsetInCell = startMinutes - startSlotMinutes; // セル内での分（0-60）
    
    // 終了時間がどのセルに該当するかを計算
    // 終了時間がセルの開始時間と一致する場合も含める
    let endSlotIndex = timeSlots.findIndex(time => {
      const timeMinutes = timeToMinutes(time);
      const nextTimeMinutes = timeMinutes + 60;
      return timeMinutes <= endMinutes && nextTimeMinutes > endMinutes;
    });
    
    // 終了時間が時間スロットの範囲外の場合、最後のセルを使用
    if (endSlotIndex === -1) {
      const lastSlotMinutes = timeToMinutes(timeSlots[timeSlots.length - 1]);
      if (endMinutes >= lastSlotMinutes) {
        endSlotIndex = timeSlots.length - 1;
      } else {
        // 終了時間が最初のセルより前の場合
        endSlotIndex = 0;
      }
    }
    
    // セル幅（80px）を基準に計算
    const cellWidth = 80; // 各セルの幅（px）
    const offsetPx = (offsetInCell / 60) * cellWidth; // セル内でのオフセット（px）
    
    // ブロックがまたがるセル数
    const spanCells = endSlotIndex - startSlotIndex + 1;
    
    // 終了セル内での位置
    const endSlotMinutes = timeToMinutes(timeSlots[endSlotIndex]);
    const endOffsetInCell = endMinutes - endSlotMinutes;
    
    // 終了時間がセルの開始位置と一致する場合、そのセル全体を含める
    // 終了時間がセル内にある場合、その位置まで表示
    const endOffsetPx = endOffsetInCell <= 0 
      ? cellWidth  // 終了時間がセルの開始位置以下の場合、セル全体を含める
      : Math.min((endOffsetInCell / 60) * cellWidth, cellWidth); // セル内の位置
    
    // 左位置: セル内でのオフセット（tdを基準）
    const leftPx = offsetPx;
    
    // 幅: またがるセル数 * セル幅 - 開始オフセット + 終了オフセット
    // ただし、tdを基準にするため、開始セルからの相対位置で計算
    const widthPx = (spanCells * cellWidth) - offsetPx + endOffsetPx;
    
    return {
      left: `${leftPx}px`,
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
      minWidth: '20px'
    };
  };

  // シフトの開始/終了時間をリサイズ
  const handleShiftResize = (staffId: number, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shift = shifts[staffId];
    if (!shift || !shift.start_time || !shift.end_time) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromX(moveEvent.clientX);
      if (!time) {
        // 時間が取得できない場合は、現在のシフトを維持
        return;
      }
      
      if (!shift.start_time || !shift.end_time) return;

      const updatedShift = { ...shift };
      const breakTimes = typeof updatedShift.break_times === 'string' 
        ? JSON.parse(updatedShift.break_times) 
        : (updatedShift.break_times || []);

      if (edge === 'start') {
        const endMinutes = timeToMinutes(shift.end_time);
        const newStartMinutes = timeToMinutes(time);
        if (newStartMinutes < endMinutes && newStartMinutes >= 0) {
          updatedShift.start_time = time;
        }
      } else if (edge === 'end') {
        const startMinutes = timeToMinutes(shift.start_time);
        const newEndMinutes = timeToMinutes(time);
        if (newEndMinutes > startMinutes && newEndMinutes <= 24 * 60) {
          updatedShift.end_time = time;
        }
      }

      // 開始時間と終了時間が両方設定されている場合のみ更新
      if (updatedShift.start_time && updatedShift.end_time) {
        setShifts(prev => ({
          ...prev,
          [staffId]: updatedShift
        }));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setDraggingShift(null);
      saveShift(staffId);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setDraggingShift({ staffId, edge });
  };

  // 休憩時間の開始/終了時間をリサイズ
  const handleBreakResize = (staffId: number, breakIndex: number, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shift = shifts[staffId];
    if (!shift || !shift.start_time || !shift.end_time) return;

    const breakTimes = typeof shift.break_times === 'string' 
      ? JSON.parse(shift.break_times) 
      : (shift.break_times || []);
    
    if (!breakTimes[breakIndex]) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromX(moveEvent.clientX);
      if (!time) return;

      const updatedBreakTimes = [...breakTimes];
      const breakTime = updatedBreakTimes[breakIndex];
      
      if (edge === 'start') {
        const endMinutes = timeToMinutes(breakTime.end);
        const newStartMinutes = timeToMinutes(time);
        if (newStartMinutes < endMinutes) {
          updatedBreakTimes[breakIndex] = {
            ...breakTime,
            start: time
          };
        }
      } else if (edge === 'end') {
        const startMinutes = timeToMinutes(breakTime.start);
        const newEndMinutes = timeToMinutes(time);
        if (newEndMinutes > startMinutes) {
          updatedBreakTimes[breakIndex] = {
            ...breakTime,
            end: time
          };
        }
      }

      setShifts(prev => ({
        ...prev,
        [staffId]: {
          ...prev[staffId],
          break_times: updatedBreakTimes
        }
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setDraggingBreak(null);
      saveShift(staffId);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setDraggingBreak({ staffId, breakIndex, edge });
  };

  // シフトを保存
  const saveShift = async (staffId: number) => {
    const shift = shifts[staffId];
    if (!shift) return;

    // 開始時間と終了時間が両方ある場合のみ保存
    if (!shift.start_time || !shift.end_time) {
      console.warn('シフトの開始時間または終了時間が設定されていません');
      return;
    }

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const breakTimes = typeof shift.break_times === 'string' 
        ? JSON.parse(shift.break_times) 
        : (shift.break_times || []);

      const url = getApiUrlWithTenantId('/api/admin/shifts');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shifts: [{
            staff_id: staffId,
            shift_date: dateStr,
            start_time: shift.start_time,
            end_time: shift.end_time,
            is_off: shift.is_off,
            break_times: breakTimes
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('シフト保存エラー:', errorData);
        // エラーが発生した場合、シフトデータを再読み込み
        await loadShifts();
      } else {
        // 保存成功後、シフトデータを再読み込みして最新の状態を反映
        await loadShifts();
      }
    } catch (error) {
      console.error('シフト保存エラー:', error);
      // エラーが発生した場合、シフトデータを再読み込み
      await loadShifts();
    }
  };

  // セルをクリックしてシフトを追加/削除
  const handleCellClick = (staffId: number, time: string) => {
    const shift = shifts[staffId] || {
      staff_id: staffId,
      shift_date: selectedDate.toISOString().split('T')[0],
      start_time: null,
      end_time: null,
      is_off: false,
      break_times: []
    };

    // 既にシフトがある場合は削除
    if (shift.start_time && shift.end_time) {
      const clickMinutes = timeToMinutes(time);
      const startMinutes = timeToMinutes(shift.start_time);
      const endMinutes = timeToMinutes(shift.end_time);
      
      if (clickMinutes >= startMinutes && clickMinutes <= endMinutes) {
        setShifts(prev => ({
          ...prev,
          [staffId]: {
            ...shift,
            start_time: null,
            end_time: null,
            break_times: []
          }
        }));
        saveShift(staffId);
        return;
      }
    }

    // 新しいシフトを追加
    if (!shift.start_time) {
      shift.start_time = time;
      shift.end_time = minutesToTime(timeToMinutes(time) + 480); // デフォルト8時間
    } else if (!shift.end_time) {
      const startMinutes = timeToMinutes(shift.start_time);
      const clickMinutes = timeToMinutes(time);
      if (clickMinutes > startMinutes) {
        shift.end_time = time;
      } else {
        shift.start_time = time;
        shift.end_time = minutesToTime(timeToMinutes(time) + 480);
      }
    }

    setShifts(prev => ({
      ...prev,
      [staffId]: shift
    }));
    saveShift(staffId);
  };

  // 休憩時間を削除
  const handleDeleteBreak = (staffId: number, breakIndex: number) => {
    const shift = shifts[staffId];
    if (!shift) return;

    const breakTimes = typeof shift.break_times === 'string' 
      ? JSON.parse(shift.break_times) 
      : (shift.break_times || []);
    
    breakTimes.splice(breakIndex, 1);
    
    setShifts(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        break_times: breakTimes
      }
    }));
    saveShift(staffId);
  };

  // 休憩時間を追加
  const handleAddBreak = (staffId: number) => {
    const shift = shifts[staffId];
    if (!shift || !shift.start_time || !shift.end_time) return;

    const breakTimes = typeof shift.break_times === 'string' 
      ? JSON.parse(shift.break_times) 
      : (shift.break_times || []);

    const startMinutes = timeToMinutes(shift.start_time);
    const newBreak = {
      start: minutesToTime(startMinutes + 240), // デフォルト4時間後
      end: minutesToTime(startMinutes + 300) // 1時間休憩
    };

    breakTimes.push(newBreak);
    
    setShifts(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        break_times: breakTimes
      }
    }));
    saveShift(staffId);
  };

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dateObj = new Date(selectedDate);
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  const registeredCount = Object.values(shifts).filter(s => s.start_time && s.end_time && !s.is_off).length;

  // シフトがある従業員のみフィルタ
  const staffWithShifts = staff.filter(s => {
    const shift = shifts[s.staff_id];
    return shift && shift.start_time && shift.end_time && !shift.is_off;
  });

  if (loading || timeSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" ref={tableRef}>
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
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 border-b border-blue-700">
              <th className="border-r border-blue-700 p-3 text-left font-semibold bg-blue-600 text-white sticky left-0 z-20 shadow-lg min-w-[120px]">
                従業員名
              </th>
              {timeSlots.map((time) => (
                <th
                  key={time}
                  className="border-r border-blue-700 p-2 text-center font-semibold text-white text-xs min-w-[80px] bg-blue-600"
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

              const breakTimes = typeof shift.break_times === 'string' 
                ? JSON.parse(shift.break_times) 
                : (shift.break_times || []);

              // 開始時間がどのセルに該当するかを計算
              const startMinutes = shift.start_time ? timeToMinutes(shift.start_time) : 0;
              const startSlotIndex = shift.start_time ? timeSlots.findIndex(time => {
                const timeMinutes = timeToMinutes(time);
                const nextTimeMinutes = timeMinutes + 60;
                return timeMinutes <= startMinutes && nextTimeMinutes > startMinutes;
              }) : -1;
              
              return (
                <tr key={s.staff_id} className="border-b border-gray-200 relative" style={{ height: '80px', position: 'relative' }}>
                  <td className="border-r border-gray-300 p-3 bg-gray-50 sticky left-0 z-10 font-medium shadow-md min-w-[120px]">
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
                        style={{ height: '80px', minWidth: '80px', position: 'relative', overflow: 'visible' }}
                        onClick={() => handleCellClick(s.staff_id, time)}
                      >
                        {/* シフト開始時間のセルにシフトブロックを表示 */}
                        {isStartCell && (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded shadow-lg z-20 group border-2 border-white"
                            style={{
                              ...getShiftBlockStyle(shift.start_time, shift.end_time, startSlotIndex, staffIndex),
                              position: 'absolute'
                            }}
                          >
                            {/* 開始時間リサイズハンドル */}
                            <div
                              className="absolute top-0 bottom-0 left-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700"
                              onMouseDown={(e) => handleShiftResize(s.staff_id, 'start', e)}
                            />
                            
                            {/* シフト内容 */}
                            <div className="p-1 h-full flex flex-col justify-center items-start pl-2">
                              <div className="font-semibold text-xs text-white whitespace-nowrap">
                                開始 {shift.start_time}
                              </div>
                              <div className="font-semibold text-xs text-white whitespace-nowrap mt-1 absolute bottom-1 left-2">
                                終了 {shift.end_time}
                              </div>
                            </div>

                            {/* 休憩時間 */}
                            {breakTimes.map((breakTime: { start: string; end: string }, idx: number) => {
                              if (!shift.start_time || !shift.end_time) return null;
                              
                              const breakStartMinutes = timeToMinutes(breakTime.start);
                              const breakEndMinutes = timeToMinutes(breakTime.end);
                              
                              // 休憩時間がこのシフト時間内にあるか確認
                              if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
                                return null;
                              }

                              return (
                                <div
                                  key={idx}
                                  className="absolute bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs rounded z-30 group/break border-2 border-white shadow-md"
                                  style={getBreakBlockStyle(breakTime.start, breakTime.end, shift.start_time, shift.end_time)}
                                >
                                  {/* 休憩開始時間リサイズハンドル */}
                                  <div
                                    className="absolute top-0 bottom-0 left-0 w-1 bg-orange-600 cursor-ew-resize hover:bg-orange-700 opacity-0 group-hover/break:opacity-100"
                                    onMouseDown={(e) => handleBreakResize(s.staff_id, idx, 'start', e)}
                                  />
                                  
                                  <div className="p-1 h-full flex flex-col justify-center items-start pl-2 relative">
                                    <div className="text-xs text-white whitespace-nowrap">
                                      休憩 開始 {breakTime.start}
                                    </div>
                                    <div className="text-xs text-white whitespace-nowrap mt-0.5">
                                      休憩 {breakTime.start}-{breakTime.end}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBreak(s.staff_id, idx);
                                      }}
                                      className="absolute top-1 right-1 text-white hover:text-red-200 opacity-0 group-hover/break:opacity-100 transition-opacity p-1"
                                    >
                                      <XMarkIcon className="h-3 w-3" />
                                    </button>
                                    <div className="text-xs text-white whitespace-nowrap mt-0.5 absolute bottom-1 left-2">
                                      休憩 終了 {breakTime.end}
                                    </div>
                                  </div>
                                  
                                  {/* 休憩終了時間リサイズハンドル */}
                                  <div
                                    className="absolute top-0 bottom-0 right-0 w-1 bg-orange-600 cursor-ew-resize hover:bg-orange-700 opacity-0 group-hover/break:opacity-100"
                                    onMouseDown={(e) => handleBreakResize(s.staff_id, idx, 'end', e)}
                                  />
                                </div>
                              );
                            })}
                            
                            {/* 終了時間リサイズハンドル */}
                            <div
                              className="absolute top-0 bottom-0 right-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700"
                              onMouseDown={(e) => handleShiftResize(s.staff_id, 'end', e)}
                            />
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

      {/* 休憩追加ボタン */}
      <div className="mt-4 flex gap-2">
        {staffWithShifts.map((s) => {
          const shift = shifts[s.staff_id];
          if (!shift || !shift.start_time || !shift.end_time || shift.is_off) return null;

          return (
            <div key={s.staff_id} className="flex-1">
              <button
                onClick={() => handleAddBreak(s.staff_id)}
                className="w-full px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm font-medium"
              >
                {s.name}: 休憩追加
              </button>
            </div>
          );
        })}
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

