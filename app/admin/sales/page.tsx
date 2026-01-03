'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminLinkUrl, getApiUrlWithTenantId } from '@/lib/admin-utils';
import AdminNav from '@/app/components/AdminNav';
import { 
  CurrencyYenIcon,
  XMarkIcon,
  CalendarDaysIcon,
  PrinterIcon,
  ChartBarIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SalesDetail {
  id: number;
  date: string;
  status: string;
  price: number;
  customer_name: string | null;
  staff_name: string | null;
  menu_name?: string;
  menus?: string[];
  product_name?: string;
  quantity?: number;
  type: 'reservation' | 'product';
}

interface SalesSummary {
  todayTotal: number;
  monthTotal: number;
  todayCount: number;
  monthCount: number;
}

interface Staff {
  staff_id: number;
  name: string;
}

export default function SalesManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [todaySales, setTodaySales] = useState<SalesDetail[]>([]);
  const [monthSales, setMonthSales] = useState<SalesDetail[]>([]);
  const [allSales, setAllSales] = useState<SalesDetail[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'month' | 'custom' | 'past-month'>('today');
  const [loadingSales, setLoadingSales] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'reservation' | 'product'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all'); // 'all' or staff_id
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'staff' | 'customer' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    loadSummary();
    loadTodaySales();
    loadStaff();
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
    }
  };

  // 過去の月のタブが選択された時、または年・月が変更された時にデータを読み込む
  useEffect(() => {
    if (activeTab === 'past-month' && selectedYear && selectedMonth) {
      loadMonthSales(selectedYear, selectedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedYear, selectedMonth]);

  const loadSummary = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      const url = tenantId ? `/api/admin/statistics?tenantId=${tenantId}` : '/api/admin/statistics';
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setSummary({
          todayTotal: data.todaySales || 0,
          monthTotal: data.monthlySales || 0,
          todayCount: data.todayReservations || 0,
          monthCount: 0 // 月間件数は別途計算
        });
      }
    } catch (error) {
      console.error('売上サマリー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySales = async () => {
    setLoadingSales(true);
    setError('');
    try {
      let url = '/api/admin/sales-details?type=today';
      url = getApiUrlWithTenantId(url);
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '今日の売上データの取得に失敗しました');
      }

      const data = await response.json();
      setTodaySales(data);
    } catch (error: any) {
      console.error('今日の売上取得エラー:', error);
      setError(error.message || '売上データの取得に失敗しました');
      setTodaySales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  const loadMonthSales = async (year?: number, month?: number) => {
    setLoadingSales(true);
    setError('');
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get('tenantId');
      
      // 年・月が指定されている場合は過去の月の売上を取得
      if (year && month) {
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        let url = `/api/admin/sales-details?type=custom&startDate=${startDateStr}&endDate=${endDateStr}`;
        url = getApiUrlWithTenantId(url);
        
        console.log('過去の売上取得:', { year, month, startDateStr, endDateStr, url });
        
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('過去の売上取得エラー:', { status: response.status, errorData, url });
          throw new Error(errorData.error || `過去の売上データの取得に失敗しました (${response.status})`);
        }

        const data = await response.json();
        console.log('過去の売上データ取得成功:', { 
          count: data.length, 
          year, 
          month,
          startDateStr, 
          endDateStr,
          url,
          data: data.slice(0, 5) // 最初の5件だけ表示
        });
        
        if (data.length === 0) {
          console.warn('過去の売上データが0件です:', { year, month, startDateStr, endDateStr });
        }
        
        setAllSales(data);
      } else {
        // 今月の売上を取得
        let url = '/api/admin/sales-details?type=month';
        url = getApiUrlWithTenantId(url);
        
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '今月の売上データの取得に失敗しました');
        }

        const data = await response.json();
        setMonthSales(data);
      }
    } catch (error: any) {
      console.error('月間売上取得エラー:', error);
      setError(error.message || '売上データの取得に失敗しました');
      // エラー時は空配列を設定
      if (year && month) {
        setAllSales([]);
      } else {
        setMonthSales([]);
      }
    } finally {
      setLoadingSales(false);
    }
  };

  const loadCustomSales = async () => {
    if (!startDate || !endDate) {
      setError('開始日と終了日を選択してください');
      return;
    }
    
    setLoadingSales(true);
    setError('');
    try {
      let url = `/api/admin/sales-details?type=custom&startDate=${startDate}&endDate=${endDate}`;
      url = getApiUrlWithTenantId(url);
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '期間指定の売上データの取得に失敗しました');
      }

      const data = await response.json();
      setAllSales(data);
    } catch (error: any) {
      console.error('期間指定売上取得エラー:', error);
      setError(error.message || '売上データの取得に失敗しました');
      setAllSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleTabChange = (tab: 'today' | 'month' | 'custom' | 'past-month') => {
    setActiveTab(tab);
    if (tab === 'month') {
      loadMonthSales();
    } else if (tab === 'past-month') {
      // 過去の月の売上を読み込む
      loadMonthSales(selectedYear, selectedMonth);
    } else if (tab === 'custom') {
      // カスタムタブに切り替えた時は、日付が設定されていれば自動的に読み込む
      if (startDate && endDate) {
        loadCustomSales();
      }
    }
  };

  const handlePastMonthChange = () => {
    if (selectedYear && selectedMonth) {
      // データをクリアしてから再読み込み
      setAllSales([]);
      setError('');
      loadMonthSales(selectedYear, selectedMonth);
    }
  };

  const handlePrint = () => {
    // 印刷用のスタイルを適用してから印刷
    window.print();
  };

  // 過去12ヶ月のリストを生成
  const getPastMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`
      });
    }
    return months;
  };

  const getFilteredSales = () => {
    let sales: SalesDetail[] = [];
    if (activeTab === 'today') {
      sales = todaySales;
    } else if (activeTab === 'month') {
      sales = monthSales;
    } else if (activeTab === 'past-month') {
      sales = allSales; // 過去の月の売上はallSalesに格納
    } else {
      sales = allSales;
    }

    // タイプフィルター適用
    if (salesTypeFilter !== 'all') {
      sales = sales.filter(sale => sale.type === salesTypeFilter);
    }

    // 担当者フィルター適用
    if (staffFilter !== 'all') {
      const staffId = parseInt(staffFilter);
      sales = sales.filter(sale => {
        if (!sale.staff_name) return false;
        const selectedStaff = staff.find(s => s.staff_id === staffId);
        return selectedStaff && sale.staff_name === selectedStaff.name;
      });
    }

    // ソート適用
    const sortedSales = [...sales].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'staff':
          const staffA = a.staff_name || '';
          const staffB = b.staff_name || '';
          comparison = staffA.localeCompare(staffB, 'ja');
          break;
        case 'customer':
          const customerA = a.customer_name || '';
          const customerB = b.customer_name || '';
          comparison = customerA.localeCompare(customerB, 'ja');
          break;
        case 'amount':
          comparison = a.price - b.price;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sortedSales;
  };

  const getTotalSales = () => {
    return getFilteredSales().reduce((sum, sale) => sum + sale.price, 0);
  };

  const getReservationSales = () => {
    return getFilteredSales()
      .filter(sale => sale.type === 'reservation')
      .reduce((sum, sale) => sum + sale.price, 0);
  };

  const getProductSales = () => {
    return getFilteredSales()
      .filter(sale => sale.type === 'product')
      .reduce((sum, sale) => sum + sale.price, 0);
  };

  // チャート用のデータを準備
  const prepareChartData = () => {
    const sales = getFilteredSales();
    
    // 期間指定の場合は、開始日から終了日までのすべての日付を生成
    let dateRange: Date[] = [];
    if (activeTab === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const current = new Date(start);
      while (current <= end) {
        dateRange.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (activeTab === 'past-month' && selectedYear && selectedMonth) {
      // 過去の月の場合は、その月のすべての日付を生成
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      const current = new Date(firstDay);
      while (current <= lastDay) {
        dateRange.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (activeTab === 'month') {
      // 今月の場合は、今月のすべての日付を生成
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const current = new Date(firstDay);
      while (current <= lastDay) {
        dateRange.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    // 日付別の売上を集計
    const salesByDate: Record<string, { reservation: number; product: number; total: number }> = {};
    
    // 期間指定の場合は、すべての日付を0で初期化
    if (dateRange.length > 0) {
      dateRange.forEach(date => {
        // 年を含めた日付キーを使用（YYYY-MM-DD形式）
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        salesByDate[dateKey] = { reservation: 0, product: 0, total: 0 };
      });
    }
    
    // 実際の売上データを集計
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      // 期間指定の場合は年を含めたキー、それ以外は月/日のみ
      let dateKey: string;
      if (dateRange.length > 0) {
        const year = saleDate.getFullYear();
        const month = String(saleDate.getMonth() + 1).padStart(2, '0');
        const day = String(saleDate.getDate()).padStart(2, '0');
        dateKey = `${year}-${month}-${day}`;
      } else {
        dateKey = saleDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
      }
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { reservation: 0, product: 0, total: 0 };
      }
      if (sale.type === 'reservation') {
        salesByDate[dateKey].reservation += sale.price;
      } else {
        salesByDate[dateKey].product += sale.price;
      }
      salesByDate[dateKey].total += sale.price;
    });

    // スタッフ別の売上を集計
    const salesByStaff: Record<string, number> = {};
    sales.forEach(sale => {
      const staffName = sale.staff_name || '未指定';
      if (!salesByStaff[staffName]) {
        salesByStaff[staffName] = 0;
      }
      salesByStaff[staffName] += sale.price;
    });

    // 日付をソート
    let sortedDates: string[];
    let dateLabels: string[]; // 表示用のラベル
    if (dateRange.length > 0) {
      // 期間指定の場合は、生成した日付範囲を使用
      sortedDates = dateRange.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });
      // 表示用ラベルは月/日のみ
      dateLabels = dateRange.map(date => 
        date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
      );
    } else {
      // それ以外の場合は、データがある日付をソート
      sortedDates = Object.keys(salesByDate).sort((a, b) => {
        // YYYY-MM-DD形式の場合は直接比較
        if (a.includes('-') && b.includes('-')) {
          return a.localeCompare(b);
        }
        // 月/日形式の場合は現在の年を使用して比較
        const currentYear = new Date().getFullYear();
        const dateA = new Date(`${currentYear}/${a}`);
        const dateB = new Date(`${currentYear}/${b}`);
        return dateA.getTime() - dateB.getTime();
      });
      dateLabels = sortedDates.map(date => {
        // YYYY-MM-DD形式の場合は月/日に変換
        if (date.includes('-')) {
          const [year, month, day] = date.split('-');
          return `${parseInt(month)}/${parseInt(day)}`;
        }
        return date;
      });
    }

    return {
      byDate: {
        labels: dateLabels,
        reservationData: sortedDates.map(date => salesByDate[date]?.reservation || 0),
        productData: sortedDates.map(date => salesByDate[date]?.product || 0),
        totalData: sortedDates.map(date => salesByDate[date]?.total || 0)
      },
      byStaff: {
        labels: Object.keys(salesByStaff),
        data: Object.values(salesByStaff)
      }
    };
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  // データを準備
  const filteredSales = getFilteredSales();
  const totalSales = getTotalSales();
  const reservationSales = getReservationSales();
  const productSales = getProductSales();

  // チャート用のデータを準備
  const chartData = prepareChartData();

  // 日付別チャートのデータ
  const dateChartData = {
    labels: chartData.byDate.labels,
    datasets: [
      {
        label: '予約売上',
        data: chartData.byDate.reservationData,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: '物販売上',
        data: chartData.byDate.productData,
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
      {
        label: '総売上',
        data: chartData.byDate.totalData,
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  // スタッフ別チャートのデータ
  const staffChartData = {
    labels: chartData.byStaff.labels,
    datasets: [
      {
        label: '売上',
        data: chartData.byStaff.data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(139, 92, 246, 0.5)',
          'rgba(236, 72, 153, 0.5)',
          'rgba(251, 191, 36, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // チャートオプション
  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '売上推移',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return '¥' + numValue.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/admin/sales" title="売上管理" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900">売上管理</h2>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              印刷
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* サマリーカード */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8 print:hidden">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今日の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{summary?.todayTotal.toLocaleString() || '0'}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {todaySales.length}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CurrencyYenIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今月の売上
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        ¥{summary?.monthTotal.toLocaleString() || '0'}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {monthSales.length}件
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px print:hidden">
                <button
                  onClick={() => handleTabChange('today')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'today'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  今日の売上
                </button>
                <button
                  onClick={() => handleTabChange('month')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'month'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  今月の売上
                </button>
                <button
                  onClick={() => handleTabChange('past-month')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'past-month'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  過去の売上
                </button>
                <button
                  onClick={() => handleTabChange('custom')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'custom'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  期間指定
                </button>
              </nav>
            </div>

            {/* 表示モード切り替え */}
            <div className="p-4 border-b border-gray-200 print:hidden">
              <div className="flex justify-between items-center mb-4">
                <nav className="flex space-x-4">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      viewMode === 'table'
                        ? 'bg-pink-100 text-pink-700 border-2 border-pink-500'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <TableCellsIcon className="w-5 h-5 mr-2" />
                    テーブル表示
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      viewMode === 'chart'
                        ? 'bg-pink-100 text-pink-700 border-2 border-pink-500'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    チャート表示
                  </button>
                </nav>
                {viewMode === 'chart' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">グラフタイプ:</label>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as 'bar' | 'line')}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="bar">棒グラフ</option>
                      <option value="line">折れ線グラフ</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 期間指定とフィルター */}
            <div className="p-4 border-b border-gray-200 print:hidden">
              {activeTab === 'past-month' && (
                <div className="flex flex-wrap gap-4 items-end mb-4">
                  <div>
                    <label htmlFor="selectedYear" className="block text-sm font-medium text-gray-700 mb-1">
                      年
                    </label>
                    <select
                      id="selectedYear"
                      value={selectedYear}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        setSelectedYear(newYear);
                        setAllSales([]); // データをクリア
                        setError(''); // エラーもクリア
                        // タブが過去の月の場合は自動的に再読み込み
                        if (activeTab === 'past-month' && newYear && selectedMonth) {
                          loadMonthSales(newYear, selectedMonth);
                        }
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}年
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="selectedMonth" className="block text-sm font-medium text-gray-700 mb-1">
                      月
                    </label>
                    <select
                      id="selectedMonth"
                      value={selectedMonth}
                      onChange={(e) => {
                        const newMonth = parseInt(e.target.value);
                        setSelectedMonth(newMonth);
                        setAllSales([]); // データをクリア
                        setError(''); // エラーもクリア
                        // タブが過去の月の場合は自動的に再読み込み
                        if (activeTab === 'past-month' && selectedYear && newMonth) {
                          loadMonthSales(selectedYear, newMonth);
                        }
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {month}月
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handlePastMonthChange}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    検索
                  </button>
                </div>
              )}
              {activeTab === 'custom' && (
                <div className="flex flex-wrap gap-4 items-end mb-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      開始日
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      終了日
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  <button
                    onClick={loadCustomSales}
                    disabled={!startDate || !endDate}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    検索
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">表示フィルター:</label>
                  <select
                    value={salesTypeFilter}
                    onChange={(e) => setSalesTypeFilter(e.target.value as 'all' | 'reservation' | 'product')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="all">総売上（予約+物販）</option>
                    <option value="reservation">予約のみ</option>
                    <option value="product">物販のみ</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">担当者:</label>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="all">すべて</option>
                    {staff.map((s) => (
                      <option key={s.staff_id} value={s.staff_id.toString()}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">並び替え:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'staff' | 'customer' | 'amount')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="date">日時</option>
                    <option value="staff">担当者</option>
                    <option value="customer">顧客</option>
                    <option value="amount">金額</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    title={sortOrder === 'asc' ? '昇順' : '降順'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* チャート表示 */}
              {viewMode === 'chart' && (
                <div className="space-y-6">
                  {/* 日付別売上チャート */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">日付別売上推移</h3>
                    <div style={{ height: '400px' }}>
                      {chartType === 'bar' ? (
                        <Bar data={dateChartData} options={chartOptions} />
                      ) : (
                        <Line data={dateChartData} options={chartOptions} />
                      )}
                    </div>
                  </div>

                  {/* スタッフ別売上チャート */}
                  {chartData.byStaff.labels.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">スタッフ別売上</h3>
                      <div style={{ height: '400px' }}>
                        {chartType === 'bar' ? (
                          <Bar data={staffChartData} options={chartOptions} />
                        ) : (
                          <Line data={staffChartData} options={chartOptions} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* サマリーカード */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-800 mb-1">総売上（予約+物販）</div>
                      <div className="text-2xl font-bold text-blue-900">¥{totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-green-800 mb-1">予約売上</div>
                      <div className="text-2xl font-bold text-green-900">¥{reservationSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-purple-800 mb-1">物販売上</div>
                      <div className="text-2xl font-bold text-purple-900">¥{productSales.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* テーブル表示 */}
              {viewMode === 'table' && (
                <div>
              {/* 印刷用ヘッダー */}
              <div className="hidden print:block mb-4 pb-4 border-b-2 border-gray-400">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">売上管理</h1>
                {activeTab === 'past-month' && (
                  <p className="text-sm text-gray-700">
                    {selectedYear}年{selectedMonth}月の売上
                  </p>
                )}
                {activeTab === 'custom' && startDate && endDate && (
                  <p className="text-sm text-gray-700">
                    {startDate} ～ {endDate} の売上
                  </p>
                )}
                {activeTab === 'today' && (
                  <p className="text-sm text-gray-700">
                    {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} の売上
                  </p>
                )}
                {activeTab === 'month' && (
                  <p className="text-sm text-gray-700">
                    {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })} の売上
                  </p>
                )}
                {salesTypeFilter !== 'all' && (
                  <p className="text-sm text-gray-700 mt-1">
                    フィルター: {salesTypeFilter === 'reservation' ? '予約のみ' : '物販のみ'}
                  </p>
                )}
              </div>

              {loadingSales ? (
                <div className="text-center py-8">
                  <p>読み込み中...</p>
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  売上データがありません
                </div>
              ) : (
                <>
                  {/* 売上サマリー（印刷時も表示） */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:bg-white print:border-gray-400 print:border-2">
                      <div className="text-sm font-medium text-blue-800 mb-1 print:text-gray-900 print:font-bold">総売上（予約+物販）</div>
                      <div className="text-2xl font-bold text-blue-900 print:text-gray-900">¥{totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 print:bg-white print:border-gray-400 print:border-2">
                      <div className="text-sm font-medium text-green-800 mb-1 print:text-gray-900 print:font-bold">予約売上</div>
                      <div className="text-2xl font-bold text-green-900 print:text-gray-900">¥{reservationSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 print:bg-white print:border-gray-400 print:border-2">
                      <div className="text-sm font-medium text-purple-800 mb-1 print:text-gray-900 print:font-bold">物販売上</div>
                      <div className="text-2xl font-bold text-purple-900 print:text-gray-900">¥{productSales.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 print:border-collapse">
                      <thead className="bg-gray-50 print:bg-gray-100">
                        <tr>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400 cursor-pointer hover:bg-gray-100 print:cursor-default print:hover:bg-gray-100"
                            onClick={() => {
                              if (sortBy === 'date') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('date');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              日時
                              {sortBy === 'date' && (
                                <span className="text-pink-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400">
                            種類
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400 cursor-pointer hover:bg-gray-100 print:cursor-default print:hover:bg-gray-100"
                            onClick={() => {
                              if (sortBy === 'customer') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('customer');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              顧客
                              {sortBy === 'customer' && (
                                <span className="text-pink-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400">
                            内容
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400 cursor-pointer hover:bg-gray-100 print:cursor-default print:hover:bg-gray-100"
                            onClick={() => {
                              if (sortBy === 'staff') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('staff');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              スタッフ
                              {sortBy === 'staff' && (
                                <span className="text-pink-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-400 cursor-pointer hover:bg-gray-100 print:cursor-default print:hover:bg-gray-100"
                            onClick={() => {
                              if (sortBy === 'amount') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('amount');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              金額
                              {sortBy === 'amount' && (
                                <span className="text-pink-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSales.map((sale, index) => (
                          <tr key={`${sale.type}-${sale.id}-${index}`} className="print:border-b print:border-gray-300">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:border print:border-gray-400">
                              {new Date(sale.date).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm print:border print:border-gray-400">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                sale.type === 'reservation' 
                                  ? 'bg-blue-100 text-blue-800 print:bg-white print:text-gray-900' 
                                  : 'bg-green-100 text-green-800 print:bg-white print:text-gray-900'
                              }`}>
                                {sale.type === 'reservation' ? '予約' : '商品'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:border print:border-gray-400">
                              {sale.customer_name || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 print:border print:border-gray-400">
                              {sale.type === 'reservation' 
                                ? (sale.menus && sale.menus.length > 0 
                                    ? sale.menus.join(', ') 
                                    : sale.menu_name || '-')
                                : `${sale.product_name || '-'} × ${sale.quantity || 1}`
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:border print:border-gray-400">
                              {sale.staff_name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right print:border print:border-gray-400">
                              ¥{sale.price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 print:bg-gray-100">
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900 print:border print:border-gray-400">
                            合計
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 print:border print:border-gray-400">
                            ¥{totalSales.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

