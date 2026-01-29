'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import AdminNav from '@/app/components/AdminNav';
import { 
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';


interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [maxConcurrentReservations, setMaxConcurrentReservations] = useState<number>(3);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: '10:00', close: '19:00', isOpen: true },
    tuesday: { open: '10:00', close: '19:00', isOpen: true },
    wednesday: { open: '10:00', close: '19:00', isOpen: true },
    thursday: { open: '10:00', close: '19:00', isOpen: true },
    friday: { open: '10:00', close: '19:00', isOpen: true },
    saturday: { open: '10:00', close: '19:00', isOpen: true },
    sunday: { open: '10:00', close: '19:00', isOpen: false }
  });
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [temporaryClosedDays, setTemporaryClosedDays] = useState<string[]>([]); // 臨時休業日の日付配列
  const [specialBusinessHours, setSpecialBusinessHours] = useState<Record<string, { open: string; close: string }>>({}); // 特定日の営業時間
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'closed' | 'hours'>('closed'); // カレンダーモード
  const [selectedDateForHours, setSelectedDateForHours] = useState<string>(''); // 営業時間を変更する日付
  const [tempHours, setTempHours] = useState({ open: '10:00', close: '19:00' }); // 一時的な営業時間
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  
  // パスワード変更用のstate
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    // スーパー管理者の場合、tenantIdがURLに含まれているか確認
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      
      if (!tenantId) {
        // tenantIdがない場合、スーパー管理者の可能性があるので警告を表示
        console.warn('警告: URLにtenantIdが含まれていません。スーパー管理者の場合は、店舗詳細ページから「店舗管理画面を開く」ボタンをクリックしてアクセスしてください。');
        setError('店舗IDが指定されていません。スーパー管理者の場合は、店舗詳細ページから「店舗管理画面を開く」ボタンをクリックしてアクセスしてください。');
      }
    }
    
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('loadSettings開始:', {
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
        search: typeof window !== 'undefined' ? window.location.search : 'N/A'
      });
      const url = getApiUrlWithTenantId('/api/admin/settings');
      console.log('loadSettings URL:', url);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMaxConcurrentReservations(data.max_concurrent_reservations || 3);
        
        // 営業時間を設定
        if (data.business_hours && Object.keys(data.business_hours).length > 0) {
          setBusinessHours(data.business_hours);
        }
        
        // 定休日を設定
        if (data.closed_days && Array.isArray(data.closed_days)) {
          setClosedDays(data.closed_days);
        }
        
        // 臨時休業日を設定
        if (data.temporary_closed_days && Array.isArray(data.temporary_closed_days)) {
          setTemporaryClosedDays(data.temporary_closed_days);
        }
        
        // 特定日の営業時間を設定
        if (data.special_business_hours && typeof data.special_business_hours === 'object') {
          setSpecialBusinessHours(data.special_business_hours);
        }
      }
    } catch (error) {
      console.error('設定取得エラー:', error);
      setError('設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const url = getApiUrlWithTenantId('/api/admin/settings');
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          max_concurrent_reservations: maxConcurrentReservations,
          business_hours: businessHours,
          closed_days: closedDays,
          temporary_closed_days: temporaryClosedDays,
          special_business_hours: specialBusinessHours
        })
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || '設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };


  // パスワード変更関数
  const handleOpenPasswordModal = () => {
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess(false);
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const url = getApiUrlWithTenantId('/api/admin/change-password');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        // エラーレスポンスの場合、詳細なエラーメッセージを表示
        const errorMessage = result.error || `エラーが発生しました (ステータス: ${response.status})`;
        setPasswordError(errorMessage);
        console.error('パスワード変更エラー:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          result
        });
        return;
      }

      if (result.success) {
        setPasswordSuccess(true);
        setTimeout(() => {
          handleClosePasswordModal();
          // フォームをリセット
          setPasswordFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }, 2000);
      } else {
        setPasswordError(result.error || 'パスワードの変更に失敗しました');
      }
    } catch (error: any) {
      console.error('パスワード変更エラー:', error);
      setPasswordError(`パスワードの変更中にエラーが発生しました: ${error.message || '不明なエラー'}`);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/admin/settings" title="設定" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Cog6ToothIcon className="h-6 w-6 text-pink-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">店舗設定</h2>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                設定を保存しました
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="max_concurrent_reservations" className="block text-sm font-medium text-gray-700 mb-2">
                    最大同時予約数（出勤人数）
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    同じ時間帯に受け入れられる予約の最大数を設定します。この数を超える予約は受け付けられません。
                  </p>
                  <input
                    type="number"
                    id="max_concurrent_reservations"
                    min="1"
                    max="20"
                    required
                    value={maxConcurrentReservations}
                    onChange={(e) => setMaxConcurrentReservations(parseInt(e.target.value) || 1)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    現在の設定: <span className="font-semibold">{maxConcurrentReservations}人</span>
                  </p>
                </div>

                {/* 営業時間設定 */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    営業時間
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    各曜日の営業時間を設定してください
                  </p>
                  <div className="space-y-3">
                    {[
                      { key: 'monday', label: '月曜日' },
                      { key: 'tuesday', label: '火曜日' },
                      { key: 'wednesday', label: '水曜日' },
                      { key: 'thursday', label: '木曜日' },
                      { key: 'friday', label: '金曜日' },
                      { key: 'saturday', label: '土曜日' },
                      { key: 'sunday', label: '日曜日' }
                    ].map((day) => (
                      <div key={day.key} className="flex items-center space-x-4">
                        <div className="w-20">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={businessHours[day.key]?.isOpen ?? true}
                              onChange={(e) => {
                                setBusinessHours(prev => ({
                                  ...prev,
                                  [day.key]: {
                                    ...prev[day.key],
                                    isOpen: e.target.checked,
                                    open: prev[day.key]?.open || '10:00',
                                    close: prev[day.key]?.close || '19:00'
                                  }
                                }));
                              }}
                              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">{day.label}</span>
                          </label>
                        </div>
                        {businessHours[day.key]?.isOpen && (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="time"
                              value={businessHours[day.key]?.open || '10:00'}
                              onChange={(e) => {
                                setBusinessHours(prev => ({
                                  ...prev,
                                  [day.key]: {
                                    ...prev[day.key],
                                    open: e.target.value
                                  }
                                }));
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-sm"
                            />
                            <span className="text-gray-500">〜</span>
                            <input
                              type="time"
                              value={businessHours[day.key]?.close || '19:00'}
                              onChange={(e) => {
                                setBusinessHours(prev => ({
                                  ...prev,
                                  [day.key]: {
                                    ...prev[day.key],
                                    close: e.target.value
                                  }
                                }));
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-sm"
                            />
                          </div>
                        )}
                        {!businessHours[day.key]?.isOpen && (
                          <span className="text-sm text-gray-400">定休日</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 定休日設定（別の方法） */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    定休日（複数選択可）
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    定休日として設定する曜日を選択してください（営業時間の設定と連動します）
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 0, label: '日曜日' },
                      { value: 1, label: '月曜日' },
                      { value: 2, label: '火曜日' },
                      { value: 3, label: '水曜日' },
                      { value: 4, label: '木曜日' },
                      { value: 5, label: '金曜日' },
                      { value: 6, label: '土曜日' }
                    ].map((day) => (
                      <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={closedDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClosedDays(prev => [...prev, day.value]);
                              // 営業時間の設定も更新
                              const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                              setBusinessHours(prev => ({
                                ...prev,
                                [dayKeys[day.value]]: {
                                  ...prev[dayKeys[day.value]],
                                  isOpen: false
                                }
                              }));
                            } else {
                              setClosedDays(prev => prev.filter(d => d !== day.value));
                              // 営業時間の設定も更新
                              const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                              setBusinessHours(prev => ({
                                ...prev,
                                [dayKeys[day.value]]: {
                                  ...prev[dayKeys[day.value]],
                                  isOpen: true,
                                  open: prev[dayKeys[day.value]]?.open || '10:00',
                                  close: prev[dayKeys[day.value]]?.close || '19:00'
                                }
                              }));
                            }
                          }}
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 臨時休業設定 */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    臨時休業設定
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    カレンダーから日付を選択して臨時休業日を設定できます
                  </p>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarYear(now.getFullYear());
                        setCalendarMonth(now.getMonth());
                        setCalendarMode('closed');
                        setShowCalendarModal(true);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      臨時休業日を設定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarYear(now.getFullYear());
                        setCalendarMonth(now.getMonth());
                        setCalendarMode('hours');
                        setShowCalendarModal(true);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      営業時間を変更
                    </button>
                  </div>
                  
                  {/* 臨時休業日一覧 */}
                  {temporaryClosedDays.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">設定済み臨時休業日:</p>
                      <div className="flex flex-wrap gap-2">
                        {temporaryClosedDays.map((date) => {
                          const dateObj = new Date(date);
                          const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
                          return (
                            <span
                              key={date}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                            >
                              {dateObj.getMonth() + 1}/{dateObj.getDate()}({dayName})
                              <button
                                type="button"
                                onClick={() => {
                                  setTemporaryClosedDays(prev => prev.filter(d => d !== date));
                                }}
                                className="ml-2 text-red-600 hover:text-red-800"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* 特別営業時間一覧 */}
                  {Object.keys(specialBusinessHours).length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">設定済み特別営業時間:</p>
                      <div className="space-y-2">
                        {Object.entries(specialBusinessHours).map(([date, hours]) => {
                          const dateObj = new Date(date);
                          const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
                          return (
                            <div key={date} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-md">
                              <span className="text-sm text-gray-700">
                                {dateObj.getMonth() + 1}/{dateObj.getDate()}({dayName}): {hours.open} 〜 {hours.close}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newHours = { ...specialBusinessHours };
                                  delete newHours[date];
                                  setSpecialBusinessHours(newHours);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-gray-200 pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* パスワード変更セクション */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Cog6ToothIcon className="h-6 w-6 text-pink-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">ログインパスワード変更</h2>
              </div>
              <button
                onClick={handleOpenPasswordModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                パスワードを変更
              </button>
            </div>
            <p className="text-sm text-gray-600">
              ログインに使用するパスワードを変更できます。定期的なパスワード変更をお勧めします。
            </p>
          </div>

              </div>
            </div>

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClosePasswordModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    ログインパスワード変更
                  </h3>
                  <button
                    onClick={handleClosePasswordModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {passwordError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    パスワードを変更しました
                  </div>
                )}

                <form onSubmit={handlePasswordChange}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                        現在のパスワード {passwordFormData.currentPassword || '(パスワード未設定の場合は空白のまま)'}
                      </label>
                      <input
                        type="password"
                        id="current_password"
                        value={passwordFormData.currentPassword}
                        onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        disabled={changingPassword || passwordSuccess}
                        placeholder="パスワード未設定の場合は空白のまま"
                      />
                      <p className="mt-1 text-xs text-gray-500">パスワードが設定されていない場合は空白のままで変更できます</p>
                    </div>

                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                        新しいパスワード <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="new_password"
                        required
                        minLength={6}
                        value={passwordFormData.newPassword}
                        onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        disabled={changingPassword || passwordSuccess}
                      />
                      <p className="mt-1 text-xs text-gray-500">6文字以上で入力してください</p>
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                        新しいパスワード（確認） <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirm_password"
                        required
                        minLength={6}
                        value={passwordFormData.confirmPassword}
                        onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        disabled={changingPassword || passwordSuccess}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={changingPassword || passwordSuccess}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
                    >
                      {changingPassword ? '変更中...' : passwordSuccess ? '変更完了' : 'パスワードを変更'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClosePasswordModal}
                      disabled={changingPassword}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カレンダーモーダル */}
      {showCalendarModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCalendarModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {calendarMode === 'closed' ? '臨時休業日を選択' : '営業時間を変更する日付を選択'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCalendarModal(false);
                      setSelectedDateForHours('');
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
    </div>

                {calendarMode === 'closed' ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      休業日にしたい日付をクリックしてください
                    </p>
                    
                    {/* 年月選択 */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (calendarMonth === 0) {
                            setCalendarYear(prev => prev - 1);
                            setCalendarMonth(11);
                          } else {
                            setCalendarMonth(prev => prev - 1);
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2">
                        <select
                          value={calendarYear}
                          onChange={(e) => setCalendarYear(parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - 1 + i;
                            return (
                              <option key={year} value={year}>{year}年</option>
                            );
                          })}
                        </select>
                        <select
                          value={calendarMonth}
                          onChange={(e) => setCalendarMonth(parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>{i + 1}月</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (calendarMonth === 11) {
                            setCalendarYear(prev => prev + 1);
                            setCalendarMonth(0);
                          } else {
                            setCalendarMonth(prev => prev + 1);
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* 曜日ヘッダー */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-gray-700 p-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* カレンダーグリッド */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {(() => {
                        const today = new Date();
                        const firstDay = new Date(calendarYear, calendarMonth, 1);
                        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
                        const startDay = firstDay.getDay();
                        const daysInMonth = lastDay.getDate();
                        
                        const dates: (Date | null)[] = [];
                        
                        // 前月の空白を埋める
                        for (let i = 0; i < startDay; i++) {
                          dates.push(null);
                        }
                        
                        // 今月の日付を追加
                        for (let day = 1; day <= daysInMonth; day++) {
                          dates.push(new Date(calendarYear, calendarMonth, day));
                        }
                        
                        return dates.map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="p-2"></div>;
                          }
                          
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const isClosed = temporaryClosedDays.includes(dateStr);
                          const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          const isToday = dateStr === todayStr;
                          
                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => {
                                if (isClosed) {
                                  setTemporaryClosedDays(prev => prev.filter(d => d !== dateStr));
                                } else {
                                  setTemporaryClosedDays(prev => [...prev, dateStr]);
                                }
                              }}
                              className={`p-2 text-sm rounded ${
                                isClosed
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : isToday
                                  ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <div>{date.getDate()}</div>
                              <div className="text-xs">{dayName}</div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedDateForHours ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          {selectedDateForHours} の営業時間を設定してください
                        </p>
                        <div className="flex items-center space-x-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                            <input
                              type="time"
                              value={tempHours.open}
                              onChange={(e) => setTempHours(prev => ({ ...prev, open: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                            <input
                              type="time"
                              value={tempHours.close}
                              onChange={(e) => setTempHours(prev => ({ ...prev, close: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSpecialBusinessHours(prev => ({
                                ...prev,
                                [selectedDateForHours]: tempHours
                              }));
                              setSelectedDateForHours('');
                              setTempHours({ open: '10:00', close: '19:00' });
                            }}
                            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                          >
                            設定
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateForHours('');
                              setTempHours({ open: '10:00', close: '19:00' });
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {selectedDateForHours ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-4">
                              {selectedDateForHours} の営業時間を設定してください
                            </p>
                            <div className="flex items-center space-x-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                                <input
                                  type="time"
                                  value={tempHours.open}
                                  onChange={(e) => setTempHours(prev => ({ ...prev, open: e.target.value }))}
                                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                                <input
                                  type="time"
                                  value={tempHours.close}
                                  onChange={(e) => setTempHours(prev => ({ ...prev, close: e.target.value }))}
                                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecialBusinessHours(prev => ({
                                    ...prev,
                                    [selectedDateForHours]: tempHours
                                  }));
                                  setSelectedDateForHours('');
                                  setTempHours({ open: '10:00', close: '19:00' });
                                }}
                                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                              >
                                設定
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDateForHours('');
                                  setTempHours({ open: '10:00', close: '19:00' });
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600 mb-4">
                              営業時間を変更したい日付をクリックしてください
                            </p>
                            
                            {/* 年月選択 */}
                            <div className="flex items-center justify-between mb-4">
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 0) {
                                    setCalendarYear(prev => prev - 1);
                                    setCalendarMonth(11);
                                  } else {
                                    setCalendarMonth(prev => prev - 1);
                                  }
                                }}
                                className="p-2 hover:bg-gray-100 rounded"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <div className="flex items-center gap-2">
                                <select
                                  value={calendarYear}
                                  onChange={(e) => setCalendarYear(parseInt(e.target.value))}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                >
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() - 1 + i;
                                    return (
                                      <option key={year} value={year}>{year}年</option>
                                    );
                                  })}
                                </select>
                                <select
                                  value={calendarMonth}
                                  onChange={(e) => setCalendarMonth(parseInt(e.target.value))}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                >
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>{i + 1}月</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 11) {
                                    setCalendarYear(prev => prev + 1);
                                    setCalendarMonth(0);
                                  } else {
                                    setCalendarMonth(prev => prev + 1);
                                  }
                                }}
                                className="p-2 hover:bg-gray-100 rounded"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* 曜日ヘッダー */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                                <div key={day} className="text-center text-sm font-medium text-gray-700 p-2">
                                  {day}
                                </div>
                              ))}
                            </div>
                            
                            {/* カレンダーグリッド */}
                            <div className="grid grid-cols-7 gap-2">
                              {(() => {
                                const today = new Date();
                                const firstDay = new Date(calendarYear, calendarMonth, 1);
                                const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
                                const startDay = firstDay.getDay();
                                const daysInMonth = lastDay.getDate();
                                
                                const dates: (Date | null)[] = [];
                                
                                // 前月の空白を埋める
                                for (let i = 0; i < startDay; i++) {
                                  dates.push(null);
                                }
                                
                                // 今月の日付を追加
                                for (let day = 1; day <= daysInMonth; day++) {
                                  dates.push(new Date(calendarYear, calendarMonth, day));
                                }
                                
                                return dates.map((date, index) => {
                                  if (!date) {
                                    return <div key={`empty-${index}`} className="p-2"></div>;
                                  }
                                  
                                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                  const hasSpecialHours = specialBusinessHours[dateStr];
                                  const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                  const isToday = dateStr === todayStr;
                                  
                                  return (
                                    <button
                                      key={dateStr}
                                      type="button"
                                      onClick={() => {
                                        setSelectedDateForHours(dateStr);
                                        if (hasSpecialHours) {
                                          setTempHours(hasSpecialHours);
                                        } else {
                                          setTempHours({ open: '10:00', close: '19:00' });
                                        }
                                      }}
                                      className={`p-2 text-sm rounded ${
                                        hasSpecialHours
                                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                                          : isToday
                                          ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      <div>{date.getDate()}</div>
                                      <div className="text-xs">{dayName}</div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarModal(false);
                      setSelectedDateForHours('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

