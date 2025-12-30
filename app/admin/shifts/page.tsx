'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon
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

export default function ShiftManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Record<string, Record<number, Shift>>>({}); // {date: {staff_id: shift}}
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const startDate = getStartOfWeek(currentDate).toISOString().split('T')[0];
      const endDate = getEndOfWeek(currentDate).toISOString().split('T')[0];

      const url = getApiUrlWithTenantId(`/api/admin/shifts?start_date=${startDate}&end_date=${endDate}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const shiftsMap: Record<string, Record<number, Shift>> = {};
        
        // 週の日付を初期化
        const weekDates = getWeekDates(currentDate);
        weekDates.forEach(date => {
          shiftsMap[date] = {};
          staff.forEach(s => {
            shiftsMap[date][s.staff_id] = {
              staff_id: s.staff_id,
              shift_date: date,
              start_time: null,
              end_time: null,
              is_off: false
            };
          });
        });

        // 取得したシフトデータをマップに反映
        data.forEach((shift: Shift) => {
          const dateKey = shift.shift_date.split('T')[0];
          if (shiftsMap[dateKey]) {
            shiftsMap[dateKey][shift.staff_id] = shift;
          }
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

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の始まりとする
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const getWeekDates = (date: Date) => {
    const start = getStartOfWeek(date);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const handleShiftChange = (date: string, staffId: number, field: 'start_time' | 'end_time' | 'is_off', value: string | boolean) => {
    setShifts(prev => {
      const newShifts = { ...prev };
      if (!newShifts[date]) {
        newShifts[date] = {};
      }
      if (!newShifts[date][staffId]) {
        newShifts[date][staffId] = {
          staff_id: staffId,
          shift_date: date,
          start_time: null,
          end_time: null,
          is_off: false
        };
      }
      newShifts[date][staffId] = {
        ...newShifts[date][staffId],
        [field]: value,
        ...(field === 'is_off' && value === true ? { start_time: null, end_time: null } : {})
      };
      return newShifts;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // シフトデータを配列に変換
      const shiftsArray: Shift[] = [];
      Object.keys(shifts).forEach(date => {
        Object.values(shifts[date]).forEach(shift => {
          if (shift.start_time || shift.end_time || shift.is_off) {
            shiftsArray.push({
              staff_id: shift.staff_id,
              shift_date: date,
              start_time: shift.is_off ? null : shift.start_time,
              end_time: shift.is_off ? null : shift.end_time,
              is_off: shift.is_off
            });
          }
        });
      });

      const url = getApiUrlWithTenantId('/api/admin/shifts');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ shifts: shiftsArray }),
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

  const weekDates = getWeekDates(currentDate);
  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">シフト管理</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPreviousWeek}
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
                  onClick={goToNextWeek}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold sticky left-0 bg-gray-50 z-10">
                        従業員
                      </th>
                      {weekDates.map((date, index) => {
                        const dateObj = new Date(date);
                        const isHoliday = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        return (
                          <th
                            key={date}
                            className={`border border-gray-300 bg-gray-50 p-3 text-center font-semibold min-w-[150px] ${
                              isHoliday ? 'bg-red-50' : ''
                            }`}
                          >
                            <div>{dayNames[index]}</div>
                            <div className="text-sm font-normal">{formatDate(date)}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((staffMember) => (
                      <tr key={staffMember.staff_id}>
                        <td className="border border-gray-300 bg-gray-50 p-3 font-medium sticky left-0 bg-gray-50 z-10">
                          {staffMember.name}
                        </td>
                        {weekDates.map((date) => {
                          const shift = shifts[date]?.[staffMember.staff_id] || {
                            staff_id: staffMember.staff_id,
                            shift_date: date,
                            start_time: null,
                            end_time: null,
                            is_off: false
                          };
                          const dateObj = new Date(date);
                          const isHoliday = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                          return (
                            <td
                              key={`${staffMember.staff_id}-${date}`}
                              className={`border border-gray-300 p-2 ${isHoliday ? 'bg-red-50' : 'bg-white'}`}
                            >
                              <div className="space-y-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={shift.is_off}
                                    onChange={(e) =>
                                      handleShiftChange(date, staffMember.staff_id, 'is_off', e.target.checked)
                                    }
                                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">休み</span>
                                </label>
                                {!shift.is_off && (
                                  <>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">開始</label>
                                      <input
                                        type="time"
                                        value={shift.start_time || ''}
                                        onChange={(e) =>
                                          handleShiftChange(date, staffMember.staff_id, 'start_time', e.target.value)
                                        }
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">終了</label>
                                      <input
                                        type="time"
                                        value={shift.end_time || ''}
                                        onChange={(e) =>
                                          handleShiftChange(date, staffMember.staff_id, 'end_time', e.target.value)
                                        }
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '保存中...' : 'シフトを保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

