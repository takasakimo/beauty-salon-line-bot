'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BuildingStorefrontIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface MenuItem {
  menu_id: number;
  menu_name: string;
  price: number;
  duration: number;
}

interface Reservation {
  reservation_id: number;
  reservation_date: string;
  menu_id: number;
  menu_name: string;
  menus?: MenuItem[];
  total_price?: number;
  total_duration?: number;
  staff_id: number | null;
  staff_name: string | null;
  price: number;
  status: string;
}

interface Menu {
  menu_id: number;
  name: string;
  price: number;
  duration: number;
}

interface Staff {
  staff_id: number;
  name: string;
}

interface Customer {
  customer_id: number;
  real_name: string;
  email: string;
  phone_number: string;
  registered_date: string;
}

interface Tenant {
  tenant_id: number;
  tenant_code: string;
  salon_name: string;
  customer_id?: number;
  admin_id?: number;
  has_customer: boolean;
  has_admin: boolean;
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantCode = searchParams.get('tenant') || 'beauty-salon-001';
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    menu_id: '',
    staff_id: '',
    reservation_date: '',
    reservation_time: ''
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated && customer) {
      loadTenants();
    }
  }, [authenticated, customer]);

  useEffect(() => {
    if (authenticated && customerId && tenantCode) {
      // 店舗が変更されたときにデータを再読み込み
      loadCustomerData(customerId);
    }
  }, [tenantCode]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`/api/customers/me?tenant=${tenantCode}`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        // 未認証 - ログインページにリダイレクト
        router.push(`/login?tenant=${tenantCode}&redirect=/mypage`);
        return;
      }

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
        setCustomerId(customerData.customer_id);
        setAuthenticated(true);
        if (customerData.customer_id) {
          loadCustomerData(customerData.customer_id);
        }
      }
    } catch (error) {
      console.error('認証確認エラー:', error);
      router.push(`/login?tenant=${tenantCode}&redirect=/mypage`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customers/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push(`/?tenant=${tenantCode}`);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const loadCustomerData = async (id: number) => {
    try {
      // 予約履歴を取得
      const historyResponse = await fetch(
        `/api/reservations/history?tenant=${tenantCode}&customer_id=${id}`,
        { credentials: 'include' }
      );
      const historyData = await historyResponse.json();
      setReservations(historyData);

      // 現在の予約を取得
      const currentResponse = await fetch(
        `/api/reservations/current?tenant=${tenantCode}&customer_id=${id}`,
        { credentials: 'include' }
      );
      const currentData = await currentResponse.json();
      setCurrentReservation(currentData);

      // メニューとスタッフを取得
      await Promise.all([loadMenus(), loadStaff()]);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  const loadMenus = async () => {
    try {
      const response = await fetch(`/api/menus?tenant=${tenantCode}`);
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch(`/api/staff?tenant=${tenantCode}`);
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/customers/my-tenants', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.tenants) {
          setTenants(result.tenants);
          // 現在の店舗を特定
          const current = result.tenants.find((t: Tenant) => t.tenant_code === tenantCode);
          setCurrentTenant(current || result.tenants[0] || null);
        }
      }
    } catch (error) {
      console.error('店舗一覧取得エラー:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleTenantChange = (newTenantCode: string) => {
    // 店舗を切り替えてマイページを再読み込み
    // ページを完全にリロードして、新しい店舗のデータを取得
    window.location.href = `/mypage?tenant=${newTenantCode}`;
  };

  // 予約前日までかどうかをチェック
  const canModifyReservation = (reservationDate: string): boolean => {
    // reservation_dateをJSTとして解釈
    let dateStr = reservationDate;
    // タイムゾーン情報がない場合は+09:00を付与
    if (typeof dateStr === 'string' && !dateStr.includes('+') && !dateStr.includes('Z')) {
      dateStr = dateStr.replace(' ', 'T') + '+09:00';
    }
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDateOnly = new Date(date);
    reservationDateOnly.setHours(0, 0, 0, 0);
    
    const daysUntilReservation = Math.floor(
      (reservationDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysUntilReservation >= 1 && daysUntilReservation > 0;
  };

  const handleCancel = async (reservationId: number) => {
    if (!confirm('この予約をキャンセルしてもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/reservations/${reservationId}?tenant=${tenantCode}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        alert('予約をキャンセルしました');
        if (customerId) {
          loadCustomerData(customerId);
        }
      } else {
        alert(result.error || 'キャンセルに失敗しました');
      }
    } catch (error: any) {
      console.error('キャンセルエラー:', error);
      alert('キャンセル処理中にエラーが発生しました');
    }
  };

  const handleEdit = (reservation: Reservation) => {
    if (!canModifyReservation(reservation.reservation_date)) {
      alert('予約前日までに変更してください');
      return;
    }

    const dateTime = new Date(reservation.reservation_date);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().slice(0, 5);

    setEditFormData({
      menu_id: reservation.menu_id.toString(),
      staff_id: reservation.staff_id ? reservation.staff_id.toString() : '',
      reservation_date: date,
      reservation_time: time
    });
    setEditingReservation(reservation);
    setShowEditModal(true);
    setError('');
  };

  const loadAvailableTimes = async () => {
    if (!editFormData.menu_id || !editFormData.staff_id || !editFormData.reservation_date) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    try {
      const response = await fetch(
        `/api/reservations/available-slots?date=${editFormData.reservation_date}&menu_id=${editFormData.menu_id}&staff_id=${editFormData.staff_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableTimes(data);
      }
    } catch (error) {
      console.error('利用可能時間取得エラー:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    if (editFormData.menu_id && editFormData.staff_id && editFormData.reservation_date) {
      loadAvailableTimes();
    }
  }, [editFormData.menu_id, editFormData.staff_id, editFormData.reservation_date]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingReservation) return;

    try {
      const reservationDateTime = `${editFormData.reservation_date}T${editFormData.reservation_time}:00`;

      const response = await fetch(`/api/reservations/${editingReservation.reservation_id}?tenant=${tenantCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          menu_id: parseInt(editFormData.menu_id),
          staff_id: editFormData.staff_id ? parseInt(editFormData.staff_id) : null,
          reservation_date: new Date(reservationDateTime).toISOString()
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('予約を変更しました');
        setShowEditModal(false);
        setEditingReservation(null);
        if (customerId) {
          loadCustomerData(customerId);
        }
      } else {
        setError(result.error || '変更に失敗しました');
      }
    } catch (error: any) {
      console.error('変更エラー:', error);
      setError('変更処理中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !customerId) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              マイページ
            </h1>
            <div className="flex items-center gap-4">
              {/* 店舗切り替え */}
              {tenants.length > 1 && (
                <div className="relative">
                  <select
                    value={tenantCode}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 hover:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                    disabled={loadingTenants}
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_code}>
                        {tenant.salon_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>

          {customer && (
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-gray-900">お客様情報</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">お名前:</span> {customer.real_name}</p>
                <p className="text-gray-700"><span className="font-medium">メール:</span> {customer.email}</p>
                <p className="text-gray-700"><span className="font-medium">電話:</span> {customer.phone_number}</p>
              </div>
            </div>
          )}

          {currentReservation && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">現在の予約</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">日時:</span> {new Date(currentReservation.reservation_date).toLocaleString('ja-JP')}</p>
                <p className="text-gray-700">
                  <span className="font-medium">メニュー:</span>
                  {currentReservation.menus && currentReservation.menus.length > 1 ? (
                    <div className="mt-1 ml-4">
                      {currentReservation.menus.map((menu, idx) => (
                        <div key={menu.menu_id}>
                          {idx > 0 && ' + '}
                          {menu.menu_name} (¥{menu.price.toLocaleString()}, {menu.duration}分)
                        </div>
                      ))}
                      <div className="mt-1 font-semibold text-gray-900">
                        合計: ¥{(currentReservation.total_price || currentReservation.price || 0).toLocaleString()} / {currentReservation.total_duration || 0}分
                      </div>
                    </div>
                  ) : (
                    <span> {currentReservation.menu_name}</span>
                  )}
                </p>
                <p className="text-gray-700"><span className="font-medium">スタッフ:</span> {currentReservation.staff_name || 'スタッフ選択なし'}</p>
                <p className="text-gray-700"><span className="font-medium">料金:</span> ¥{(currentReservation.total_price || currentReservation.price || 0).toLocaleString()}</p>
              </div>
              {canModifyReservation(currentReservation.reservation_date) && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(currentReservation)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    変更
                  </button>
                  <button
                    onClick={() => handleCancel(currentReservation.reservation_id)}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mb-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-700">
              <BuildingStorefrontIcon className="h-5 w-5 text-pink-600" />
              <span className="font-medium text-base">
                {currentTenant?.salon_name || 
                 (tenants.length > 0 ? tenants.find(t => t.tenant_code === tenantCode)?.salon_name : null) ||
                 '店舗名'}
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/reservation?tenant=${tenantCode}`)}
                className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg font-medium"
              >
                新規予約
              </button>
              <button
                onClick={() => router.push(`/?tenant=${tenantCode}`)}
                className="px-6 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
              >
                ホームに戻る
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">予約履歴</h2>
            {reservations.length === 0 ? (
              <p className="text-gray-600">予約履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => {
                  const canModify = reservation.status === 'confirmed' && canModifyReservation(reservation.reservation_date);
                  return (
                    <div key={reservation.reservation_id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                      <p className="font-semibold text-gray-900 mb-1">{(() => {
                        // reservation_dateをJSTとして解釈
                        let dateStr = reservation.reservation_date;
                        // タイムゾーン情報がない場合は+09:00を付与
                        if (typeof dateStr === 'string' && !dateStr.includes('+') && !dateStr.includes('Z')) {
                          dateStr = dateStr.replace(' ', 'T') + '+09:00';
                        }
                        const date = new Date(dateStr);
                        return date.toLocaleString('ja-JP', {
                          timeZone: 'Asia/Tokyo'
                        });
                      })()}</p>
                      <p className="text-gray-700 mb-1">
                        {reservation.menus && reservation.menus.length > 1 ? (
                          <div>
                            {reservation.menus.map((menu, idx) => (
                              <span key={menu.menu_id}>
                                {idx > 0 && ' + '}
                                {menu.menu_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          reservation.menu_name
                        )}
                        {' - '}
                        {reservation.staff_name || 'スタッフ選択なし'}
                      </p>
                      <p className="text-gray-900 font-medium mb-1">¥{(reservation.total_price || reservation.price || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500 mb-3">ステータス: {reservation.status === 'confirmed' ? '予約確定' : reservation.status === 'cancelled' ? 'キャンセル' : reservation.status}</p>
                      {canModify && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleEdit(reservation)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            変更
                          </button>
                          <button
                            onClick={() => handleCancel(reservation.reservation_id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 変更モーダル */}
      {showEditModal && editingReservation && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">予約を変更</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdate}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit_menu_id" className="block text-sm font-medium text-gray-700">
                        メニュー <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="edit_menu_id"
                        required
                        value={editFormData.menu_id}
                        onChange={(e) => {
                          setEditFormData({ ...editFormData, menu_id: e.target.value, reservation_time: '' });
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">選択してください</option>
                        {menus.map((menu) => (
                          <option key={menu.menu_id} value={menu.menu_id}>
                            {menu.name} (¥{menu.price.toLocaleString()}, {menu.duration}分)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit_staff_id" className="block text-sm font-medium text-gray-700">
                        スタッフ
                      </label>
                      <select
                        id="edit_staff_id"
                        value={editFormData.staff_id}
                        onChange={(e) => {
                          setEditFormData({ ...editFormData, staff_id: e.target.value, reservation_time: '' });
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">スタッフ選択なし</option>
                        {staff.map((s) => (
                          <option key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit_reservation_date" className="block text-sm font-medium text-gray-700">
                          予約日 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="edit_reservation_date"
                          required
                          value={editFormData.reservation_date}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, reservation_date: e.target.value, reservation_time: '' });
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="edit_reservation_time" className="block text-sm font-medium text-gray-700">
                          予約時間 <span className="text-red-500">*</span>
                          {editFormData.menu_id && editFormData.staff_id && editFormData.reservation_date && (
                            <span className="ml-2 text-xs text-gray-500">
                              {loadingTimes ? '(読み込み中...)' : `(${availableTimes.length}件の空き時間)`}
                            </span>
                          )}
                        </label>
                        {editFormData.menu_id && editFormData.staff_id && editFormData.reservation_date ? (
                          <select
                            id="edit_reservation_time"
                            required
                            value={editFormData.reservation_time}
                            onChange={(e) => setEditFormData({ ...editFormData, reservation_time: e.target.value })}
                            disabled={loadingTimes || availableTimes.length === 0}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {loadingTimes ? '読み込み中...' : availableTimes.length === 0 ? '利用可能な時間がありません' : '時間を選択'}
                            </option>
                            {availableTimes.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="time"
                            id="edit_reservation_time"
                            required
                            value={editFormData.reservation_time}
                            onChange={(e) => setEditFormData({ ...editFormData, reservation_time: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            disabled={!editFormData.menu_id || !editFormData.staff_id}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
                    >
                      変更する
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

export default function MyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <MyPageContent />
    </Suspense>
  );
}
