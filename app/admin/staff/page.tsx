'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
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
  image_url: string | null;
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

export default function StaffManagement() {
  const router = useRouter();
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
    working_hours_start: '10:00',
    working_hours_end: '19:00'
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
  const [staffImageFile, setStaffImageFile] = useState<File | null>(null);
  const [staffImagePreview, setStaffImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadStaff();
    loadAdmins();
    loadMenus();
  }, []);

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
      }
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  // working_hoursを開始時間と終了時間にパース
  const parseWorkingHours = (workingHours: string | null) => {
    if (!workingHours) {
      return { start: '10:00', end: '19:00' };
    }
    const match = workingHours.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (match) {
      return { start: match[1], end: match[2] };
    }
    return { start: '10:00', end: '19:00' };
  };

  const handleOpenStaffModal = (staffMember?: Staff, adminMember?: Admin) => {
    if (staffMember) {
      setSelectedRole('staff');
      setEditingStaff(staffMember);
      setEditingAdmin(null);
      const { start, end } = parseWorkingHours(staffMember.working_hours);
      setStaffFormData({
        name: staffMember.name,
        email: staffMember.email || '',
        phone_number: staffMember.phone_number || '',
        working_hours_start: start,
        working_hours_end: end
      });
      const menuIds = staffMember.available_menus?.map(m => m.menu_id) || [];
      setSelectedMenuIds(menuIds);
      setStaffImagePreview(staffMember.image_url || null);
      setStaffImageFile(null);
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
        working_hours_start: '10:00',
        working_hours_end: '19:00'
      });
      setAdminFormData({
        username: '',
        password: '',
        fullName: '',
        email: ''
      });
      setSelectedMenuIds([]);
      setStaffImagePreview(null);
      setStaffImageFile(null);
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
      working_hours_start: '10:00',
      working_hours_end: '19:00'
    });
    setAdminFormData({
      username: '',
      password: '',
      fullName: '',
      email: ''
    });
    setSelectedMenuIds([]);
    setStaffImagePreview(null);
    setStaffImageFile(null);
    setStaffError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setStaffError('画像ファイルのみ選択可能です');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setStaffError('ファイルサイズは5MB以下にしてください');
        return;
      }
      setStaffImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async (staffId: number) => {
    if (!staffImageFile) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', staffImageFile);
      formData.append('staff_id', staffId.toString());

      const url = getApiUrlWithTenantId('/api/admin/staff/upload-image');
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '画像のアップロードに失敗しました');
      }

      const data = await response.json();
      return data.image_url;
    } catch (error: any) {
      console.error('画像アップロードエラー:', error);
      setStaffError(error.message || '画像のアップロードに失敗しました');
      return null;
    } finally {
      setUploadingImage(false);
    }
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

        if (!editingAdmin || adminFormData.password) {
          if (!adminFormData.password || adminFormData.password.length < 6) {
            setStaffError('パスワードは6文字以上である必要があります');
            return;
          }
          requestBody.password = adminFormData.password;
        }

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
        const baseUrl = editingStaff 
          ? `/api/admin/staff/${editingStaff.staff_id}`
          : '/api/admin/staff';
        const url = getApiUrlWithTenantId(baseUrl);
        
        const method = editingStaff ? 'PUT' : 'POST';
        
        // working_hoursを結合（"HH:MM-HH:MM"形式）
        const workingHours = staffFormData.working_hours_start && staffFormData.working_hours_end
          ? `${staffFormData.working_hours_start}-${staffFormData.working_hours_end}`
          : null;
        
        // 画像が選択されている場合は先にアップロード
        let imageUrl = editingStaff?.image_url || null;
        if (staffImageFile) {
          if (editingStaff) {
            // 更新時は既存のstaff_idを使用
            imageUrl = await handleImageUpload(editingStaff.staff_id);
          } else {
            // 新規作成時は一旦画像なしで保存してからアップロード
            const tempResponse = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                name: staffFormData.name,
                email: staffFormData.email || null,
                phone_number: staffFormData.phone_number || null,
                working_hours: workingHours,
                menu_ids: selectedMenuIds,
                image_url: null
              }),
            });

            if (!tempResponse.ok) {
              const errorData = await tempResponse.json();
              throw new Error(errorData.error || '保存に失敗しました');
            }

            const savedStaff = await tempResponse.json();
            const staffId = savedStaff.staff_id;
            imageUrl = await handleImageUpload(staffId);
            
            // 画像URLを更新
            const updateUrl = getApiUrlWithTenantId(`/api/admin/staff/${staffId}`);
            await fetch(updateUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                name: staffFormData.name,
                email: staffFormData.email || null,
                phone_number: staffFormData.phone_number || null,
                working_hours: workingHours,
                menu_ids: selectedMenuIds,
                image_url: imageUrl
              }),
            });
            await loadStaff();
            handleCloseStaffModal();
            return;
          }
        }
        
        // スタッフ情報を保存（画像URLを含む）
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
            working_hours: workingHours,
            menu_ids: selectedMenuIds,
            image_url: imageUrl
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

      await loadStaff();
    } catch (error: any) {
      console.error('スタッフ削除エラー:', error);
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">従業員管理</h1>
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
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  従業員管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/settings')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
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
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0">
                              {staffMember.image_url ? (
                                <img
                                  src={staffMember.image_url}
                                  alt={staffMember.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">写真なし</span>
                                </div>
                              )}
                            </div>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            勤務時間
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="staff_working_hours_start" className="block text-xs text-gray-500 mb-1">
                                開始時間
                              </label>
                              <input
                                type="time"
                                id="staff_working_hours_start"
                                value={staffFormData.working_hours_start}
                                onChange={(e) => setStaffFormData({ ...staffFormData, working_hours_start: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="staff_working_hours_end" className="block text-xs text-gray-500 mb-1">
                                終了時間
                              </label>
                              <input
                                type="time"
                                id="staff_working_hours_end"
                                value={staffFormData.working_hours_end}
                                onChange={(e) => setStaffFormData({ ...staffFormData, working_hours_end: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="staff_image" className="block text-sm font-medium text-gray-700 mb-1">
                            スタッフ写真
                          </label>
                          <div className="flex items-center space-x-4">
                            {staffImagePreview && (
                              <div className="relative">
                                <img
                                  src={staffImagePreview}
                                  alt="プレビュー"
                                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <input
                                type="file"
                                id="staff_image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                              />
                              <p className="mt-1 text-xs text-gray-500">5MB以下の画像ファイルを選択してください</p>
                            </div>
                          </div>
                        </div>

                        {selectedRole === 'staff' && (
                          <div className="border-t border-gray-200 pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              対応可能なメニュー
                              <span className="ml-2 text-gray-500 font-normal text-xs">
                                ({menus.length}件のメニューから選択)
                              </span>
                            </label>
                            {menus.length === 0 ? (
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
                                  <div className="flex gap-3">
                                    {selectedMenuIds.length < menus.length && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMenuIds(menus.map(m => m.menu_id))}
                                        className="text-xs text-pink-600 hover:text-pink-700 underline"
                                      >
                                        全て選択
                                      </button>
                                    )}
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
    </div>
  );
}

