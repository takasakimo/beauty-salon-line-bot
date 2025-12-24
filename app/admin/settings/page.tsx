'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function SettingsPage() {
  const router = useRouter();
  const [maxConcurrentReservations, setMaxConcurrentReservations] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // 従業員管理用のstate
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    working_hours: ''
  });
  const [staffError, setStaffError] = useState('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  useEffect(() => {
    loadSettings();
    loadStaff();
    loadMenus();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMaxConcurrentReservations(data.max_concurrent_reservations || 3);
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
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          max_concurrent_reservations: maxConcurrentReservations
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
      const response = await fetch('/api/admin/staff', {
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

  const loadMenus = async () => {
    try {
      const response = await fetch('/api/admin/menus', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMenus(data.filter((m: Menu) => m.is_active));
      }
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  const handleOpenStaffModal = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setStaffFormData({
        name: staffMember.name,
        email: staffMember.email || '',
        phone_number: staffMember.phone_number || '',
        working_hours: staffMember.working_hours || ''
      });
      // 対応可能メニューを設定
      const menuIds = staffMember.available_menus?.map(m => m.menu_id) || [];
      setSelectedMenuIds(menuIds);
    } else {
      setEditingStaff(null);
      setStaffFormData({
        name: '',
        email: '',
        phone_number: '',
        working_hours: ''
      });
      setSelectedMenuIds([]);
    }
    setStaffError('');
    setShowStaffModal(true);
  };

  const handleCloseStaffModal = () => {
    setShowStaffModal(false);
    setEditingStaff(null);
    setStaffFormData({
      name: '',
      email: '',
      phone_number: '',
      working_hours: ''
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
      const url = editingStaff 
        ? `/api/admin/staff/${editingStaff.staff_id}`
        : '/api/admin/staff';
      
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

      handleCloseStaffModal();
      loadStaff();
    } catch (error: any) {
      setStaffError(error.message || '保存に失敗しました');
    }
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      loadStaff();
    } catch (error: any) {
      alert(error.message || '削除に失敗しました');
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
                  href="/admin/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/admin/reservations"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  予約管理
                </Link>
                <Link
                  href="/admin/customers"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  顧客管理
                </Link>
                <Link
                  href="/admin/menus"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
                <Link
                  href="/admin/settings"
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  設定
                </Link>
              </div>
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

                <div className="flex justify-end">
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
        </div>
      </div>

      {/* 従業員追加・編集モーダル */}
      {showStaffModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseStaffModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingStaff ? '従業員を編集' : '従業員を追加'}
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        対応可能なメニュー
                      </label>
                      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                        {menus.length === 0 ? (
                          <p className="text-sm text-gray-500">メニューが登録されていません</p>
                        ) : (
                          <div className="space-y-2">
                            {menus.map((menu) => (
                              <label key={menu.menu_id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedMenuIds.includes(menu.menu_id)}
                                  onChange={() => handleMenuToggle(menu.menu_id)}
                                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                  {menu.name} (¥{menu.price.toLocaleString()}, {menu.duration}分)
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        選択したメニューのみ、このスタッフが対応可能になります
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:col-start-2 sm:text-sm"
                    >
                      {editingStaff ? '更新' : '追加'}
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
    </div>
  );
}

