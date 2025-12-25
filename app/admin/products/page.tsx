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

interface Product {
  product_id: number;
  product_name: string;
  product_category: string | null;
  manufacturer: string | null;
  jan_code: string | null;
  unit_price: number;
  stock_quantity: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductManagement() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_category: '',
    manufacturer: '',
    product_name: '',
    jan_code: '',
    unit_price: '',
    stock_quantity: '0',
    description: ''
  });
  const [error, setError] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    description: ''
  });
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/products');
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
        console.error('商品取得エラー:', response.status, errorData);
        setError('商品の取得に失敗しました');
        return;
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('商品取得エラー:', error);
      setError('商品の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/product-categories');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_category: product.product_category || '',
        manufacturer: product.manufacturer || '',
        product_name: product.product_name,
        jan_code: product.jan_code || '',
        unit_price: product.unit_price.toString(),
        stock_quantity: (product.stock_quantity || 0).toString(),
        description: product.description || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_category: '',
        manufacturer: '',
        product_name: '',
        jan_code: '',
        unit_price: '',
        stock_quantity: '0',
        description: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  // 商品名入力時に既存商品から情報を自動入力
  const handleProductNameChange = (productName: string) => {
    setFormData({ ...formData, product_name: productName });
    
    // 既存の商品から同じ商品名を検索
    const existingProduct = products.find(
      (p) => p.product_name.toLowerCase() === productName.toLowerCase()
    );
    
    if (existingProduct && !editingProduct) {
      // 編集時でない場合のみ自動入力
      setFormData({
        ...formData,
        product_name: productName,
        product_category: existingProduct.product_category || '',
        manufacturer: existingProduct.manufacturer || '',
        jan_code: existingProduct.jan_code || '',
        unit_price: existingProduct.unit_price.toString(),
        stock_quantity: (existingProduct.stock_quantity || 0).toString()
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      product_category: '',
      manufacturer: '',
      product_name: '',
      jan_code: '',
      unit_price: '',
      stock_quantity: '0',
      description: ''
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.product_name || !formData.unit_price) {
      setError('商品名と単価は必須です');
      return;
    }

    try {
      const url = editingProduct
        ? getApiUrlWithTenantId(`/api/admin/products/${editingProduct.product_id}`)
        : getApiUrlWithTenantId('/api/admin/products');

      const method = editingProduct ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          product_name: formData.product_name,
          product_category: formData.product_category || null,
          manufacturer: formData.manufacturer || null,
          jan_code: formData.jan_code || null,
          unit_price: parseInt(formData.unit_price),
          stock_quantity: parseInt(formData.stock_quantity) || 0,
          description: formData.description || null,
          is_active: editingProduct ? editingProduct.is_active : true
        }),
      });

      if (response.ok) {
        handleCloseModal();
        loadProducts();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('商品保存エラー:', error);
      setError('保存に失敗しました');
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('この商品を削除しますか？')) return;

    try {
      const url = getApiUrlWithTenantId(`/api/admin/products/${productId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadProducts();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('商品削除エラー:', error);
      alert('削除に失敗しました');
    }
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
        ? getApiUrlWithTenantId(`/api/admin/product-categories/${editingCategory.category_id}`)
        : getApiUrlWithTenantId('/api/admin/product-categories');

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
        loadCategories();
        // 商品フォームのカテゴリ選択も更新
        if (!editingCategory) {
          setFormData({ ...formData, product_category: categoryFormData.category_name });
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
      const url = getApiUrlWithTenantId(`/api/admin/product-categories/${categoryId}`);
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
                <h1 className="text-xl font-semibold text-gray-900">商品管理</h1>
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
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/products')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  商品管理
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
            <h2 className="text-2xl font-bold text-gray-900">商品管理</h2>
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
                商品を追加
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
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">カテゴリ一覧</h3>
              </div>
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
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  商品が登録されていません
                </li>
              ) : (
                products.map((product) => (
                  <li key={product.product_id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            {product.product_name}
                          </h3>
                          {!product.is_active && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              無効
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                          {product.product_category && (
                            <div>カテゴリ: {product.product_category}</div>
                          )}
                          {product.manufacturer && (
                            <div>メーカー: {product.manufacturer}</div>
                          )}
                          {product.jan_code && (
                            <div>JANコード: {product.jan_code}</div>
                          )}
                          <div>単価: ¥{product.unit_price.toLocaleString()}</div>
                          <div>在庫数: {product.stock_quantity || 0}個</div>
                          {product.description && (
                            <div className="md:col-span-2">説明: {product.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.product_id)}
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
                    {editingProduct ? '商品を編集' : '商品を追加'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="product_category" className="block text-sm font-medium text-gray-700">
                          カテゴリ
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenCategoryModal()}
                          className="text-xs text-pink-600 hover:text-pink-700"
                        >
                          + カテゴリ追加
                        </button>
                      </div>
                      <select
                        id="product_category"
                        value={formData.product_category}
                        onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
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
                      <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                        メーカー
                      </label>
                      <input
                        type="text"
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="product_name" className="block text-sm font-medium text-gray-700">
                        商品名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="product_name"
                        required
                        value={formData.product_name}
                        onChange={(e) => handleProductNameChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="jan_code" className="block text-sm font-medium text-gray-700">
                        JANコード
                      </label>
                      <input
                        type="text"
                        id="jan_code"
                        value={formData.jan_code}
                        onChange={(e) => setFormData({ ...formData, jan_code: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="unit_price"
                        required
                        min="0"
                        value={formData.unit_price}
                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                        在庫数
                      </label>
                      <input
                        type="number"
                        id="stock_quantity"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
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

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

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
                      {editingProduct ? '更新' : '追加'}
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

                  {categoryError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {categoryError}
                    </div>
                  )}

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

