'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface Menu {
  menu_id: number;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function MenuManagement() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
    category: ''
  });
  const [error, setError] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    description: ''
  });
  const [categoryError, setCategoryError] = useState('');
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isMenusExpanded, setIsMenusExpanded] = useState(true);

  useEffect(() => {
    loadMenus();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/menu-categories');
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
    }
  };

  const handleOpenModal = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        name: menu.name,
        price: menu.price.toString(),
        duration: menu.duration.toString(),
        description: menu.description || '',
        category: menu.category || ''
      });
    } else {
      setEditingMenu(null);
      setFormData({
        name: '',
        price: '',
        duration: '',
        description: '',
        category: ''
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
      description: '',
      category: ''
    });
    setError('');
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        category_name: category.category_name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        category_name: '',
        description: ''
      });
    }
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryFormData({
      category_name: '',
      description: ''
    });
    setCategoryError('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');

    if (!categoryFormData.category_name) {
      setCategoryError('カテゴリ名は必須です');
      return;
    }

    try {
      const url = editingCategory
        ? getApiUrlWithTenantId(`/api/admin/menu-categories/${editingCategory.category_id}`)
        : getApiUrlWithTenantId('/api/admin/menu-categories');

      const method = editingCategory ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          category_name: categoryFormData.category_name,
          description: categoryFormData.description || null,
          is_active: editingCategory ? editingCategory.is_active : true
        }),
      });

      if (response.ok) {
        handleCloseCategoryModal();
        await loadCategories();
        // メニューフォームのカテゴリ選択も更新（メニューモーダルが開いている場合）
        if (!editingCategory && showModal) {
          setFormData({ ...formData, category: categoryFormData.category_name });
        }
      } else {
        const errorData = await response.json();
        setCategoryError(errorData.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('カテゴリ保存エラー:', error);
      setCategoryError('保存に失敗しました');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('このカテゴリを削除しますか？')) return;

    try {
      const url = getApiUrlWithTenantId(`/api/admin/menu-categories/${categoryId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadCategories();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('カテゴリ削除エラー:', error);
      alert('削除に失敗しました');
    }
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
          category: formData.category || null,
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
      const url = getApiUrlWithTenantId(`/api/admin/menus/${menu.menu_id}`);
      const response = await fetch(url, {
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
          category: menu.category,
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

  // メニューをカテゴリごとにグループ化
  const groupedMenus = menus.reduce((acc, menu) => {
    const category = menu.category || 'カテゴリなし';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  // カテゴリをソート（その他とカテゴリなしを最後に）
  const sortedCategories = Object.keys(groupedMenus).sort((a, b) => {
    // 「その他」と「カテゴリなし」を最後に配置
    if (a === 'その他' && b !== 'その他' && b !== 'カテゴリなし') return 1;
    if (b === 'その他' && a !== 'その他' && a !== 'カテゴリなし') return -1;
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    // 「その他」と「カテゴリなし」の順序（その他が先）
    if (a === 'その他' && b === 'カテゴリなし') return -1;
    if (a === 'カテゴリなし' && b === 'その他') return 1;
    return a.localeCompare(b);
  });

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
                  href={getAdminLinkUrl('/admin/dashboard')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  ダッシュボード
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/reservations')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  prefetch={false}
                >
                  予約管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/customers')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  prefetch={false}
                >
                  顧客管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/menus')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">メニュー管理</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => handleOpenCategoryModal()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                カテゴリ追加
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                メニューを追加
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* カテゴリ一覧 */}
          {categories.length > 0 && (
            <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-md">
              <div 
                className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              >
                <h3 className="text-lg font-medium text-gray-900">カテゴリ一覧</h3>
                {isCategoriesExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
              {isCategoriesExpanded && (
                <ul className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <li key={category.category_id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="text-md font-medium text-gray-900">
                              {category.category_name}
                            </h4>
                            {!category.is_active && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                無効
                              </span>
                            )}
                          </div>
                          {category.description && (
                            <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenCategoryModal(category)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.category_id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* メニュー一覧 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div 
              className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => setIsMenusExpanded(!isMenusExpanded)}
            >
              <h3 className="text-lg font-medium text-gray-900">メニュー一覧</h3>
              {isMenusExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
            {isMenusExpanded && (
              <div>
                {menus.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-500">
                    メニューが登録されていません
                  </div>
                ) : (
                  sortedCategories.map((category) => (
                    <div key={category} className="border-b border-gray-200 last:border-b-0">
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-md font-semibold text-gray-700">
                          {category}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({groupedMenus[category].length}件)
                          </span>
                        </h4>
                      </div>
                      <ul className="divide-y divide-gray-200">
                        {groupedMenus[category].map((menu) => (
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
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
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
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                          カテゴリ
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseModal();
                            handleOpenCategoryModal();
                          }}
                          className="text-xs text-pink-600 hover:text-pink-700"
                        >
                          + カテゴリ追加
                        </button>
                      </div>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">選択してください</option>
                        {categories.filter((c) => c.is_active).map((category) => (
                          <option key={category.category_id} value={category.category_name}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
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

      {/* カテゴリモーダル */}
      {showCategoryModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseCategoryModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingCategory ? 'カテゴリを編集' : 'カテゴリを追加'}
                  </h3>
                  <button
                    onClick={handleCloseCategoryModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {categoryError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {categoryError}
                  </div>
                )}

                <form onSubmit={handleCategorySubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="category_name" className="block text-sm font-medium text-gray-700">
                        カテゴリ名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="category_name"
                        required
                        value={categoryFormData.category_name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="category_description" className="block text-sm font-medium text-gray-700">
                        説明
                      </label>
                      <textarea
                        id="category_description"
                        rows={3}
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseCategoryModal}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      {editingCategory ? '更新' : '追加'}
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

