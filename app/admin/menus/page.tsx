'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId } from '@/lib/admin-utils';
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
  description: string | null;
  is_active: boolean;
}

export default function MenuManagement() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    description: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/menus');
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        console.error('認証エラー: 401 Unauthorized');
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('メニュー取得エラー:', response.status, errorData);
        setError('メニューの取得に失敗しました');
        return;
      }

      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('メニュー取得エラー:', error);
      setError('メニューの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        name: menu.name,
        price: menu.price.toString(),
        duration: menu.duration.toString(),
        description: menu.description || ''
      });
    } else {
      setEditingMenu(null);
      setFormData({
        name: '',
        price: '',
        duration: '',
        description: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMenu(null);
    setFormData({
      name: '',
      price: '',
      duration: '',
      description: ''
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const baseUrl = editingMenu 
        ? `/api/admin/menus/${editingMenu.menu_id}`
        : '/api/admin/menus';
      const url = getApiUrlWithTenantId(baseUrl);
      
      const method = editingMenu ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          price: parseInt(formData.price),
          duration: parseInt(formData.duration),
          description: formData.description || null,
          is_active: editingMenu ? editingMenu.is_active : true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      handleCloseModal();
      loadMenus();
    } catch (error: any) {
      setError(error.message || '保存に失敗しました');
    }
  };

  const handleDelete = async (menuId: number) => {
    if (!confirm('このメニューを削除してもよろしいですか？')) {
      return;
    }

    try {
      const url = getApiUrlWithTenantId(`/api/admin/menus/${menuId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      loadMenus();
    } catch (error: any) {
      alert(error.message || '削除に失敗しました');
    }
  };

  const handleToggleActive = async (menu: Menu) => {
    try {
      const response = await fetch(`/api/admin/menus/${menu.menu_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: menu.name,
          price: menu.price,
          duration: menu.duration,
          description: menu.description,
          is_active: !menu.is_active
        }),
      });

      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }

      loadMenus();
    } catch (error: any) {
      alert(error.message || '更新に失敗しました');
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
                <h1 className="text-xl font-semibold text-gray-900">メニュー管理</h1>
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
                  prefetch={false}
                >
                  予約管理
                </Link>
                <Link
                  href="/admin/customers"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  prefetch={false}
                >
                  顧客管理
                </Link>
                <Link
                  href="/admin/menus"
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
                <Link
                  href="/admin/settings"
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">メニュー一覧</h2>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              メニューを追加
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {loading ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  読み込み中...
                </li>
              ) : menus.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  メニューが登録されていません
                </li>
              ) : (
                menus.map((menu) => (
                  <li key={menu.menu_id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className={`text-lg font-medium ${!menu.is_active ? 'text-gray-400' : 'text-gray-900'}`}>
                            {menu.name}
                            {!menu.is_active && (
                              <span className="ml-2 text-sm text-gray-500">(無効)</span>
                            )}
                          </h3>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="mr-4">¥{menu.price.toLocaleString()}</span>
                          <span>{menu.duration}分</span>
                          {menu.description && (
                            <span className="ml-4 text-gray-400">{menu.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(menu)}
                          className={`px-3 py-1 text-xs rounded ${
                            menu.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {menu.is_active ? '有効' : '無効'}
                        </button>
                        <button
                          onClick={() => handleOpenModal(menu)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(menu.menu_id)}
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

      {/* モーダル */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingMenu ? 'メニューを編集' : 'メニューを追加'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        メニュー名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                          価格（円） <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="price"
                          required
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                          所要時間（分） <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="duration"
                          required
                          min="1"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        説明
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      {editingMenu ? '更新' : '追加'}
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

