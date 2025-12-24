'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface Reservation {
  reservation_id: number;
  reservation_date: string;
  status: string;
  price: number;
  notes: string | null;
  created_date: string;
  customer_id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  menu_id: number;
  menu_name: string;
  menu_price: number;
  menu_duration: number;
  staff_id: number;
  staff_name: string;
}

interface Customer {
  customer_id: number;
  real_name: string;
  email: string | null;
  phone_number: string | null;
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

export default function ReservationManagement() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    menu_id: '',
    staff_id: '',
    reservation_date: '',
    reservation_time: '',
    status: 'confirmed',
    notes: ''
  });
  const [error, setError] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadReservations();
  }, [filterDate, filterStatus]);

  // スタッフ、メニュー、日付が選択されたら利用可能な時間を取得
  useEffect(() => {
    if (formData.staff_id && formData.menu_id && formData.reservation_date) {
      loadAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [formData.staff_id, formData.menu_id, formData.reservation_date]);

  const loadData = async () => {
    await Promise.all([
      loadReservations(),
      loadCustomers(),
      loadMenus(),
      loadStaff()
    ]);
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      let url = '/api/admin/reservations';
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += '?' + params.toString();

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
        console.error('予約取得エラー:', response.status, errorData);
        setError('予約の取得に失敗しました');
        return;
      }

      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('予約取得エラー:', error);
      setError('予約の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else if (response.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('顧客取得エラー:', error);
    }
  };

  const loadMenus = async () => {
    try {
      // 管理画面用のメニューAPIを使用
      const response = await fetch('/api/admin/menus', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMenus(data);
      } else if (response.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('メニュー取得エラー:', error);
    }
  };

  const loadStaff = async () => {
    try {
      // 顧客向けAPIを使用（認証不要）
      const response = await fetch('/api/staff?tenant=beauty-salon-001', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
    }
  };

  const loadAvailableTimes = async () => {
    if (!formData.staff_id || !formData.menu_id || !formData.reservation_date) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    try {
      const response = await fetch(
        `/api/reservations/available-slots?date=${formData.reservation_date}&menu_id=${formData.menu_id}&staff_id=${formData.staff_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableTimes(data);
        // 利用可能な時間がない場合、選択されている時間をクリア
        if (data.length === 0) {
          setFormData({ ...formData, reservation_time: '' });
        } else if (formData.reservation_time && !data.includes(formData.reservation_time)) {
          // 選択されている時間が利用不可になった場合、最初の利用可能な時間を設定
          setFormData({ ...formData, reservation_time: data[0] });
        }
      }
    } catch (error) {
      console.error('利用可能時間取得エラー:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleOpenModal = (reservation?: Reservation) => {
    if (reservation) {
      setEditingReservation(reservation);
      const dateTime = new Date(reservation.reservation_date);
      setFormData({
        customer_id: reservation.customer_id.toString(),
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email || '',
        customer_phone: reservation.customer_phone || '',
        menu_id: reservation.menu_id.toString(),
        staff_id: reservation.staff_id.toString(),
        reservation_date: dateTime.toISOString().split('T')[0],
        reservation_time: dateTime.toTimeString().slice(0, 5),
        status: reservation.status,
        notes: reservation.notes || ''
      });
    } else {
      setEditingReservation(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        customer_id: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        menu_id: '',
        staff_id: '',
        reservation_date: today,
        reservation_time: '10:00',
        status: 'confirmed',
        notes: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReservation(null);
    setError('');
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.customer_id.toString() === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: customer.real_name,
        customer_email: customer.email || '',
        customer_phone: customer.phone_number || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 日付と時間を結合
      const reservationDateTime = `${formData.reservation_date}T${formData.reservation_time}:00`;

      const url = editingReservation 
        ? `/api/admin/reservations/${editingReservation.reservation_id}`
        : '/api/admin/reservations';
      
      const method = editingReservation ? 'PUT' : 'POST';
      
      const body: any = {
        menu_id: parseInt(formData.menu_id),
        staff_id: parseInt(formData.staff_id),
        reservation_date: reservationDateTime,
        status: formData.status,
        notes: formData.notes || null
      };

      // 新規作成時は顧客情報も含める
      if (!editingReservation) {
        if (formData.customer_id) {
          body.customer_id = parseInt(formData.customer_id);
        } else {
          body.customer_name = formData.customer_name;
          body.customer_email = formData.customer_email || null;
          body.customer_phone = formData.customer_phone || null;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      handleCloseModal();
      loadReservations();
    } catch (error: any) {
      setError(error.message || '保存に失敗しました');
    }
  };

  const handleCancel = async (reservationId: number) => {
    if (!confirm('この予約をキャンセルしてもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'キャンセルに失敗しました');
      }

      loadReservations();
    } catch (error: any) {
      alert(error.message || 'キャンセルに失敗しました');
    }
  };

  const handleStatusChange = async (reservationId: number, newStatus: string) => {
    try {
      const reservation = reservations.find(r => r.reservation_id === reservationId);
      if (!reservation) return;

      const reservationDateTime = new Date(reservation.reservation_date).toISOString();

      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          menu_id: reservation.menu_id,
          staff_id: reservation.staff_id,
          reservation_date: reservationDateTime,
          status: newStatus,
          notes: reservation.notes
        }),
      });

      if (!response.ok) {
        throw new Error('ステータス変更に失敗しました');
      }

      loadReservations();
    } catch (error: any) {
      alert(error.message || 'ステータス変更に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '予約確定';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  // タイムライン表示用：予約を日付ごとにグループ化
  const groupReservationsByDate = () => {
    const grouped: { [key: string]: Reservation[] } = {};
    
    reservations
      .filter(r => showCancelled || r.status !== 'cancelled')
      .sort((a, b) => new Date(a.reservation_date).getTime() - new Date(b.reservation_date).getTime())
      .forEach(reservation => {
        const date = new Date(reservation.reservation_date);
        const dateKey = date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(reservation);
      });
    
    return grouped;
  };

  // リスト表示用：フィルタリングされた予約を取得
  const getFilteredReservations = () => {
    return reservations.filter(r => showCancelled || r.status !== 'cancelled');
  };

  // 時間をフォーマット（HH:MM）
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && reservations.length === 0) {
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
                <h1 className="text-xl font-semibold text-gray-900">予約管理</h1>
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
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メニュー管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">予約一覧</h2>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              予約を追加
            </button>
          </div>

          {/* フィルタ */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                日付
              </label>
              <input
                type="date"
                id="filterDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">すべて</option>
                <option value="confirmed">予約確定</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* タブとキャンセル表示切り替え */}
          <div className="mb-4 flex justify-between items-center border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setViewMode('list')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'list'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                リスト表示
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'timeline'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                タイムライン表示
              </button>
            </nav>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                showCancelled ? 'bg-pink-600' : 'bg-gray-300'
              }`}>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  showCancelled ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                キャンセル分表示
              </span>
            </label>
          </div>

          {viewMode === 'list' ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {getFilteredReservations().length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  予約が登録されていません
                </li>
              ) : (
                getFilteredReservations().map((reservation) => (
                  <li key={reservation.reservation_id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-lg font-medium text-gray-900">
                            {new Date(reservation.reservation_date).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </h3>
                          <span className={`ml-3 px-2 py-1 text-xs rounded ${getStatusColor(reservation.status)}`}>
                            {getStatusLabel(reservation.status)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                          <div>
                            <strong>顧客:</strong> {reservation.customer_name}
                            {reservation.customer_phone && ` (${reservation.customer_phone})`}
                          </div>
                          <div>
                            <strong>メニュー:</strong> {reservation.menu_name} (¥{reservation.menu_price.toLocaleString()}, {reservation.menu_duration}分)
                          </div>
                          <div>
                            <strong>スタッフ:</strong> {reservation.staff_name}
                          </div>
                          {reservation.notes && (
                            <div className="col-span-full text-gray-400">
                              📝 {reservation.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {reservation.status !== 'cancelled' && (
                          <>
                            <select
                              value={reservation.status}
                              onChange={(e) => handleStatusChange(reservation.reservation_id, e.target.value)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            >
                              <option value="confirmed">予約確定</option>
                              <option value="completed">完了</option>
                              <option value="cancelled">キャンセル</option>
                            </select>
                            <button
                              onClick={() => handleOpenModal(reservation)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {reservation.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(reservation.reservation_id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {reservations.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  予約が登録されていません
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {Object.entries(groupReservationsByDate()).map(([dateKey, dateReservations]) => (
                    <div key={dateKey} className="p-6">
                      <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                        <CalendarDaysIcon className="h-6 w-6 text-pink-600 mr-2" />
                        <h3 className="text-xl font-semibold text-gray-900">{dateKey}</h3>
                        <span className="ml-3 text-sm text-gray-500">
                          ({dateReservations.length}件)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {dateReservations.map((reservation) => {
                          const reservationTime = new Date(reservation.reservation_date);
                          const endTime = new Date(reservationTime.getTime() + (reservation.menu_duration || 60) * 60000);
                          
                          return (
                            <div
                              key={reservation.reservation_id}
                              className={`relative pl-8 pb-4 border-l-2 ${
                                reservation.status === 'cancelled'
                                  ? 'border-gray-300'
                                  : reservation.status === 'completed'
                                  ? 'border-green-400'
                                  : 'border-pink-400'
                              }`}
                            >
                              {/* タイムラインのドット */}
                              <div
                                className={`absolute left-0 top-2 w-4 h-4 rounded-full border-2 border-white -ml-[9px] ${
                                  reservation.status === 'cancelled'
                                    ? 'bg-gray-300'
                                    : reservation.status === 'completed'
                                    ? 'bg-green-400'
                                    : 'bg-pink-400'
                                }`}
                              ></div>
                              
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-2">
                                    <span className="text-lg font-semibold text-gray-900 mr-3">
                                      {formatTime(reservation.reservation_date)} - {formatTime(endTime.toISOString())}
                                    </span>
                                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(reservation.status)}`}>
                                      {getStatusLabel(reservation.status)}
                                    </span>
                                  </div>
                                  
                                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-gray-700 w-20">顧客:</span>
                                      <span className="text-sm text-gray-900">{reservation.customer_name}</span>
                                      {reservation.customer_phone && (
                                        <span className="text-sm text-gray-500 ml-2">({reservation.customer_phone})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-gray-700 w-20">メニュー:</span>
                                      <span className="text-sm text-gray-900">
                                        {reservation.menu_name} (¥{reservation.menu_price.toLocaleString()}, {reservation.menu_duration}分)
                                      </span>
                                    </div>
                                    {reservation.staff_name && (
                                      <div className="flex items-center">
                                        <span className="text-sm font-medium text-gray-700 w-20">スタッフ:</span>
                                        <span className="text-sm text-gray-900">{reservation.staff_name}</span>
                                      </div>
                                    )}
                                    {reservation.notes && (
                                      <div className="flex items-start pt-2 border-t border-gray-200">
                                        <span className="text-sm font-medium text-gray-700 w-20">備考:</span>
                                        <span className="text-sm text-gray-600">{reservation.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  {reservation.status !== 'cancelled' && (
                                    <>
                                      <select
                                        value={reservation.status}
                                        onChange={(e) => handleStatusChange(reservation.reservation_id, e.target.value)}
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                      >
                                        <option value="confirmed">予約確定</option>
                                        <option value="completed">完了</option>
                                        <option value="cancelled">キャンセル</option>
                                      </select>
                                      <button
                                        onClick={() => handleOpenModal(reservation)}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                        title="編集"
                                      >
                                        <PencilIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleCancel(reservation.reservation_id)}
                                        className="p-2 text-gray-400 hover:text-red-600"
                                        title="キャンセル"
                                      >
                                        <XMarkIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingReservation ? '予約を編集' : '予約を追加'}
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
                    {/* 顧客選択 */}
                    <div>
                      <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                        顧客
                      </label>
                      <select
                        id="customer_id"
                        value={formData.customer_id}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">新規顧客を入力</option>
                        {customers.map((customer) => (
                          <option key={customer.customer_id} value={customer.customer_id}>
                            {customer.real_name} {customer.phone_number && `(${customer.phone_number})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 新規顧客情報（顧客が選択されていない場合） */}
                    {!formData.customer_id && (
                      <>
                        <div>
                          <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                            顧客名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="customer_name"
                            required={!formData.customer_id}
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700">
                              メールアドレス
                            </label>
                            <input
                              type="email"
                              id="customer_email"
                              value={formData.customer_email}
                              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700">
                              電話番号
                            </label>
                            <input
                              type="tel"
                              id="customer_phone"
                              value={formData.customer_phone}
                              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="menu_id" className="block text-sm font-medium text-gray-700">
                          メニュー <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="menu_id"
                          required
                          value={formData.menu_id}
                          onChange={(e) => {
                            setFormData({ ...formData, menu_id: e.target.value, reservation_time: '' });
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
                        <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
                          スタッフ <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="staff_id"
                          value={formData.staff_id}
                          onChange={(e) => {
                            setFormData({ ...formData, staff_id: e.target.value, reservation_time: '' });
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reservation_date" className="block text-sm font-medium text-gray-700">
                          予約日 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="reservation_date"
                          required
                          value={formData.reservation_date}
                          onChange={(e) => {
                            setFormData({ ...formData, reservation_date: e.target.value, reservation_time: '' });
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="reservation_time" className="block text-sm font-medium text-gray-700">
                          予約時間 <span className="text-red-500">*</span>
                          {formData.staff_id && formData.menu_id && formData.reservation_date && (
                            <span className="ml-2 text-xs text-gray-500">
                              {loadingTimes ? '(読み込み中...)' : `(${availableTimes.length}件の空き時間)`}
                            </span>
                          )}
                        </label>
                        {formData.staff_id && formData.menu_id && formData.reservation_date ? (
                          <select
                            id="reservation_time"
                            required
                            value={formData.reservation_time}
                            onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
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
                            id="reservation_time"
                            required
                            value={formData.reservation_time}
                            onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="スタッフとメニューを選択してください"
                            disabled={!formData.staff_id || !formData.menu_id}
                          />
                        )}
                        {formData.staff_id && formData.menu_id && formData.reservation_date && availableTimes.length === 0 && !loadingTimes && (
                          <p className="mt-1 text-sm text-red-600">
                            この日は利用可能な時間がありません。別の日付を選択してください。
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        ステータス
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="confirmed">予約確定</option>
                        <option value="completed">完了</option>
                        <option value="cancelled">キャンセル</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        備考
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="備考を入力してください"
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
                      {editingReservation ? '更新' : '追加'}
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

