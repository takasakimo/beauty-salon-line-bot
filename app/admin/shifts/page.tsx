'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import AdminNav from '@/app/components/AdminNav';
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

interface ShiftRow {
  date: string;
  dayOfWeek: string;
  isHoliday: boolean;
  startTime: string | null;
  endTime: string | null;
  isOff: boolean;
}

export default function ShiftManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // 基本設定
  const [basicStartTime, setBasicStartTime] = useState('10:00');
  const [basicEndTime, setBasicEndTime] = useState('18:00');
  
  // シフト行データ
  const [shiftRows, setShiftRows] = useState<Record<string, ShiftRow>>({});

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      loadShifts();
    } else {
      setShiftRows({});
    }
  }, [selectedStaffId, currentDate]);

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
    if (!selectedStaffId) return;
    
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const url = getApiUrlWithTenantId(`/api/admin/shifts?year=${year}&month=${month}&staff_id=${selectedStaffId}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const rows: Record<string, ShiftRow> = {};
        
        // 月の日付を生成
        const monthDates = getMonthDates(currentDate);
        monthDates.forEach(date => {
          const dateKey = date;
          const dateObj = new Date(date);
          const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
          
          // 既存のシフトを検索
          const existingShift = data.find((s: Shift) => s.shift_date.split('T')[0] === date);
          
          rows[dateKey] = {
            date: dateKey,
            dayOfWeek,
            isHoliday: existingShift?.is_off || false,
            startTime: existingShift?.start_time ? existingShift.start_time.substring(0, 5) : null,
            endTime: existingShift?.end_time ? existingShift.end_time.substring(0, 5) : null,
            isOff: existingShift?.is_off || false
          };
        });

        setShiftRows(rows);
      }
    } catch (error) {
      console.error('シフト取得エラー:', error);
      setError('シフトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: string[] = [];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    
    return dates;
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

  const handleRowChange = (dateKey: string, field: keyof ShiftRow, value: any) => {
    setShiftRows(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [field]: value,
        ...(field === 'isHoliday' && value === true ? { 
          isOff: true, 
          startTime: null, 
          endTime: null 
        } : {}),
        ...(field === 'isOff' && value === true ? { 
          startTime: null, 
          endTime: null 
        } : {})
      }
    }));
  };

  const applyBasicSettings = () => {
    if (!selectedStaffId) {
      setError('従業員を選択してください');
      return;
    }

    if (!basicStartTime || !basicEndTime) {
      setError('開始時刻と終了時刻を入力してください');
      return;
    }

    // 開始時刻が終了時刻より後でないかチェック
    const [startHour, startMinute] = basicStartTime.split(':').map(Number);
    const [endHour, endMinute] = basicEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes >= endMinutes) {
      setError('開始時刻は終了時刻より前である必要があります');
      return;
    }

    setShiftRows(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(dateKey => {
        const row = updated[dateKey];
        if (!row.isHoliday && !row.isOff) {
          updated[dateKey] = {
            ...row,
            startTime: basicStartTime,
            endTime: basicEndTime
          };
        }
      });
      return updated;
    });
    
    setError(''); // 成功時はエラーをクリア
  };

  const handleSave = async () => {
    if (!selectedStaffId) {
      setError('従業員を選択してください');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const shiftsToSave: Shift[] = [];
      Object.values(shiftRows).forEach(row => {
        if (row.isOff || row.isHoliday) {
          shiftsToSave.push({
            staff_id: parseInt(selectedStaffId),
            shift_date: row.date,
            start_time: null,
            end_time: null,
            is_off: true
          });
        } else if (row.startTime && row.endTime) {
          shiftsToSave.push({
            staff_id: parseInt(selectedStaffId),
            shift_date: row.date,
            start_time: row.startTime,
            end_time: row.endTime,
            is_off: false
          });
        }
      });

      const url = getApiUrlWithTenantId('/api/admin/shifts');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ shifts: shiftsToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'シフトの保存に失敗しました');
      }

      alert('シフトを保存しました');
      await loadShifts();
    } catch (error: any) {
      console.error('シフト保存エラー:', error);
      setError(error.message || 'シフトの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const monthDates = getMonthDates(currentDate);

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/admin/shifts" title="シフト管理" />

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

            {/* 従業員選択と基本設定 */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示モード
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500">
                    <option>全体</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    従業員 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">従業員を選択してください</option>
                    {staff.map(s => (
                      <option key={s.staff_id} value={s.staff_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示月
                  </label>
                  <input
                    type="month"
                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-').map(Number);
                      setCurrentDate(new Date(year, month - 1, 1));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              {selectedStaffId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">基本設定</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        基本勤務開始時間
                      </label>
                      <input
                        type="time"
                        value={basicStartTime}
                        onChange={(e) => setBasicStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        基本勤務終了時間
                      </label>
                      <input
                        type="time"
                        value={basicEndTime}
                        onChange={(e) => setBasicEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={applyBasicSettings}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    基本設定を適用
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    ※基本設定を適用すると、出勤の行に選択した開始時刻と終了時刻が自動で設定されます
                  </p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : selectedStaffId ? (
              <>
                {/* シフト表 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left font-semibold">日付</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold">曜日</th>
                        <th className="border border-gray-300 p-2 text-center font-semibold">公休</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold">勤務種別</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold">勤務時間</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold">開始時間</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold">終了時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthDates.map((dateKey) => {
                        const row = shiftRows[dateKey] || {
                          date: dateKey,
                          dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][new Date(dateKey).getDay()],
                          isHoliday: false,
                          startTime: null,
                          endTime: null,
                          isOff: false
                        };
                        const dateObj = new Date(dateKey);
                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        
                        return (
                          <tr
                            key={dateKey}
                            className={isWeekend ? 'bg-red-50' : ''}
                          >
                            <td className="border border-gray-300 p-2">
                              {dateObj.getMonth() + 1}/{dateObj.getDate()}
                            </td>
                            <td className={`border border-gray-300 p-2 ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : ''}`}>
                              {row.dayOfWeek}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.isHoliday}
                                onChange={(e) => handleRowChange(dateKey, 'isHoliday', e.target.checked)}
                                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <select
                                value={row.isHoliday || row.isOff ? '' : 'work'}
                                onChange={(e) => {
                                  if (e.target.value === '') {
                                    handleRowChange(dateKey, 'isOff', true);
                                  } else {
                                    handleRowChange(dateKey, 'isOff', false);
                                  }
                                }}
                                disabled={row.isHoliday}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                              >
                                <option value="">-</option>
                                <option value="work">勤務</option>
                              </select>
                            </td>
                            <td className="border border-gray-300 p-2">
                              {row.startTime && row.endTime ? (
                                (() => {
                                  const [sh, sm] = row.startTime.split(':').map(Number);
                                  const [eh, em] = row.endTime.split(':').map(Number);
                                  const startMinutes = sh * 60 + sm;
                                  const endMinutes = eh * 60 + em;
                                  const diffMinutes = endMinutes - startMinutes;
                                  const hours = Math.floor(diffMinutes / 60);
                                  const minutes = diffMinutes % 60;
                                  return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
                                })()
                              ) : '-'}
                            </td>
                            <td className="border border-gray-300 p-2">
                              <input
                                type="time"
                                value={row.startTime || ''}
                                onChange={(e) => handleRowChange(dateKey, 'startTime', e.target.value || null)}
                                disabled={row.isHoliday || row.isOff}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <input
                                type="time"
                                value={row.endTime || ''}
                                onChange={(e) => handleRowChange(dateKey, 'endTime', e.target.value || null)}
                                disabled={row.isHoliday || row.isOff}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? '保存中...' : '変更を保存'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">従業員を選択してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
