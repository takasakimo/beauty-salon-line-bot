'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import AdminNav from '@/app/components/AdminNav';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShoppingBagIcon
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
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [saleFormData, setSaleFormData] = useState({
    customer_id: '',
    quantity: '1',
    staff_id: '',
    purchase_date: '',
    purchase_time: '',
    notes: ''
  });
  const [saleError, setSaleError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showBulkSaleModal, setShowBulkSaleModal] = useState(false);
  const [bulkSaleFormData, setBulkSaleFormData] = useState<{
    customer_id: string;
    staff_id: string;
    purchase_date: string;
    purchase_time: string;
    notes: string;
    products: Array<{
      product_id: number;
      product_name: string;
      quantity: string;
      unit_price: string;
    }>;
  }>({
    customer_id: '',
    staff_id: '',
    purchase_date: '',
    purchase_time: '',
    notes: '',
    products: []
  });
  const [bulkSaleError, setBulkSaleError] = useState('');

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadCustomers();
    loadStaffList();
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

  const loadCustomers = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/customers');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('顧客取得エラー:', error);
    }
  };

  const loadStaffList = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/staff');
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      }
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
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

  const handleOpenSaleModal = (product: Product) => {
    setSelectedProductForSale(product);
    const now = new Date();
    setSaleFormData({
      customer_id: '',
      quantity: '1',
      staff_id: '',
      purchase_date: now.toISOString().split('T')[0],
      purchase_time: now.toTimeString().slice(0, 5),
      notes: ''
    });
    setSaleError('');
    setShowSaleModal(true);
  };

  const handleCloseSaleModal = () => {
    setShowSaleModal(false);
    setSelectedProductForSale(null);
    setSaleFormData({
      customer_id: '',
      quantity: '1',
      staff_id: '',
      purchase_date: '',
      purchase_time: '',
      notes: ''
    });
    setSaleError('');
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');

    if (!selectedProductForSale) return;

    if (!saleFormData.customer_id) {
      setSaleError('顧客を選択してください');
      return;
    }

    if (!saleFormData.quantity || parseInt(saleFormData.quantity) <= 0) {
      setSaleError('数量を正しく入力してください');
      return;
    }

    try {
      const quantity = parseInt(saleFormData.quantity);
      const unitPrice = selectedProductForSale.unit_price;
      const totalPrice = quantity * unitPrice;

      const purchaseDateTime = new Date(`${saleFormData.purchase_date}T${saleFormData.purchase_time}`);
      
      const url = getApiUrlWithTenantId('/api/admin/product-purchases');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: parseInt(saleFormData.customer_id),
          product_id: selectedProductForSale.product_id,
          product_name: selectedProductForSale.product_name,
          product_category: selectedProductForSale.product_category || null,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          purchase_date: purchaseDateTime.toISOString(),
          staff_id: saleFormData.staff_id ? parseInt(saleFormData.staff_id) : null,
          notes: saleFormData.notes || null
        }),
      });

      if (response.ok) {
        alert('商品を販売しました');
        handleCloseSaleModal();
        loadProducts(); // 在庫数を更新するため
      } else {
        const errorData = await response.json();
        setSaleError(errorData.error || '販売に失敗しました');
      }
    } catch (error) {
      console.error('商品販売エラー:', error);
      setSaleError('販売に失敗しました');
    }
  };

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const activeProducts = products.filter(p => p.is_active);
    if (selectedProducts.length === activeProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(activeProducts.map(p => p.product_id));
    }
  };

  const handleOpenBulkSaleModal = () => {
    if (selectedProducts.length === 0) {
      alert('販売する商品を選択してください');
      return;
    }

    const now = new Date();
    const selectedProductsData = products
      .filter(p => selectedProducts.includes(p.product_id))
      .map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        quantity: '1',
        unit_price: p.unit_price.toString()
      }));

    setBulkSaleFormData({
      customer_id: '',
      staff_id: '',
      purchase_date: now.toISOString().split('T')[0],
      purchase_time: now.toTimeString().slice(0, 5),
      notes: '',
      products: selectedProductsData
    });
    setBulkSaleError('');
    setShowBulkSaleModal(true);
  };

  const handleCloseBulkSaleModal = () => {
    setShowBulkSaleModal(false);
    setBulkSaleFormData({
      customer_id: '',
      staff_id: '',
      purchase_date: '',
      purchase_time: '',
      notes: '',
      products: []
    });
    setBulkSaleError('');
    setSelectedProducts([]);
  };

  const handleBulkSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSaleError('');

    if (!bulkSaleFormData.customer_id) {
      setBulkSaleError('顧客を選択してください');
      return;
    }

    // 各商品の数量と価格をチェック
    for (const product of bulkSaleFormData.products) {
      if (!product.quantity || parseInt(product.quantity) <= 0) {
        setBulkSaleError(`${product.product_name}の数量を正しく入力してください`);
        return;
      }
      if (!product.unit_price || parseFloat(product.unit_price) < 0) {
        setBulkSaleError(`${product.product_name}の価格を正しく入力してください`);
        return;
      }
    }

    try {
      const purchaseDateTime = new Date(`${bulkSaleFormData.purchase_date}T${bulkSaleFormData.purchase_time}`);
      
      // 各商品を順番に販売登録
      const promises = bulkSaleFormData.products.map(product => {
        const quantity = parseInt(product.quantity);
        const unitPrice = parseFloat(product.unit_price);
        const totalPrice = quantity * unitPrice;
        const productData = products.find(p => p.product_id === product.product_id);

        return fetch(getApiUrlWithTenantId('/api/admin/product-purchases'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: parseInt(bulkSaleFormData.customer_id),
            product_id: product.product_id,
            product_name: product.product_name,
            product_category: productData?.product_category || null,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            purchase_date: purchaseDateTime.toISOString(),
            staff_id: bulkSaleFormData.staff_id ? parseInt(bulkSaleFormData.staff_id) : null,
            notes: bulkSaleFormData.notes || null
          }),
        });
      });

      const responses = await Promise.all(promises);
      const errors = [];
      
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const errorData = await responses[i].json();
          errors.push(`${bulkSaleFormData.products[i].product_name}: ${errorData.error || '販売に失敗しました'}`);
        }
      }

      if (errors.length > 0) {
        setBulkSaleError(errors.join('\n'));
      } else {
        alert(`${bulkSaleFormData.products.length}件の商品を販売しました`);
        handleCloseBulkSaleModal();
        loadProducts(); // 在庫数を更新するため
      }
    } catch (error) {
      console.error('一括商品販売エラー:', error);
      setBulkSaleError('販売に失敗しました');
    }
  };

  // 商品をカテゴリごとにグループ化
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.product_category || 'カテゴリなし';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // カテゴリをソート（その他系とカテゴリなしを最後に）
  const sortedProductCategories = Object.keys(groupedProducts).sort((a, b) => {
    // 「その他」で始まるカテゴリを最後に
    if (a.startsWith('その他')) return 1;
    if (b.startsWith('その他')) return -1;
    // 「カテゴリなし」を「その他」の前（最後から2番目）に
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    // その他のカテゴリはアルファベット順
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
      <AdminNav currentPath="/admin/products" title="商品管理" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">商品管理</h2>
            <div className="flex space-x-3">
              {selectedProducts.length > 0 && (
                <button
                  onClick={handleOpenBulkSaleModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <ShoppingBagIcon className="h-5 w-5 mr-2" />
                  販売登録 ({selectedProducts.length})
                </button>
              )}
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

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div 
              className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => setIsProductsExpanded(!isProductsExpanded)}
            >
              <h3 className="text-lg font-medium text-gray-900">商品一覧</h3>
              {isProductsExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
            {isProductsExpanded && (
              <div>
                {products.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-500">
                    商品が登録されていません
                  </div>
                ) : (
                  <Fragment>
                    {products.length > 0 && (
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProducts.length === products.filter(p => p.is_active).length && products.filter(p => p.is_active).length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">すべて選択</span>
                          <span className="ml-2 text-sm text-gray-500">
                            ({selectedProducts.length}件選択中)
                          </span>
                        </label>
                      </div>
                    )}
                    {sortedProductCategories.map((category) => (
                      <div key={category} className="border-b border-gray-200 last:border-b-0">
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                          <h4 className="text-md font-semibold text-gray-700">
                            {category}
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              ({groupedProducts[category].length}件)
                            </span>
                          </h4>
                        </div>
                        <ul className="divide-y divide-gray-200">
                          {groupedProducts[category].map((product) => (
                            <li key={product.product_id} className="px-6 py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  {product.is_active && (
                                    <input
                                      type="checkbox"
                                      checked={selectedProducts.includes(product.product_id)}
                                      onChange={() => handleProductToggle(product.product_id)}
                                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                    />
                                  )}
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
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleOpenSaleModal(product)}
                                    className="p-2 text-green-600 hover:text-green-700"
                                    title="販売"
                                  >
                                    <ShoppingBagIcon className="h-5 w-5" />
                                  </button>
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
                          ))}
                        </ul>
                      </div>
                    ))}
                  </Fragment>
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

      {/* 一括販売モーダル */}
      {showBulkSaleModal && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseBulkSaleModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    商品を一括販売 ({bulkSaleFormData.products.length}件)
                  </h3>
                  <button
                    onClick={handleCloseBulkSaleModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {bulkSaleError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
                    {bulkSaleError}
                  </div>
                )}

                <form onSubmit={handleBulkSaleSubmit}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="bulk_customer_id" className="block text-sm font-medium text-gray-700">
                          顧客 <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="bulk_customer_id"
                          required
                          value={bulkSaleFormData.customer_id}
                          onChange={(e) => setBulkSaleFormData({ ...bulkSaleFormData, customer_id: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">選択してください</option>
                          {customers.map((customer) => (
                            <option key={customer.customer_id} value={customer.customer_id}>
                              {customer.real_name || customer.email || customer.phone_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="bulk_staff_id" className="block text-sm font-medium text-gray-700">
                          担当スタッフ
                        </label>
                        <select
                          id="bulk_staff_id"
                          value={bulkSaleFormData.staff_id}
                          onChange={(e) => setBulkSaleFormData({ ...bulkSaleFormData, staff_id: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">選択してください</option>
                          {staffList.map((staff) => (
                            <option key={staff.staff_id} value={staff.staff_id}>
                              {staff.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="bulk_purchase_date" className="block text-sm font-medium text-gray-700">
                          販売日 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="bulk_purchase_date"
                          required
                          value={bulkSaleFormData.purchase_date}
                          onChange={(e) => setBulkSaleFormData({ ...bulkSaleFormData, purchase_date: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="bulk_purchase_time" className="block text-sm font-medium text-gray-700">
                          販売時間 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="bulk_purchase_time"
                          required
                          value={bulkSaleFormData.purchase_time}
                          onChange={(e) => setBulkSaleFormData({ ...bulkSaleFormData, purchase_time: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        商品一覧
                      </label>
                      <div className="border border-gray-300 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {bulkSaleFormData.products.map((product, index) => {
                          const productData = products.find(p => p.product_id === product.product_id);
                          const quantity = parseInt(product.quantity) || 0;
                          const unitPrice = parseFloat(product.unit_price) || 0;
                          const totalPrice = quantity * unitPrice;
                          
                          return (
                            <div key={product.product_id} className="p-4 bg-white">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900">{product.product_name}</h4>
                                  {productData && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      在庫: {productData.stock_quantity || 0}個 / 標準単価: ¥{productData.unit_price.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    数量 <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    required
                                    value={product.quantity}
                                    onChange={(e) => {
                                      const newProducts = [...bulkSaleFormData.products];
                                      newProducts[index].quantity = e.target.value;
                                      setBulkSaleFormData({ ...bulkSaleFormData, products: newProducts });
                                    }}
                                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    売価（円） <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    value={product.unit_price}
                                    onChange={(e) => {
                                      const newProducts = [...bulkSaleFormData.products];
                                      newProducts[index].unit_price = e.target.value;
                                      setBulkSaleFormData({ ...bulkSaleFormData, products: newProducts });
                                    }}
                                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    小計
                                  </label>
                                  <div className="px-2 py-1 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-md">
                                    ¥{totalPrice.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="text-sm">
                          <span className="text-gray-600">合計: </span>
                          <span className="text-lg font-bold text-gray-900">
                            ¥{bulkSaleFormData.products.reduce((sum, p) => {
                              const qty = parseInt(p.quantity) || 0;
                              const price = parseFloat(p.unit_price) || 0;
                              return sum + (qty * price);
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="bulk_notes" className="block text-sm font-medium text-gray-700">
                        備考
                      </label>
                      <textarea
                        id="bulk_notes"
                        rows={3}
                        value={bulkSaleFormData.notes}
                        onChange={(e) => setBulkSaleFormData({ ...bulkSaleFormData, notes: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseBulkSaleModal}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      販売登録
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 販売モーダル */}
      {showSaleModal && selectedProductForSale && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseSaleModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    商品を販売: {selectedProductForSale.product_name}
                  </h3>
                  <button
                    onClick={handleCloseSaleModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSaleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                        顧客 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="customer_id"
                        required
                        value={saleFormData.customer_id}
                        onChange={(e) => setSaleFormData({ ...saleFormData, customer_id: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">選択してください</option>
                        {customers.map((customer) => (
                          <option key={customer.customer_id} value={customer.customer_id}>
                            {customer.real_name} ({customer.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        required
                        min="1"
                        value={saleFormData.quantity}
                        onChange={(e) => setSaleFormData({ ...saleFormData, quantity: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        単価: ¥{selectedProductForSale.unit_price.toLocaleString()} × {saleFormData.quantity || 0} = ¥{((selectedProductForSale.unit_price) * parseInt(saleFormData.quantity || '0')).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
                        担当スタッフ
                      </label>
                      <select
                        id="staff_id"
                        value={saleFormData.staff_id}
                        onChange={(e) => setSaleFormData({ ...saleFormData, staff_id: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">選択してください</option>
                        {staffList.map((staff) => (
                          <option key={staff.staff_id} value={staff.staff_id}>
                            {staff.staff_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                          購入日 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="purchase_date"
                          required
                          value={saleFormData.purchase_date}
                          onChange={(e) => setSaleFormData({ ...saleFormData, purchase_date: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="purchase_time" className="block text-sm font-medium text-gray-700">
                          購入時刻 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="purchase_time"
                          required
                          value={saleFormData.purchase_time}
                          onChange={(e) => setSaleFormData({ ...saleFormData, purchase_time: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        メモ
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={saleFormData.notes}
                        onChange={(e) => setSaleFormData({ ...saleFormData, notes: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  {saleError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {saleError}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseSaleModal}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      販売する
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

