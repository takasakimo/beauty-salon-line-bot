'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrlWithTenantId, getAdminLinkUrl } from '@/lib/admin-utils';
import { 
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface MenuItem {
  menu_id: number;
  menu_name: string;
  price: number;
  duration: number;
}

interface Reservation {
  reservation_id: number;
  reservation_date: string;
  status: string;
  price: number;
  total_price?: number;
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
  menus?: MenuItem[];
  total_duration?: number;
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

// タイムスケジュール表示コンポーネント
function TimelineScheduleView({ 
  reservations, 
  onEdit, 
  onStatusChange, 
  onCancel 
}: { 
  reservations: Reservation[];
  onEdit: (reservation: Reservation) => void;
  onStatusChange: (id: number, status: string) => void;
  onCancel: (id: number) => void;
}) {
  // 時間をフォーマット（HH:MM）
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // 1週間分の日付を生成（今日から7日後まで）
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  
  // 時間スロット（9:00-20:00、30分間隔）
  const timeSlots: string[] = [];
  for (let hour = 9; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // 日付をキーとして予約をグループ化
  const reservationsByDate = weekDates.reduce((acc, date) => {
    const dateKey = date.toISOString().split('T')[0];
    acc[dateKey] = reservations.filter(r => {
      const reservationDate = new Date(r.reservation_date).toISOString().split('T')[0];
      return reservationDate === dateKey;
    });
    return acc;
  }, {} as Record<string, Reservation[]>);

  // 時間を分に変換
  const timeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };

  // 予約の開始時間と終了時間を取得
  const getReservationTimeRange = (reservation: Reservation) => {
    const start = new Date(reservation.reservation_date);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = reservation.total_duration || reservation.menu_duration || 60;
    const endMinutes = startMinutes + duration;
    return { startMinutes, endMinutes, start, duration };
  };

  // 予約の位置と高さを計算
  const getReservationStyle = (reservation: Reservation) => {
    const { startMinutes, duration } = getReservationTimeRange(reservation);
    const slotHeight = 40; // 各時間スロットの高さ（px）
    const minutesPerSlot = 30;
    
    const top = ((startMinutes - timeToMinutes('09:00')) / minutesPerSlot) * slotHeight;
    const height = Math.max((duration / minutesPerSlot) * slotHeight, 60);
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '60px'
    };
  };

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayName})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex border-b border-gray-200">
          {/* 時間列 */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            <div className="h-12 border-b border-gray-200"></div>
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-10 border-b border-gray-100 text-xs text-gray-600 px-2 flex items-center"
                style={{ height: '40px' }}
              >
                {time}
              </div>
            ))}
          </div>
          
          {/* 日付列 */}
          {weekDates.map((date) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayReservations = reservationsByDate[dateKey] || [];
            
            return (
              <div
                key={dateKey}
                className="flex-1 min-w-[200px] border-r border-gray-200 relative"
              >
                {/* 日付ヘッダー */}
                <div className="h-12 border-b border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-4 w-4 text-pink-600 mr-1" />
                    <span className="text-sm font-semibold text-gray-900">
                      {formatDate(date)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({dayReservations.length}件)
                  </span>
                </div>
                
                {/* 時間スロット */}
                <div className="relative" style={{ height: `${timeSlots.length * 40}px` }}>
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="border-b border-gray-100"
                      style={{ height: '40px' }}
                    ></div>
                  ))}
                  
                  {/* 予約ブロック */}
                  {dayReservations.map((reservation) => {
                    const style = getReservationStyle(reservation);
                    const { start } = getReservationTimeRange(reservation);
                    const isCancelled = reservation.status === 'cancelled';
                    
                    return (
                      <div
                        key={reservation.reservation_id}
                        className={`absolute left-1 right-1 rounded p-2 shadow-sm border-l-4 ${
                          isCancelled
                            ? 'bg-gray-100 border-gray-300 opacity-60'
                            : reservation.status === 'completed'
                            ? 'bg-green-50 border-green-400'
                            : 'bg-pink-50 border-pink-400'
                        }`}
                        style={style}
                      >
                        <div className="text-xs font-semibold text-gray-900 mb-1">
                          {formatTime(reservation.reservation_date)}
                        </div>
                        <div className="text-xs text-gray-700 font-medium mb-1">
                          {reservation.customer_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {reservation.menus && reservation.menus.length > 1 ? (
                            <div>
                              {reservation.menus.map((menu, idx) => (
                                <div key={menu.menu_id}>
                                  {idx > 0 && ' + '}
                                  {menu.menu_name}
                                </div>
                              ))}
                              <div className="mt-1 font-semibold">
                                ¥{(reservation.total_price || reservation.price || 0).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {reservation.menu_name}
                              <div className="mt-1">
                                ¥{(reservation.total_price || reservation.menu_price || reservation.price || 0).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                        {reservation.staff_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            {reservation.staff_name}
                          </div>
                        )}
                        <div className="flex items-center space-x-1 mt-2">
                          {!isCancelled && (
                            <>
                              <button
                                onClick={() => onEdit(reservation)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="編集"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => onCancel(reservation.reservation_id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="キャンセル"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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
    selectedMenuIds: [] as number[],
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
    // URLパラメータから日付を取得
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      if (dateParam) {
        setFilterDate(dateParam);
      } else {
        // dateパラメータがない場合は、今日の日付をデフォルトとして設定
        const today = new Date().toISOString().split('T')[0];
        setFilterDate(today);
      }
    }
    // 他のデータ（顧客、メニュー、スタッフ）を読み込む
    loadCustomers();
    loadMenus();
    loadStaff();
    // loadReservationsはfilterDateが変更されたときにuseEffectで自動的に呼び出される
  }, []);

  useEffect(() => {
    loadReservations();
  }, [filterDate, filterStatus]);

  // メニュー、日付が選択されたら利用可能な時間を取得（スタッフは任意）
  useEffect(() => {
    if (formData.selectedMenuIds.length > 0 && formData.reservation_date) {
      loadAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [formData.staff_id, formData.selectedMenuIds, formData.reservation_date]);

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
      let baseUrl = '/api/admin/reservations';
      const params = new URLSearchParams();
      // filterDateが空文字列の場合は、今日の日付を使用
      const dateToFilter = filterDate || new Date().toISOString().split('T')[0];
      params.append('date', dateToFilter);
      if (filterStatus) params.append('status', filterStatus);
      baseUrl += '?' + params.toString();
      
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
      const url = getApiUrlWithTenantId('/api/admin/customers');
      const response = await fetch(url, {
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
      const url = getApiUrlWithTenantId('/api/admin/menus');
      const response = await fetch(url, {
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
      // 管理画面用のスタッフAPIを使用
      const url = getApiUrlWithTenantId('/api/admin/staff');
      const response = await fetch(url, {
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
    if (formData.selectedMenuIds.length === 0 || !formData.reservation_date) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    try {
      // 複数メニューの場合は最初のメニューIDを使用（合計時間はAPI側で計算）
      const menuIdsParam = formData.selectedMenuIds.join(',');
      // スタッフが選択されている場合はstaff_idを渡す、そうでなければ渡さない
      const staffParam = formData.staff_id ? `&staff_id=${formData.staff_id}` : '';
      const response = await fetch(
        `/api/reservations/available-slots?date=${formData.reservation_date}&menu_id=${menuIdsParam}${staffParam}`
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
      // 複数メニューの場合はmenus配列から取得、そうでなければmenu_idから
      const menuIds = reservation.menus && reservation.menus.length > 0
        ? reservation.menus.map(m => m.menu_id)
        : [reservation.menu_id];
      setFormData({
        customer_id: reservation.customer_id.toString(),
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email || '',
        customer_phone: reservation.customer_phone || '',
        selectedMenuIds: menuIds,
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
        selectedMenuIds: [],
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

  const handleMenuToggle = (menuId: number) => {
    const isSelected = formData.selectedMenuIds.includes(menuId);
    if (isSelected) {
      setFormData({
        ...formData,
        selectedMenuIds: formData.selectedMenuIds.filter(id => id !== menuId),
        reservation_time: ''
      });
    } else {
      setFormData({
        ...formData,
        selectedMenuIds: [...formData.selectedMenuIds, menuId],
        reservation_time: ''
      });
    }
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
      // 日付と時間を結合（JSTタイムゾーンを明示）
      // YYYY-MM-DDTHH:mm:ss+09:00形式で送信（JSTを明示的に指定）
      const reservationDateTime = `${formData.reservation_date}T${formData.reservation_time}:00+09:00`;

      const baseUrl = editingReservation 
        ? `/api/admin/reservations/${editingReservation.reservation_id}`
        : '/api/admin/reservations';
      const url = getApiUrlWithTenantId(baseUrl);
      
      const method = editingReservation ? 'PUT' : 'POST';
      
      const body: any = {
        menu_ids: formData.selectedMenuIds,
        staff_id: formData.staff_id ? parseInt(formData.staff_id) : null,
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
      const url = getApiUrlWithTenantId(`/api/admin/reservations/${reservationId}`);
      const response = await fetch(url, {
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

      // 複数メニューの場合はmenu_idsを配列で送信、そうでなければmenu_idを送信
      const menuIds = reservation.menus && reservation.menus.length > 0
        ? reservation.menus.map(m => m.menu_id)
        : [reservation.menu_id];

      const url = getApiUrlWithTenantId(`/api/admin/reservations/${reservationId}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          menu_ids: menuIds,
          menu_id: reservation.menu_id, // 後方互換性のため
          staff_id: reservation.staff_id,
          reservation_date: reservationDateTime,
          status: newStatus,
          notes: reservation.notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'ステータス変更に失敗しました' }));
        throw new Error(errorData.error || 'ステータス変更に失敗しました');
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
                  href={getAdminLinkUrl('/admin/dashboard')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  ダッシュボード
                </Link>
                <Link
                  href={getAdminLinkUrl('/admin/reservations')}
                  className="border-pink-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
                            <strong>メニュー:</strong> 
                            {reservation.menus && reservation.menus.length > 1 ? (
                              <div className="mt-1">
                                {reservation.menus.map((menu, idx) => (
                                  <div key={menu.menu_id} className="text-xs">
                                    {idx > 0 && ' + '}
                                    {menu.menu_name} (¥{menu.price.toLocaleString()}, {menu.duration}分)
                                  </div>
                                ))}
                                <div className="mt-1 font-semibold text-gray-700">
                                  合計: ¥{(reservation.total_price || reservation.price || 0).toLocaleString()} / {reservation.total_duration || reservation.menu_duration || 0}分
                                </div>
                              </div>
                            ) : (
                              <span>
                                {reservation.menu_name} (¥{(reservation.total_price || reservation.menu_price || 0).toLocaleString()}, {reservation.total_duration || reservation.menu_duration || 0}分)
                              </span>
                            )}
                          </div>
                          <div>
                            <strong>スタッフ:</strong> {reservation.staff_name || 'スタッフ選択なし'}
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
              {Object.keys(groupReservationsByDate()).length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  予約が登録されていません
                </div>
              ) : (
                <TimelineScheduleView reservations={getFilteredReservations()} onEdit={handleOpenModal} onStatusChange={handleStatusChange} onCancel={handleCancel} />
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        メニュー <span className="text-red-500">*</span>
                        <span className="ml-2 text-xs text-gray-500">
                          複数のメニューを選択できます
                        </span>
                      </label>
                      <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                        {menus.length === 0 ? (
                          <p className="text-sm text-gray-500">メニューが登録されていません</p>
                        ) : (
                          menus.map((menu) => {
                            const isSelected = formData.selectedMenuIds.includes(menu.menu_id);
                            return (
                              <label
                                key={menu.menu_id}
                                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-pink-500 bg-pink-50'
                                    : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleMenuToggle(menu.menu_id)}
                                  className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3 flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{menu.name}</div>
                                  <div className="text-sm text-gray-600">
                                    ¥{menu.price.toLocaleString()} / {menu.duration}分
                                  </div>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {formData.selectedMenuIds.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          選択中: {formData.selectedMenuIds.length}件
                          {(() => {
                            const selectedMenus = menus.filter(m => formData.selectedMenuIds.includes(m.menu_id));
                            const totalPrice = selectedMenus.reduce((sum, m) => sum + m.price, 0);
                            const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);
                            return (
                              <span className="ml-2">
                                (合計: ¥{totalPrice.toLocaleString()} / {totalDuration}分)
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div>
                        <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
                          スタッフ
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
                          {formData.selectedMenuIds.length > 0 && formData.reservation_date && (
                            <span className="ml-2 text-xs text-gray-500">
                              {loadingTimes ? '(読み込み中...)' : `(${availableTimes.length}件の空き時間)`}
                            </span>
                          )}
                        </label>
                        {formData.selectedMenuIds.length > 0 && formData.reservation_date ? (
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
                            placeholder="メニューと日付を選択してください"
                            disabled={formData.selectedMenuIds.length === 0 || !formData.reservation_date}
                          />
                        )}
                        {formData.staff_id && formData.selectedMenuIds.length > 0 && formData.reservation_date && availableTimes.length === 0 && !loadingTimes && (
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

