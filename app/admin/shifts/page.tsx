'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

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
  staff_name?: string;
}

// シフトパターン
const SHIFT_PATTERNS = [
  { id: 'morning', name: '早番', time: '07:00-16:00', start: '07:00', end: '16:00', color: 'bg-orange-100 text-orange-800' },
  { id: 'day', name: '日勤', time: '09:00-18:00', start: '09:00', end: '18:00', color: 'bg-blue-100 text-blue-800' },
  { id: 'late', name: '遅番', time: '13:00-22:00', start: '13:00', end: '22:00', color: 'bg-purple-100 text-purple-800' },
  { id: 'night', name: '夜勤', time: '22:00-07:00', start: '22:00', end: '07:00', color: 'bg-gray-100 text-gray-800' },
  { id: 'off', name: '休み', time: '-', start: null, end: null, color: 'bg-green-100 text-green-800' },
  { id: 'custom', name: 'カスタム', time: '自由設定', start: null, end: null, color: 'bg-gray-100 text-gray-800' }
];

export default function ShiftManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift[]>>({}); // {date: [shift, ...]}
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  
  // シフト追加用の状態
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('18:00');

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (staff.length > 0) {
      loadShifts();
    }
  }, [staff, currentDate]);

  const loadStaff = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/staff');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

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
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const url = getApiUrlWithTenantId(`/api/admin/shifts?year=${year}&month=${month}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const shiftsMap: Record<string, Shift[]> = {};
        
        // シフトデータを日付ごとに整理
        data.forEach((shift: Shift) => {
          const dateKey = shift.shift_date.split('T')[0];
          if (!shiftsMap[dateKey]) {
            shiftsMap[dateKey] = [];
          }
          shiftsMap[dateKey].push(shift);
        });

        setShifts(shiftsMap);
      }
    } catch (error) {
      console.error('シフト取得エラー:', error);
      setError('シフトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getStartOfMonth = (date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    return d;
  };

  const getEndOfMonth = (date: Date) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  };

  // カレンダーの日付を生成（週単位で表示）
  const generateCalendarDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowShiftDialog(true);
    setSelectedStaffId('');
    setSelectedPattern('');
    setCustomStartTime('09:00');
    setCustomEndTime('18:00');
  };

  const getShiftPattern = (shift: Shift) => {
    if (shift.is_off) {
      return SHIFT_PATTERNS.find(p => p.id === 'off');
    }
    if (!shift.start_time || !shift.end_time) {
      return null;
    }
    const start = shift.start_time.substring(0, 5);
    const end = shift.end_time.substring(0, 5);
    
    return SHIFT_PATTERNS.find(p => 
      p.start && p.end && p.start === start && p.end === end
    ) || SHIFT_PATTERNS.find(p => p.id === 'custom');
  };

  const handleAddShift = async () => {
    if (!selectedDate || !selectedStaffId || !selectedPattern) {
      setError('従業員とシフトパターンを選択してください');
      return;
    }

    const pattern = SHIFT_PATTERNS.find(p => p.id === selectedPattern);
    if (!pattern) {
      setError('シフトパターンが無効です');
      return;
    }

    const dateKey = formatDate(selectedDate);
    const existingShifts = shifts[dateKey] || [];
    
    // 重複チェック
    if (existingShifts.some(s => s.staff_id === parseInt(selectedStaffId))) {
      setError('この従業員のシフトは既に登録されています');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const startTime = selectedPattern === 'off' ? null : 
                      (selectedPattern === 'custom' ? customStartTime : pattern.start);
      const endTime = selectedPattern === 'off' ? null : 
                     (selectedPattern === 'custom' ? customEndTime : pattern.end);

      const newShift: Shift = {
        staff_id: parseInt(selectedStaffId),
        shift_date: dateKey,
        start_time: startTime,
        end_time: endTime,
        is_off: selectedPattern === 'off'
      };

      const url = getApiUrlWithTenantId('/api/admin/shifts');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ shifts: [newShift] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'シフトの追加に失敗しました');
      }

      // ローカル状態を更新
      const staffMember = staff.find(s => s.staff_id === parseInt(selectedStaffId));
      setShifts(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), { ...newShift, staff_name: staffMember?.name }]
      }));

      // フォームリセット
      setSelectedStaffId('');
      setSelectedPattern('');
      setCustomStartTime('09:00');
      setCustomEndTime('18:00');
    } catch (error: any) {
      console.error('シフト追加エラー:', error);
      setError(error.message || 'シフトの追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (shiftId: number, dateKey: string) => {
    if (!confirm('このシフトを削除しますか？')) {
      return;
    }

    try {
      setSaving(true);
      const url = getApiUrlWithTenantId(`/api/admin/shifts/${shiftId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('シフトの削除に失敗しました');
      }

      // ローカル状態を更新
      setShifts(prev => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).filter(s => s.shift_id !== shiftId)
      }));
    } catch (error: any) {
      console.error('シフト削除エラー:', error);
      setError(error.message || 'シフトの削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePatternChange = (patternId: string) => {
    setSelectedPattern(patternId);
    const pattern = SHIFT_PATTERNS.find(p => p.id === patternId);
    if (pattern && pattern.start && pattern.end) {
      setCustomStartTime(pattern.start);
      setCustomEndTime(pattern.end);
    }
  };

  const calendarDates = generateCalendarDates();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const today = formatDate(new Date());

  // 利用可能なスタッフ（まだシフトが割り当てられていない）
  const getAvailableStaff = () => {
    if (!selectedDate) return staff;
    const dateKey = formatDate(selectedDate);
    const existingShiftStaffIds = (shifts[dateKey] || []).map(s => s.staff_id);
    return staff.filter(s => !existingShiftStaffIds.includes(s.staff_id));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">シフト管理</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href={getAdminLinkUrl('/admin/dashboard')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  ダッシュボード
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/reservations')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  予約管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/customers')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  顧客管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/menus')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/products')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  商品管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/sales')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  売上管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/staff')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  従業員管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/shifts')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  シフト管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/settings')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  設定
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/admin/logout', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    router.push('/admin/login');
                  } catch (error) {
                    console.error('ログアウトエラー:', error);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">シフト管理</h2>
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
                  {formatMonthYear(currentDate)}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* シフトパターン凡例 */}
            <div className="mb-6 flex flex-wrap gap-4">
              {SHIFT_PATTERNS.map(pattern => (
                <div key={pattern.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${pattern.color.split(' ')[0]}`}></div>
                  <span className="text-sm text-gray-700">
                    {pattern.name} {pattern.time}
                  </span>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <>
                {/* カレンダー */}
                <div className="mb-6">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day, index) => (
                      <div
                        key={day}
                        className={`text-center text-sm font-semibold py-2 ${
                          index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* カレンダー本体 */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDates.map((date, index) => {
                      const dateKey = formatDate(date);
                      const dayShifts = shifts[dateKey] || [];
                      const isToday = dateKey === today;
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const dayOfWeek = date.getDay();

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(date)}
                          className={`min-h-[120px] p-2 border rounded cursor-pointer transition-all hover:shadow-md ${
                            isCurrentMonth ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                          } ${isToday ? 'ring-2 ring-pink-500' : ''} ${
                            dayOfWeek === 0 ? 'bg-red-50' : dayOfWeek === 6 ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className={`text-sm font-medium ${
                                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                              } ${isToday ? 'text-pink-600 font-bold' : ''}`}
                            >
                              {date.getDate()}
                            </span>
                            {dayShifts.length > 0 && (
                              <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
                                {dayShifts.length}名
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 overflow-y-auto max-h-20">
                            {dayShifts.slice(0, 3).map((shift) => {
                              const pattern = getShiftPattern(shift);
                              return (
                                <div
                                  key={shift.shift_id || shift.staff_id}
                                  className="text-xs flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      pattern?.color.split(' ')[0] || 'bg-gray-300'
                                    }`}
                                  ></div>
                                  <span className="truncate">{shift.staff_name || staff.find(s => s.staff_id === shift.staff_id)?.name}</span>
                                </div>
                              );
                            })}
                            {dayShifts.length > 3 && (
                              <div className="text-xs text-gray-500">
                                他{dayShifts.length - 3}名...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* シフト編集ダイアログ */}
      {showShiftDialog && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日のシフト管理
              </h3>
              <button
                onClick={() => setShowShiftDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 登録済みシフト一覧 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                登録済みシフト（{(shifts[formatDate(selectedDate)] || []).length}名）
              </h4>
              {(shifts[formatDate(selectedDate)] || []).length === 0 ? (
                <p className="text-sm text-gray-500 py-4">まだシフトが登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {(shifts[formatDate(selectedDate)] || []).map((shift) => {
                    const pattern = getShiftPattern(shift);
                    return (
                      <div
                        key={shift.shift_id || shift.staff_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold`}>
                            {(shift.staff_name || staff.find(s => s.staff_id === shift.staff_id)?.name || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {shift.staff_name || staff.find(s => s.staff_id === shift.staff_id)?.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${pattern?.color || 'bg-gray-100 text-gray-800'}`}>
                                {pattern?.name || 'カスタム'}
                              </span>
                              {shift.start_time && shift.end_time && (
                                <span className="text-xs text-gray-600">
                                  {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {shift.shift_id && (
                          <button
                            onClick={() => handleDeleteShift(shift.shift_id!, formatDate(selectedDate))}
                            className="text-red-600 hover:text-red-800 p-1"
                            disabled={saving}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">シフト追加</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    従業員
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">選択してください</option>
                    {getAvailableStaff().map(s => (
                      <option key={s.staff_id} value={s.staff_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {getAvailableStaff().length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">全従業員のシフトが登録済みです</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    シフトパターン
                  </label>
                  <select
                    value={selectedPattern}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">選択してください</option>
                    {SHIFT_PATTERNS.map(pattern => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name} {pattern.time && `(${pattern.time})`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPattern && selectedPattern !== 'off' && selectedPattern !== '' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始時間
                      </label>
                      <input
                        type="time"
                        value={selectedPattern === 'custom' ? customStartTime : SHIFT_PATTERNS.find(p => p.id === selectedPattern)?.start || customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        disabled={selectedPattern !== 'custom'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了時間
                      </label>
                      <input
                        type="time"
                        value={selectedPattern === 'custom' ? customEndTime : SHIFT_PATTERNS.find(p => p.id === selectedPattern)?.end || customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        disabled={selectedPattern !== 'custom'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddShift}
                  disabled={!selectedStaffId || !selectedPattern || saving}
                  className="w-full px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  シフトを追加
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShiftDialog(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
