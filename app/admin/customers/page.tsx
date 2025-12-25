'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { QRCodeSVG } from 'qrcode.react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  ClockIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

interface Customer {
  customer_id: number;
  real_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  birthday: string | null;
  allergy_info: string | null;
  preferences: string | null;
  registered_date: string;
}

export default function CustomerManagement() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    real_name: '',
    email: '',
    phone_number: '',
    address: '',
    birthday: '',
    allergy_info: '',
    preferences: ''
  });
  const [error, setError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [tenantCode, setTenantCode] = useState<string | null>(null);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [loadingTenantInfo, setLoadingTenantInfo] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'purchases'>('info');
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [reservationNotes, setReservationNotes] = useState({ note1: '', note2: '', note3: '' });
  const [savingNotes, setSavingNotes] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [purchaseFormData, setPurchaseFormData] = useState({
    product_id: '',
    product_name: '',
    product_category: '',
    quantity: '1',
    unit_price: '',
    purchase_date: '',
    purchase_time: '',
    staff_id: '',
    notes: ''
  });
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFormData, setHistoryFormData] = useState({
    menu_id: '',
    staff_id: '',
    reservation_date: '',
    reservation_time: '',
    price: '',
    notes: ''
  });
  const [menusList, setMenusList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  // 店舗情報を取得
  const loadTenantInfo = async () => {
    if (tenantCode) {
      return; // 既に取得済み
    }
    
    setLoadingTenantInfo(true);
    try {
      const url = getApiUrlWithTenantId('/api/admin/tenant-info');
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTenantCode(data.tenantCode);
        setSalonName(data.salonName);
      } else {
        console.error('店舗情報取得エラー:', response.status);
      }
    } catch (error) {
      console.error('店舗情報取得エラー:', error);
    } finally {
      setLoadingTenantInfo(false);
    }
  };

  // QRコードモーダルを開く
  const handleOpenQrModal = async () => {
    await loadTenantInfo();
    setShowQrModal(true);
  };

  // カルテモーダルを開く
  const handleOpenChartModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('info');
    setShowChartModal(true);
    await Promise.all([
      loadCustomerHistory(customer.customer_id),
      loadCustomerPurchases(customer.customer_id),
      loadStaffList(),
      loadMenusList(),
      loadProductsList()
    ]);
  };

  // カルテモーダルを閉じる
  const handleCloseChartModal = () => {
    setShowChartModal(false);
    setSelectedCustomer(null);
    setCustomerHistory([]);
  };

  // 顧客の来店履歴を取得
  const loadCustomerHistory = async (customerId: number) => {
    setLoadingHistory(true);
    try {
      const url = getApiUrlWithTenantId(`/api/admin/customers/${customerId}/history`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerHistory(data);
      } else {
        console.error('来店履歴取得エラー:', response.status);
        setCustomerHistory([]);
      }
    } catch (error) {
      console.error('来店履歴取得エラー:', error);
      setCustomerHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 顧客の商品購入履歴を取得
  const loadCustomerPurchases = async (customerId: number) => {
    setLoadingPurchases(true);
    try {
      const url = getApiUrlWithTenantId(`/api/admin/customers/${customerId}/purchases`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerPurchases(data);
      } else {
        console.error('商品購入履歴取得エラー:', response.status);
        setCustomerPurchases([]);
      }
    } catch (error) {
      console.error('商品購入履歴取得エラー:', error);
      setCustomerPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // スタッフ一覧を取得
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

  // メニュー一覧を取得
  const loadMenusList = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/menus');
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMenusList(data.filter((m: any) => m.is_active));
      }
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  // 商品一覧を取得
  const loadProductsList = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/products');
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(data.filter((p: any) => p.is_active));
      }
    } catch (error) {
      console.error('商品取得エラー:', error);
    }
  };

  // 商品購入履歴モーダルを開く
  const handleOpenPurchaseModal = (purchase?: any) => {
    if (purchase) {
      setEditingPurchase(purchase);
      const purchaseDate = new Date(purchase.purchase_date);
      // 既存の購入履歴から商品を検索（商品名で一致するものを探す）
      const selectedProduct = productsList.find((p: any) => p.product_name === purchase.product_name);
      setPurchaseFormData({
        product_id: selectedProduct?.product_id?.toString() || '',
        product_name: purchase.product_name || '',
        product_category: purchase.product_category || '',
        quantity: purchase.quantity.toString(),
        unit_price: purchase.unit_price.toString(),
        purchase_date: purchaseDate.toISOString().split('T')[0],
        purchase_time: purchaseDate.toTimeString().slice(0, 5),
        staff_id: purchase.staff_id?.toString() || '',
        notes: purchase.notes || ''
      });
    } else {
      setEditingPurchase(null);
      const now = new Date();
      setPurchaseFormData({
        product_id: '',
        product_name: '',
        product_category: '',
        quantity: '1',
        unit_price: '',
        purchase_date: now.toISOString().split('T')[0],
        purchase_time: now.toTimeString().slice(0, 5),
        staff_id: '',
        notes: ''
      });
    }
    setShowPurchaseModal(true);
  };

  // 商品購入履歴モーダルを閉じる
  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false);
    setEditingPurchase(null);
  };

  // 商品選択時の処理
  const handleProductChange = (productId: string) => {
    const selectedProduct = productsList.find((p: any) => p.product_id.toString() === productId);
    if (selectedProduct) {
      setPurchaseFormData({
        ...purchaseFormData,
        product_id: productId,
        product_name: selectedProduct.product_name,
        product_category: selectedProduct.product_category || '',
        unit_price: selectedProduct.unit_price.toString()
      });
    } else {
      setPurchaseFormData({
        ...purchaseFormData,
        product_id: '',
        product_name: '',
        product_category: '',
        unit_price: ''
      });
    }
  };

  // 商品購入履歴を保存
  const handleSavePurchase = async () => {
    if (!selectedCustomer) return;

    if (!purchaseFormData.product_id || !purchaseFormData.quantity || !purchaseFormData.unit_price) {
      alert('商品、数量、単価は必須です');
      return;
    }

    try {
      const purchaseDateTime = new Date(`${purchaseFormData.purchase_date}T${purchaseFormData.purchase_time}`);
      const url = editingPurchase
        ? getApiUrlWithTenantId(`/api/admin/product-purchases/${editingPurchase.purchase_id}`)
        : getApiUrlWithTenantId('/api/admin/product-purchases');

      const method = editingPurchase ? 'PUT' : 'POST';
      // 選択された商品から情報を取得
      const selectedProduct = productsList.find((p: any) => p.product_id.toString() === purchaseFormData.product_id);
      const body = editingPurchase
        ? {
            product_name: selectedProduct?.product_name || purchaseFormData.product_name,
            product_category: selectedProduct?.product_category || purchaseFormData.product_category || null,
            quantity: parseInt(purchaseFormData.quantity),
            unit_price: parseInt(purchaseFormData.unit_price),
            purchase_date: purchaseDateTime.toISOString(),
            staff_id: purchaseFormData.staff_id ? parseInt(purchaseFormData.staff_id) : null,
            notes: purchaseFormData.notes || null
          }
        : {
            customer_id: selectedCustomer.customer_id,
            product_name: selectedProduct?.product_name || purchaseFormData.product_name,
            product_category: selectedProduct?.product_category || purchaseFormData.product_category || null,
            quantity: parseInt(purchaseFormData.quantity),
            unit_price: parseInt(purchaseFormData.unit_price),
            purchase_date: purchaseDateTime.toISOString(),
            staff_id: purchaseFormData.staff_id ? parseInt(purchaseFormData.staff_id) : null,
            notes: purchaseFormData.notes || null
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert(editingPurchase ? '商品購入履歴を更新しました' : '商品購入履歴を追加しました');
        handleClosePurchaseModal();
        await loadCustomerPurchases(selectedCustomer.customer_id);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('商品購入履歴保存エラー:', error);
      alert('商品購入履歴の保存に失敗しました');
    }
  };

  // 商品購入履歴を削除
  const handleDeletePurchase = async (purchaseId: number) => {
    if (!confirm('この商品購入履歴を削除しますか？')) return;

    try {
      const url = getApiUrlWithTenantId(`/api/admin/product-purchases/${purchaseId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('商品購入履歴を削除しました');
        if (selectedCustomer) {
          await loadCustomerPurchases(selectedCustomer.customer_id);
        }
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('商品購入履歴削除エラー:', error);
      alert('商品購入履歴の削除に失敗しました');
    }
  };

  // 来店履歴モーダルを開く
  const handleOpenHistoryModal = () => {
    if (!selectedCustomer) return;
    const now = new Date();
    setHistoryFormData({
      menu_id: '',
      staff_id: '',
      reservation_date: now.toISOString().split('T')[0],
      reservation_time: now.toTimeString().slice(0, 5),
      price: '',
      notes: ''
    });
    setShowHistoryModal(true);
  };

  // 来店履歴モーダルを閉じる
  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  // 来店履歴を保存（status='completed'で予約を作成）
  const handleSaveHistory = async () => {
    if (!selectedCustomer) return;

    if (!historyFormData.menu_id || !historyFormData.reservation_date || !historyFormData.reservation_time) {
      alert('メニュー、来店日、来店時間は必須です');
      return;
    }

    try {
      const reservationDateTime = new Date(`${historyFormData.reservation_date}T${historyFormData.reservation_time}`);
      const url = getApiUrlWithTenantId('/api/admin/reservations');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id,
          menu_id: parseInt(historyFormData.menu_id),
          staff_id: historyFormData.staff_id ? parseInt(historyFormData.staff_id) : null,
          reservation_date: reservationDateTime.toISOString(),
          status: 'completed',
          price: historyFormData.price ? parseInt(historyFormData.price) : null,
          notes: historyFormData.notes || null
        }),
      });

      if (response.ok) {
        alert('来店履歴を追加しました');
        handleCloseHistoryModal();
        await loadCustomerHistory(selectedCustomer.customer_id);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('来店履歴保存エラー:', error);
      alert('来店履歴の保存に失敗しました');
    }
  };

  // 詳細カルテモーダルを開く
  const handleOpenDetailModal = async (reservation: any) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
    await loadReservationNotes(reservation.reservation_id);
  };

  // 詳細カルテモーダルを閉じる
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReservation(null);
    setReservationNotes({ note1: '', note2: '', note3: '' });
  };

  // 予約のコメントを取得
  const loadReservationNotes = async (reservationId: number) => {
    try {
      const url = getApiUrlWithTenantId(`/api/admin/reservations/${reservationId}/notes`);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setReservationNotes({
          note1: data.note1 || '',
          note2: data.note2 || '',
          note3: data.note3 || ''
        });
      } else {
        // コメントが存在しない場合は空の状態を維持
        setReservationNotes({ note1: '', note2: '', note3: '' });
      }
    } catch (error) {
      console.error('コメント取得エラー:', error);
      setReservationNotes({ note1: '', note2: '', note3: '' });
    }
  };

  // 予約のコメントを保存
  const handleSaveNotes = async () => {
    if (!selectedReservation) return;

    setSavingNotes(true);
    try {
      const url = getApiUrlWithTenantId(`/api/admin/reservations/${selectedReservation.reservation_id}/notes`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reservationNotes),
      });

      if (response.ok) {
        alert('コメントを保存しました');
      } else {
        const error = await response.json();
        alert(`保存エラー: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('コメント保存エラー:', error);
      alert('コメントの保存に失敗しました');
    } finally {
      setSavingNotes(false);
    }
  };

  // QRコードをダウンロード
  const handleDownloadQr = () => {
    if (!tenantCode) return;

    const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?tenant=${tenantCode}`;
    
    // SVGをCanvasに変換してダウンロード
    const svgElement = document.querySelector('#qr-code-svg') as SVGSVGElement;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qr-code-${tenantCode}.png`;
        link.href = url;
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchCustomers();
      } else {
        loadCustomers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const url = getApiUrlWithTenantId('/api/admin/customers');
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('顧客取得エラー:', response.status, errorData);
        setError('顧客の取得に失敗しました');
        return;
      }

      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('顧客取得エラー:', error);
      setError('顧客の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async () => {
    try {
      setLoading(true);
      const baseUrl = `/api/admin/customers?search=${encodeURIComponent(searchQuery)}`;
      const url = getApiUrlWithTenantId(baseUrl);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('検索に失敗しました');
      }

      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('顧客検索エラー:', error);
      setError('検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        real_name: customer.real_name,
        email: customer.email || '',
        phone_number: customer.phone_number || '',
        address: customer.address || '',
        birthday: customer.birthday ? customer.birthday.split('T')[0] : '',
        allergy_info: customer.allergy_info || '',
        preferences: customer.preferences || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        real_name: '',
        email: '',
        phone_number: '',
        address: '',
        birthday: '',
        allergy_info: '',
        preferences: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      real_name: '',
      email: '',
      phone_number: '',
      address: '',
      birthday: '',
      allergy_info: '',
      preferences: ''
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const baseUrl = editingCustomer 
        ? `/api/admin/customers/${editingCustomer.customer_id}`
        : '/api/admin/customers';
      const url = getApiUrlWithTenantId(baseUrl);
      
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          real_name: formData.real_name,
          email: formData.email || null,
          phone_number: formData.phone_number || null,
          address: formData.address || null,
          birthday: formData.birthday || null,
          allergy_info: formData.allergy_info || null,
          preferences: formData.preferences || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      handleCloseModal();
      loadCustomers();
    } catch (error: any) {
      setError(error.message || '保存に失敗しました');
    }
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm('この顧客を削除してもよろしいですか？')) {
      return;
    }

    try {
      const url = getApiUrlWithTenantId(`/api/admin/customers/${customerId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      loadCustomers();
    } catch (error: any) {
      alert(error.message || '削除に失敗しました');
    }
  };

  if (loading && customers.length === 0) {
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
                <h1 className="text-xl font-semibold text-gray-900">顧客管理</h1>
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
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
            <h2 className="text-2xl font-bold text-gray-900">顧客一覧</h2>
            <div className="flex gap-2">
              <button
                onClick={handleOpenQrModal}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                QRコードを表示
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                顧客を追加
              </button>
            </div>
          </div>

          {/* 検索バー */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前、メールアドレス、電話番号で検索..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  {searchQuery ? '検索結果が見つかりませんでした' : '顧客が登録されていません'}
                </li>
              ) : (
                customers.map((customer) => (
                  <li key={customer.customer_id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <button
                            onClick={() => handleOpenChartModal(customer)}
                            className="text-lg font-medium text-gray-900 hover:text-pink-600 cursor-pointer transition-colors"
                          >
                            {customer.real_name}
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                          {customer.email && (
                            <div>📧 {customer.email}</div>
                          )}
                          {customer.phone_number && (
                            <div>📞 {customer.phone_number}</div>
                          )}
                          {customer.address && (
                            <div>📍 {customer.address}</div>
                          )}
                          {customer.birthday && (
                            <div>🎂 {new Date(customer.birthday).toLocaleDateString('ja-JP')}</div>
                          )}
                          {customer.allergy_info && (
                            <div className="text-orange-600">⚠️ アレルギー: {customer.allergy_info}</div>
                          )}
                          {customer.preferences && (
                            <div>💭 希望: {customer.preferences}</div>
                          )}
                          <div className="text-gray-400">
                            登録日: {new Date(customer.registered_date).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.customer_id)}
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
                    {editingCustomer ? '顧客を編集' : '顧客を追加'}
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
                      <label htmlFor="real_name" className="block text-sm font-medium text-gray-700">
                        氏名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="real_name"
                        required
                        value={formData.real_name}
                        onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          メールアドレス
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                          電話番号
                        </label>
                        <input
                          type="tel"
                          id="phone_number"
                          value={formData.phone_number}
                          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        住所
                      </label>
                      <input
                        type="text"
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                        生年月日
                      </label>
                      <input
                        type="date"
                        id="birthday"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="allergy_info" className="block text-sm font-medium text-gray-700">
                        アレルギー情報
                      </label>
                      <textarea
                        id="allergy_info"
                        rows={2}
                        value={formData.allergy_info}
                        onChange={(e) => setFormData({ ...formData, allergy_info: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="アレルギーがある場合は記載してください"
                      />
                    </div>

                    <div>
                      <label htmlFor="preferences" className="block text-sm font-medium text-gray-700">
                        希望・要望
                      </label>
                      <textarea
                        id="preferences"
                        rows={2}
                        value={formData.preferences}
                        onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="顧客の希望や要望を記載してください"
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
                      {editingCustomer ? '更新' : '追加'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QRコードモーダル */}
      {showQrModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowQrModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    顧客登録用QRコード
                  </h3>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {loadingTenantInfo ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                  </div>
                ) : tenantCode ? (
                  <div className="space-y-4">
                    {salonName && (
                      <p className="text-sm text-gray-600 text-center">
                        {salonName}
                      </p>
                    )}
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                        <QRCodeSVG
                          id="qr-code-svg"
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?tenant=${tenantCode}`}
                          size={256}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        店舗コード: <span className="font-mono">{tenantCode}</span>
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/register?tenant={tenantCode}
                      </p>
                    </div>
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={handleDownloadQr}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                        QRコードをダウンロード
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 text-center pt-2">
                      <p>このQRコードをスキャンすると、顧客登録ページに自動遷移します。</p>
                      <p className="mt-1">店舗コードが自動入力されます。</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-red-600">店舗情報の取得に失敗しました</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カルテモーダル */}
      {showChartModal && selectedCustomer && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseChartModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedCustomer.real_name} 様のカルテ
                  </h3>
                  <button
                    onClick={handleCloseChartModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* タブ */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('info')}
                      className={`${
                        activeTab === 'info'
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <UserCircleIcon className="h-5 w-5 mr-2" />
                      顧客基本情報
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`${
                        activeTab === 'history'
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <ClockIcon className="h-5 w-5 mr-2" />
                      来店履歴
                    </button>
                    <button
                      onClick={() => setActiveTab('purchases')}
                      className={`${
                        activeTab === 'purchases'
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <ShoppingBagIcon className="h-5 w-5 mr-2" />
                      商品の購入履歴
                    </button>
                  </nav>
                </div>

                {/* タブコンテンツ */}
                <div className="mt-4">
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            氏名
                          </label>
                          <p className="text-sm text-gray-900">{selectedCustomer.real_name}</p>
                        </div>
                        {selectedCustomer.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              メールアドレス
                            </label>
                            <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
                          </div>
                        )}
                        {selectedCustomer.phone_number && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              電話番号
                            </label>
                            <p className="text-sm text-gray-900">{selectedCustomer.phone_number}</p>
                          </div>
                        )}
                        {selectedCustomer.address && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              住所
                            </label>
                            <p className="text-sm text-gray-900">{selectedCustomer.address}</p>
                          </div>
                        )}
                        {selectedCustomer.birthday && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              生年月日
                            </label>
                            <p className="text-sm text-gray-900">
                              {new Date(selectedCustomer.birthday).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            登録日
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedCustomer.registered_date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        {selectedCustomer.allergy_info && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              アレルギー情報
                            </label>
                            <p className="text-sm text-orange-600">{selectedCustomer.allergy_info}</p>
                          </div>
                        )}
                        {selectedCustomer.preferences && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              希望・要望
                            </label>
                            <p className="text-sm text-gray-900">{selectedCustomer.preferences}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                        </div>
                      ) : customerHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          来店履歴がありません
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {customerHistory.map((history) => (
                            <div
                              key={history.reservation_id}
                              onClick={() => handleOpenDetailModal(history)}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(history.reservation_date).toLocaleString('ja-JP', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900">
                                    ¥{history.total_price.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <span className="font-medium mr-2">メニュー:</span>
                                  <span>
                                    {Array.isArray(history.menus) && history.menus.length > 0
                                      ? history.menus.map((m: any) => m.menu_name).join('、')
                                      : history.menu_name || 'メニュー情報なし'}
                                  </span>
                                </div>
                                {history.staff_name && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <span className="font-medium mr-2">担当スタッフ:</span>
                                    <span>{history.staff_name}</span>
                                  </div>
                                )}
                                {Array.isArray(history.menus) && history.menus.length > 0 && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <span className="font-medium mr-2">所要時間:</span>
                                    <span>{history.total_duration}分</span>
                                  </div>
                                )}
                                {history.notes && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">対応詳細:</span>
                                      <span className="ml-2">{history.notes}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'purchases' && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleOpenPurchaseModal()}
                          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 text-sm font-medium"
                        >
                          <PlusIcon className="h-4 w-4 inline mr-1" />
                          商品購入履歴を追加
                        </button>
                      </div>
                      {loadingPurchases ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                        </div>
                      ) : customerPurchases.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          商品の購入履歴がありません
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {customerPurchases.map((purchase) => (
                            <div
                              key={purchase.purchase_id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-end space-x-2 mb-2">
                                <button
                                  onClick={() => handleOpenPurchaseModal(purchase)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(purchase.purchase_id)}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {purchase.product_name}
                                  </p>
                                  {purchase.product_category && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {purchase.product_category}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900">
                                    ¥{purchase.total_price.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <span className="font-medium mr-2">購入日時:</span>
                                  <span>
                                    {new Date(purchase.purchase_date).toLocaleString('ja-JP', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="font-medium mr-2">数量:</span>
                                  <span>{purchase.quantity}個</span>
                                  {purchase.quantity > 1 && (
                                    <span className="ml-2 text-gray-500">
                                      (単価: ¥{purchase.unit_price.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                                {purchase.staff_name && (
                                  <div className="flex items-center">
                                    <span className="font-medium mr-2">担当スタッフ:</span>
                                    <span>{purchase.staff_name}</span>
                                  </div>
                                )}
                                {purchase.notes && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">備考:</span>
                                      <span className="ml-2">{purchase.notes}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 詳細カルテモーダル */}
      {showDetailModal && selectedReservation && (
        <div className="fixed z-30 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseDetailModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    来店詳細カルテ
                  </h3>
                  <button
                    onClick={handleCloseDetailModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* 予約基本情報 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">来店日時:</span>
                      <p className="text-gray-900 mt-1">
                        {new Date(selectedReservation.reservation_date).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">合計金額:</span>
                      <p className="text-gray-900 mt-1">¥{selectedReservation.total_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">メニュー:</span>
                      <p className="text-gray-900 mt-1">
                        {Array.isArray(selectedReservation.menus) && selectedReservation.menus.length > 0
                          ? selectedReservation.menus.map((m: any) => m.menu_name).join('、')
                          : selectedReservation.menu_name || 'メニュー情報なし'}
                      </p>
                    </div>
                    {selectedReservation.staff_name && (
                      <div>
                        <span className="font-medium text-gray-700">担当スタッフ:</span>
                        <p className="text-gray-900 mt-1">{selectedReservation.staff_name}</p>
                      </div>
                    )}
                    {Array.isArray(selectedReservation.menus) && selectedReservation.menus.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">所要時間:</span>
                        <p className="text-gray-900 mt-1">{selectedReservation.total_duration}分</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* コメント欄 */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">対応メモ</h4>
                  
                  <div>
                    <label htmlFor="note1" className="block text-sm font-medium text-gray-700 mb-1">
                      対話内容
                    </label>
                    <textarea
                      id="note1"
                      rows={4}
                      value={reservationNotes.note1}
                      onChange={(e) => setReservationNotes({ ...reservationNotes, note1: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      placeholder="顧客との対話内容を記録してください"
                    />
                  </div>

                  <div>
                    <label htmlFor="note2" className="block text-sm font-medium text-gray-700 mb-1">
                      提案内容
                    </label>
                    <textarea
                      id="note2"
                      rows={4}
                      value={reservationNotes.note2}
                      onChange={(e) => setReservationNotes({ ...reservationNotes, note2: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      placeholder="顧客への提案内容を記録してください"
                    />
                  </div>

                  <div>
                    <label htmlFor="note3" className="block text-sm font-medium text-gray-700 mb-1">
                      その他
                    </label>
                    <textarea
                      id="note3"
                      rows={4}
                      value={reservationNotes.note3}
                      onChange={(e) => setReservationNotes({ ...reservationNotes, note3: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      placeholder="その他のメモを記録してください"
                    />
                  </div>
                </div>

                {/* 保存ボタン */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseDetailModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                  >
                    {savingNotes ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商品購入履歴モーダル */}
      {showPurchaseModal && selectedCustomer && (
        <div className="fixed z-30 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClosePurchaseModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingPurchase ? '商品購入履歴を編集' : '商品購入履歴を追加'}
                  </h3>
                  <button
                    onClick={handleClosePurchaseModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                      商品 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="product_id"
                      value={purchaseFormData.product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      required
                    >
                      <option value="">選択してください</option>
                      {productsList.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.product_name} {product.product_category ? `(${product.product_category})` : ''} - ¥{product.unit_price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {purchaseFormData.product_id && (
                    <div>
                      <label htmlFor="product_category_display" className="block text-sm font-medium text-gray-700 mb-1">
                        カテゴリ
                      </label>
                      <input
                        type="text"
                        id="product_category_display"
                        value={purchaseFormData.product_category}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        min="1"
                        value={purchaseFormData.quantity}
                        onChange={(e) => setPurchaseFormData({ ...purchaseFormData, quantity: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="unit_price"
                        min="0"
                        value={purchaseFormData.unit_price}
                        onChange={(e) => setPurchaseFormData({ ...purchaseFormData, unit_price: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-1">
                        購入日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="purchase_date"
                        value={purchaseFormData.purchase_date}
                        onChange={(e) => setPurchaseFormData({ ...purchaseFormData, purchase_date: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="purchase_time" className="block text-sm font-medium text-gray-700 mb-1">
                        購入時間 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        id="purchase_time"
                        value={purchaseFormData.purchase_time}
                        onChange={(e) => setPurchaseFormData({ ...purchaseFormData, purchase_time: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="purchase_staff_id" className="block text-sm font-medium text-gray-700 mb-1">
                      担当スタッフ
                    </label>
                    <select
                      id="purchase_staff_id"
                      value={purchaseFormData.staff_id}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, staff_id: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="">選択なし</option>
                      {staffList.map((staff) => (
                        <option key={staff.staff_id} value={staff.staff_id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="purchase_notes" className="block text-sm font-medium text-gray-700 mb-1">
                      備考
                    </label>
                    <textarea
                      id="purchase_notes"
                      rows={3}
                      value={purchaseFormData.notes}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, notes: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClosePurchaseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePurchase}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    {editingPurchase ? '更新' : '追加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 来店履歴追加モーダル */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed z-30 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseHistoryModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    来店履歴を追加
                  </h3>
                  <button
                    onClick={handleCloseHistoryModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="history_menu_id" className="block text-sm font-medium text-gray-700 mb-1">
                      メニュー <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="history_menu_id"
                      value={historyFormData.menu_id}
                      onChange={(e) => setHistoryFormData({ ...historyFormData, menu_id: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      required
                    >
                      <option value="">選択してください</option>
                      {menusList.map((menu) => (
                        <option key={menu.menu_id} value={menu.menu_id}>
                          {menu.name} (¥{menu.price.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="history_staff_id" className="block text-sm font-medium text-gray-700 mb-1">
                      担当スタッフ
                    </label>
                    <select
                      id="history_staff_id"
                      value={historyFormData.staff_id}
                      onChange={(e) => setHistoryFormData({ ...historyFormData, staff_id: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="">選択なし</option>
                      {staffList.map((staff) => (
                        <option key={staff.staff_id} value={staff.staff_id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="history_reservation_date" className="block text-sm font-medium text-gray-700 mb-1">
                        来店日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="history_reservation_date"
                        value={historyFormData.reservation_date}
                        onChange={(e) => setHistoryFormData({ ...historyFormData, reservation_date: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="history_reservation_time" className="block text-sm font-medium text-gray-700 mb-1">
                        来店時間 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        id="history_reservation_time"
                        value={historyFormData.reservation_time}
                        onChange={(e) => setHistoryFormData({ ...historyFormData, reservation_time: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="history_price" className="block text-sm font-medium text-gray-700 mb-1">
                      金額（メニュー価格と異なる場合）
                    </label>
                    <input
                      type="number"
                      id="history_price"
                      min="0"
                      value={historyFormData.price}
                      onChange={(e) => setHistoryFormData({ ...historyFormData, price: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      placeholder="空欄の場合はメニュー価格を使用"
                    />
                  </div>

                  <div>
                    <label htmlFor="history_notes" className="block text-sm font-medium text-gray-700 mb-1">
                      備考
                    </label>
                    <textarea
                      id="history_notes"
                      rows={3}
                      value={historyFormData.notes}
                      onChange={(e) => setHistoryFormData({ ...historyFormData, notes: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseHistoryModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHistory}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    追加
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

