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
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetMonth, setCopyTargetMonth] = useState(new Date());

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
        const shiftsMap: Record<string, Record<number, Shift>> = {};
        
        // 月の日付を初期化
        const monthDates = getMonthDates(currentDate);
        monthDates.forEach(date => {
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

  const getMonthDates = (date: Date) => {
    const start = getStartOfMonth(date);
    const end = getEndOfMonth(date);
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
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

  const monthDates = getMonthDates(currentDate);
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

  const handleCopyMonth = async () => {
    try {
      if (!confirm(`現在の月のシフトを${copyTargetMonth.getFullYear()}年${copyTargetMonth.getMonth() + 1}月にコピーしますか？`)) {
        return;
      }

      setSaving(true);
      setError('');

      // 現在の月のシフトを取得
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const url = getApiUrlWithTenantId(`/api/admin/shifts?year=${currentYear}&month=${currentMonth}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('シフトの取得に失敗しました');
      }

      const currentShifts: Shift[] = await response.json();

      // コピー先の月の日数を取得
      const targetYear = copyTargetMonth.getFullYear();
      const targetMonth = copyTargetMonth.getMonth() + 1;
      const targetStartDate = new Date(targetYear, targetMonth - 1, 1);
      const targetEndDate = new Date(targetYear, targetMonth, 0);
      const targetDays = targetEndDate.getDate();
      const currentDays = getEndOfMonth(currentDate).getDate();

      // シフトをコピー先の月に変換
      const copiedShifts: Shift[] = [];
      currentShifts.forEach(shift => {
        const shiftDate = new Date(shift.shift_date);
        const dayOfMonth = shiftDate.getDate();
        
        // 日付がコピー先の月の日数を超える場合はスキップ
        if (dayOfMonth > targetDays) {
          return;
        }

        const newDate = new Date(targetYear, targetMonth - 1, dayOfMonth);
        copiedShifts.push({
          staff_id: shift.staff_id,
          shift_date: newDate.toISOString().split('T')[0],
          start_time: shift.start_time,
          end_time: shift.end_time,
          is_off: shift.is_off
        });
      });

      // コピー先の月のシフトを保存
      const saveUrl = getApiUrlWithTenantId('/api/admin/shifts');
      const saveResponse = await fetch(saveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ shifts: copiedShifts }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'シフトのコピーに失敗しました');
      }

      alert('シフトをコピーしました');
      setShowCopyDialog(false);
    } catch (error: any) {
      console.error('シフトコピーエラー:', error);
      setError(error.message || 'シフトのコピーに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMonth = async () => {
    try {
      if (!confirm(`現在の月（${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月）のシフトをすべて削除しますか？`)) {
        return;
      }

      setSaving(true);
      setError('');

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = getStartOfMonth(currentDate).toISOString().split('T')[0];
      const endDate = getEndOfMonth(currentDate).toISOString().split('T')[0];

      // 現在の月のシフトを取得
      const url = getApiUrlWithTenantId(`/api/admin/shifts?year=${year}&month=${month}`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('シフトの取得に失敗しました');
      }

      const shifts: Shift[] = await response.json();

      // 各シフトを削除
      for (const shift of shifts) {
        if (shift.shift_id) {
          const deleteUrl = getApiUrlWithTenantId(`/api/admin/shifts/${shift.shift_id}`);
          await fetch(deleteUrl, {
            method: 'DELETE',
            credentials: 'include',
          });
        }
      }

      alert('シフトを削除しました');
      await loadShifts();
    } catch (error: any) {
      console.error('シフト削除エラー:', error);
      setError(error.message || 'シフトの削除に失敗しました');
    } finally {
      setSaving(false);
    }
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
              <h2 className="text-2xl font-bold text-gray-900">シフト管理（月単位）</h2>
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
                <button
                  onClick={() => setShowCopyDialog(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={saving}
                >
                  月をコピー
                </button>
                <button
                  onClick={handleDeleteMonth}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  月を削除
                </button>
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
                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                        従業員
                      </th>
                      {monthDates.map((date) => {
                        const dateObj = new Date(date);
                        const dayOfWeek = dateObj.getDay();
                        const dayName = dayNames[dayOfWeek];
                        const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                          <th
                            key={date}
                            className={`border border-gray-300 bg-gray-50 p-2 text-center font-semibold min-w-[100px] ${
                              isHoliday ? 'bg-red-50' : isToday ? 'bg-yellow-50' : ''
                            }`}
                          >
                            <div className={`text-xs ${isToday ? 'text-pink-600 font-bold' : isHoliday ? 'text-red-600' : 'text-gray-700'}`}>
                              {dayName}
                            </div>
                            <div className={`text-sm font-bold ${isToday ? 'text-pink-600' : isHoliday ? 'text-red-600' : 'text-gray-900'}`}>
                              {dateObj.getDate()}
                            </div>
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
                        {monthDates.map((date) => {
                          const shift = shifts[date]?.[staffMember.staff_id] || {
                            staff_id: staffMember.staff_id,
                            shift_date: date,
                            start_time: null,
                            end_time: null,
                            is_off: false
                          };
                          const dateObj = new Date(date);
                          const dayOfWeek = dateObj.getDay();
                          const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;
                          const isToday = date === new Date().toISOString().split('T')[0];

                          return (
                            <td
                              key={`${staffMember.staff_id}-${date}`}
                              className={`border border-gray-300 p-2 align-top ${
                                isHoliday ? 'bg-red-50' : isToday ? 'bg-yellow-50' : 'bg-white'
                              }`}
                            >
                              <div className="space-y-1">
                                <label className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={shift.is_off}
                                    onChange={(e) =>
                                      handleShiftChange(date, staffMember.staff_id, 'is_off', e.target.checked)
                                    }
                                    className="h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                  />
                                  <span className="text-xs text-gray-600">休</span>
                                </label>
                                {!shift.is_off && (
                                  <>
                                    <div>
                                      <input
                                        type="time"
                                        value={shift.start_time || ''}
                                        onChange={(e) =>
                                          handleShiftChange(date, staffMember.staff_id, 'start_time', e.target.value)
                                        }
                                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="開始"
                                      />
                                    </div>
                                    <div>
                                      <input
                                        type="time"
                                        value={shift.end_time || ''}
                                        onChange={(e) =>
                                          handleShiftChange(date, staffMember.staff_id, 'end_time', e.target.value)
                                        }
                                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="終了"
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

      {/* 月コピーダイアログ */}
      {showCopyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">月をコピー</h3>
            <p className="text-sm text-gray-600 mb-4">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月のシフトをコピー先の月にコピーします。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                コピー先の月
              </label>
              <input
                type="month"
                value={`${copyTargetMonth.getFullYear()}-${String(copyTargetMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setCopyTargetMonth(new Date(year, month - 1, 1));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCopyDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                onClick={handleCopyMonth}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? 'コピー中...' : 'コピー'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

