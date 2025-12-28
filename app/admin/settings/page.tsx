'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Menu {
  menu_id: number;
  name: string;
  price: number;
  duration: number;
  is_active?: boolean;
}

interface Staff {
  staff_id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  working_hours: string | null;
  created_date: string;
  available_menus?: Array<{ menu_id: number; name: string }>;
}

interface Admin {
  admin_id: number;
  username: string;
  email: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // 従業員管理用のstate
  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [selectedRole, setSelectedRole] = useState<'staff' | 'admin'>('staff');
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    working_hours: ''
  });
  const [adminFormData, setAdminFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: ''
  });
  const [staffError, setStaffError] = useState('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  
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
    loadStaff();
    loadAdmins();
    loadMenus();
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

  // 従業員管理関数
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
      setStaffError('スタッフの取得に失敗しました');
    } finally {
      setLoadingStaff(false);
    }
  };

  // 管理者一覧取得関数
  const loadAdmins = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/admins');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error('管理者取得エラー:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadMenus = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/menus');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const activeMenus = data.filter((m: Menu) => m.is_active);
        setMenus(activeMenus);
        console.log('メニュー読み込み完了:', activeMenus.length, '件');
      } else {
        console.error('メニュー取得エラー:', response.status);
      }
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  const handleOpenStaffModal = (staffMember?: Staff, adminMember?: Admin) => {
    if (staffMember) {
      setSelectedRole('staff');
      setEditingStaff(staffMember);
      setEditingAdmin(null);
      setStaffFormData({
        name: staffMember.name,
        email: staffMember.email || '',
        phone_number: staffMember.phone_number || '',
        working_hours: staffMember.working_hours || ''
      });
      // 対応可能メニューを設定
      const menuIds = staffMember.available_menus?.map(m => m.menu_id) || [];
      setSelectedMenuIds(menuIds);
    } else if (adminMember) {
      setSelectedRole('admin');
      setEditingAdmin(adminMember);
      setEditingStaff(null);
      setAdminFormData({
        username: adminMember.username,
        password: '',
        fullName: adminMember.full_name,
        email: adminMember.email || ''
      });
    } else {
      setSelectedRole('staff');
      setEditingStaff(null);
      setEditingAdmin(null);
      setStaffFormData({
        name: '',
        email: '',
        phone_number: '',
        working_hours: ''
      });
      setAdminFormData({
        username: '',
        password: '',
        fullName: '',
        email: ''
      });
      setSelectedMenuIds([]);
    }
    setStaffError('');
    setShowStaffModal(true);
  };

  const handleCloseStaffModal = () => {
    setShowStaffModal(false);
    setEditingStaff(null);
    setEditingAdmin(null);
    setSelectedRole('staff');
    setStaffFormData({
      name: '',
      email: '',
      phone_number: '',
      working_hours: ''
    });
    setAdminFormData({
      username: '',
      password: '',
      fullName: '',
      email: ''
    });
    setSelectedMenuIds([]);
    setStaffError('');
  };

  const handleMenuToggle = (menuId: number) => {
    setSelectedMenuIds(prev => 
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    try {
      if (selectedRole === 'admin') {
        // 管理者の追加・編集
        const baseUrl = editingAdmin 
          ? `/api/admin/admins/${editingAdmin.admin_id}`
          : '/api/admin/admins';
        const url = getApiUrlWithTenantId(baseUrl);
        
        const method = editingAdmin ? 'PUT' : 'POST';
        
        const requestBody: any = {
          username: adminFormData.username,
          fullName: adminFormData.fullName || adminFormData.username,
          email: adminFormData.email || null
        };

        // 新規作成時またはパスワードが入力されている場合はパスワードを含める
        if (!editingAdmin || adminFormData.password) {
          if (!adminFormData.password || adminFormData.password.length < 6) {
            setStaffError('パスワードは6文字以上である必要があります');
            return;
          }
          requestBody.password = adminFormData.password;
        }

        // 編集時はisActiveも含める
        if (editingAdmin) {
          requestBody.isActive = editingAdmin.is_active;
        }
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました');
        }

        await loadAdmins();
        handleCloseStaffModal();
      } else {
        // 従業員の追加・編集
        const baseUrl = editingStaff 
          ? `/api/admin/staff/${editingStaff.staff_id}`
          : '/api/admin/staff';
        const url = getApiUrlWithTenantId(baseUrl);
        
        const method = editingStaff ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: staffFormData.name,
            email: staffFormData.email || null,
            phone_number: staffFormData.phone_number || null,
            working_hours: staffFormData.working_hours || null,
            menu_ids: selectedMenuIds
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました');
        }

        await loadStaff();
        handleCloseStaffModal();
      }
    } catch (error: any) {
      console.error('保存エラー:', error);
      setStaffError(error.message || '保存に失敗しました');
    }
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) {
      return;
    }

    try {
      const url = getApiUrlWithTenantId(`/api/admin/staff/${staffId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      await loadAdmins();
    } catch (error: any) {
      console.error('管理者削除エラー:', error);
      setStaffError(error.message || '削除に失敗しました');
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm('この管理者を削除してもよろしいですか？')) {
      return;
    }

    try {
      const url = getApiUrlWithTenantId(`/api/admin/admins/${adminId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      await loadAdmins();
    } catch (error: any) {
      console.error('管理者削除エラー:', error);
      setStaffError(error.message || '削除に失敗しました');
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

      if (result.success) {
        setPasswordSuccess(true);
        setTimeout(() => {
          handleClosePasswordModal();
        }, 2000);
      } else {
        setPasswordError(result.error || 'パスワードの変更に失敗しました');
      }
    } catch (error: any) {
      setPasswordError('パスワードの変更中にエラーが発生しました');
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
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">設定</h1>
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
                  href={getAdminLinkUrl('/admin/settings')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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

          {/* 従業員管理セクション */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Cog6ToothIcon className="h-6 w-6 text-pink-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">従業員管理</h2>
              </div>
              <button
                onClick={() => handleOpenStaffModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                従業員を追加
              </button>
            </div>

            {staffError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {staffError}
              </div>
            )}

            {/* 従業員一覧 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">従業員一覧</h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {loadingStaff ? (
                    <li className="px-6 py-4 text-center text-gray-500">
                      読み込み中...
                    </li>
                  ) : staff.length === 0 ? (
                    <li className="px-6 py-4 text-center text-gray-500">
                      従業員が登録されていません
                    </li>
                  ) : (
                    staff.map((staffMember) => (
                      <li key={staffMember.staff_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {staffMember.name}
                            </h3>
                            <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                              {staffMember.email && (
                                <span>{staffMember.email}</span>
                              )}
                              {staffMember.phone_number && (
                                <span>{staffMember.phone_number}</span>
                              )}
                              {staffMember.working_hours && (
                                <span>勤務時間: {staffMember.working_hours}</span>
                              )}
                            </div>
                            {staffMember.available_menus && staffMember.available_menus.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">対応可能メニュー:</p>
                                <div className="flex flex-wrap gap-1">
                                  {staffMember.available_menus.map((menu: { menu_id: number; name: string }) => (
                                    <span key={menu.menu_id} className="inline-block px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded">
                                      {menu.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenStaffModal(staffMember)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staffMember.staff_id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* 管理者一覧 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">管理者一覧</h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {loadingAdmins ? (
                    <li className="px-6 py-4 text-center text-gray-500">
                      読み込み中...
                    </li>
                  ) : admins.length === 0 ? (
                    <li className="px-6 py-4 text-center text-gray-500">
                      管理者が登録されていません
                    </li>
                  ) : (
                    admins.map((adminMember) => (
                      <li key={adminMember.admin_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {adminMember.full_name || adminMember.username}
                            </h3>
                            <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                              <span>ユーザー名: {adminMember.username}</span>
                              {adminMember.email && (
                                <span>{adminMember.email}</span>
                              )}
                              <span className={`px-2 py-1 text-xs rounded ${adminMember.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {adminMember.is_active ? '有効' : '無効'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenStaffModal(undefined, adminMember)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(adminMember.admin_id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 従業員追加・編集モーダル */}
      {showStaffModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseStaffModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedRole === 'admin' 
                      ? (editingAdmin ? '管理者を編集' : '管理者を追加')
                      : (editingStaff ? '従業員を編集' : '従業員を追加')
                    }
                  </h3>
                  <button
                    onClick={handleCloseStaffModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {staffError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {staffError}
                  </div>
                )}

                <form onSubmit={handleStaffSubmit}>
                  <div className="space-y-4">
                    {/* ロール選択 */}
                    {!editingStaff && !editingAdmin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ロール <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="role"
                              value="staff"
                              checked={selectedRole === 'staff'}
                              onChange={(e) => {
                                setSelectedRole('staff');
                                setEditingAdmin(null);
                                setEditingStaff(null);
                              }}
                              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">従業員</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="role"
                              value="admin"
                              checked={selectedRole === 'admin'}
                              onChange={(e) => {
                                setSelectedRole('admin');
                                setEditingAdmin(null);
                                setEditingStaff(null);
                              }}
                              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">管理者</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {selectedRole === 'admin' ? (
                      // 管理者フォーム
                      <>
                        <div>
                          <label htmlFor="admin_username" className="block text-sm font-medium text-gray-700 mb-1">
                            ユーザー名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="admin_username"
                            required
                            value={adminFormData.username}
                            onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-1">
                            パスワード {!editingAdmin && <span className="text-red-500">*</span>}
                            {editingAdmin && <span className="text-gray-500 text-xs ml-2">(変更する場合のみ入力)</span>}
                          </label>
                          <input
                            type="password"
                            id="admin_password"
                            required={!editingAdmin}
                            value={adminFormData.password}
                            onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder={editingAdmin ? "変更する場合のみ入力" : "6文字以上"}
                          />
                          <p className="mt-1 text-xs text-gray-500">6文字以上で入力してください</p>
                        </div>

                        <div>
                          <label htmlFor="admin_fullName" className="block text-sm font-medium text-gray-700 mb-1">
                            氏名
                          </label>
                          <input
                            type="text"
                            id="admin_fullName"
                            value={adminFormData.fullName}
                            onChange={(e) => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">
                            メールアドレス
                          </label>
                          <input
                            type="email"
                            id="admin_email"
                            value={adminFormData.email}
                            onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>
                      </>
                    ) : (
                      // 従業員フォーム
                      <>
                        <div>
                          <label htmlFor="staff_name" className="block text-sm font-medium text-gray-700 mb-1">
                            名前 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="staff_name"
                            required
                            value={staffFormData.name}
                            onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="staff_email" className="block text-sm font-medium text-gray-700 mb-1">
                            メールアドレス
                          </label>
                          <input
                            type="email"
                            id="staff_email"
                            value={staffFormData.email}
                            onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="staff_phone" className="block text-sm font-medium text-gray-700 mb-1">
                            電話番号
                          </label>
                          <input
                            type="tel"
                            id="staff_phone"
                            value={staffFormData.phone_number}
                            onChange={(e) => setStaffFormData({ ...staffFormData, phone_number: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="staff_working_hours" className="block text-sm font-medium text-gray-700 mb-1">
                            勤務時間
                          </label>
                          <input
                            type="text"
                            id="staff_working_hours"
                            placeholder="例: 10:00-19:00"
                            value={staffFormData.working_hours}
                            onChange={(e) => setStaffFormData({ ...staffFormData, working_hours: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>

                    {selectedRole === 'staff' && (
                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          対応可能なメニュー
                          <span className="ml-2 text-gray-500 font-normal text-xs">
                            ({menus.length}件のメニューから選択)
                          </span>
                        </label>
                      {loadingStaff ? (
                        <div className="border border-gray-300 rounded-md p-4 text-center">
                          <p className="text-sm text-gray-500">メニューを読み込み中...</p>
                        </div>
                      ) : menus.length === 0 ? (
                        <div className="border border-gray-300 rounded-md p-4 text-center bg-yellow-50">
                          <p className="text-sm text-gray-700 font-medium">メニューが登録されていません</p>
                          <p className="text-xs text-gray-500 mt-1">まず「メニュー管理」からメニューを追加してください</p>
                        </div>
                      ) : (
                        <>
                          <div className="max-h-64 overflow-y-auto border-2 border-gray-300 rounded-md p-4 bg-white">
                            <div className="space-y-3">
                              {menus.map((menu) => (
                                <label 
                                  key={menu.menu_id} 
                                  className="flex items-start space-x-3 cursor-pointer hover:bg-pink-50 p-3 rounded-lg transition-colors border border-transparent hover:border-pink-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedMenuIds.includes(menu.menu_id)}
                                    onChange={() => handleMenuToggle(menu.menu_id)}
                                    className="mt-0.5 h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-gray-900 block">
                                      {menu.name}
                                    </span>
                                    <span className="text-xs text-gray-600 mt-1 block">
                                      ¥{menu.price.toLocaleString()} / {menu.duration}分
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-gray-600">
                              <span className="font-medium text-pink-600">{selectedMenuIds.length}件</span> 選択中
                            </p>
                            {selectedMenuIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedMenuIds([])}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                すべて解除
                              </button>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
                            選択したメニューのみ、このスタッフが対応可能になります。未選択のメニューは予約時にこのスタッフを選択できません。
                          </p>
                        </>
                      )}
                      </div>
                    )}
                      </>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:col-start-2 sm:text-sm"
                    >
                      {selectedRole === 'admin' 
                        ? (editingAdmin ? '更新' : '追加')
                        : (editingStaff ? '更新' : '追加')
                      }
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseStaffModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:col-start-1 sm:text-sm"
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
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {(() => {
                        const today = new Date();
                        const dates: Date[] = [];
                        // 今日から3ヶ月分の日付を生成
                        for (let i = 0; i < 90; i++) {
                          const date = new Date(today);
                          date.setDate(today.getDate() + i);
                          dates.push(date);
                        }
                        return dates.map((date) => {
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const isClosed = temporaryClosedDays.includes(dateStr);
                          const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                          const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          
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
                                  ? 'bg-red-500 text-white'
                                  : isToday
                                  ? 'bg-pink-100 text-pink-700'
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
                        <p className="text-sm text-gray-600 mb-4">
                          営業時間を変更したい日付をクリックしてください
                        </p>
                        <div className="grid grid-cols-7 gap-2">
                          {(() => {
                            const today = new Date();
                            const dates: Date[] = [];
                            // 今日から3ヶ月分の日付を生成
                            for (let i = 0; i < 90; i++) {
                              const date = new Date(today);
                              date.setDate(today.getDate() + i);
                              dates.push(date);
                            }
                            return dates.map((date) => {
                              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                              const hasSpecialHours = specialBusinessHours[dateStr];
                              const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                              const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                              
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
                                      ? 'bg-blue-500 text-white'
                                      : isToday
                                      ? 'bg-pink-100 text-pink-700'
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

