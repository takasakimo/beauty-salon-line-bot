'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/app/contexts/CartContext';
import { getApiUrlWithTenantId } from '@/lib/admin-utils';
import { XMarkIcon, ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, removeFromCart, updateQuantity, updatePrice, clearCart, getTotalPrice } = useCart();
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseTime, setPurchaseTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadStaffList();
      loadProducts();
      const now = new Date();
      setPurchaseDate(now.toISOString().split('T')[0]);
      setPurchaseTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen]);

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

  const loadProducts = async () => {
    try {
      const url = getApiUrlWithTenantId('/api/admin/products');
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('商品取得エラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('顧客を選択してください');
      return;
    }

    if (cart.length === 0) {
      setError('カートが空です');
      return;
    }

    setIsSubmitting(true);

    try {
      const purchaseDateTime = new Date(`${purchaseDate}T${purchaseTime}`);
      
      // 各商品を順番に販売登録
      const promises = cart.map((item) => {
        const productData = products.find(p => p.product_id === item.product_id);
        const totalPrice = item.quantity * item.unit_price;

        return fetch(getApiUrlWithTenantId('/api/admin/product-purchases'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: parseInt(selectedCustomerId),
            product_id: item.product_id,
            product_name: item.product_name,
            product_category: item.product_category || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: totalPrice,
            purchase_date: purchaseDateTime.toISOString(),
            staff_id: selectedStaffId ? parseInt(selectedStaffId) : null,
            notes: notes || null
          }),
        });
      });

      const responses = await Promise.all(promises);
      const errors = [];
      
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const errorData = await responses[i].json();
          errors.push(`${cart[i].product_name}: ${errorData.error || '販売に失敗しました'}`);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        alert(`${cart.length}件の商品を販売しました`);
        clearCart();
        onClose();
        // ページをリロードして在庫数を更新
        window.location.reload();
      }
    } catch (error) {
      console.error('商品販売エラー:', error);
      setError('販売に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ShoppingBagIcon className="h-6 w-6 mr-2" />
                カート ({cart.length}件)
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
                {error}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                カートが空です
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* 顧客とスタッフの選択 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                        顧客 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="customer_id"
                        required
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">選択してください</option>
                        {customers.map((customer) => (
                          <option key={customer.customer_id} value={customer.customer_id}>
                            {customer.real_name} {customer.email ? `(${customer.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
                        担当スタッフ
                      </label>
                      <select
                        id="staff_id"
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
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

                  {/* 販売日時 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                        販売日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="purchase_date"
                        required
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="purchase_time" className="block text-sm font-medium text-gray-700">
                        販売時間 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        id="purchase_time"
                        required
                        value={purchaseTime}
                        onChange={(e) => setPurchaseTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  {/* カート内商品一覧 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      商品一覧
                    </label>
                    <div className="border border-gray-300 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {cart.map((item) => {
                        const productData = products.find(p => p.product_id === item.product_id);
                        const totalPrice = item.quantity * item.unit_price;
                        
                        return (
                          <div key={item.product_id} className="p-4 bg-white">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">{item.product_name}</h4>
                                {item.product_category && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.product_category}
                                  </p>
                                )}
                                {productData && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    在庫: {productData.stock_quantity || 0}個
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product_id)}
                                className="ml-2 text-gray-400 hover:text-red-600"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  数量
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                                  className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  単価
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  value={item.unit_price}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    updatePrice(item.product_id, newPrice);
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
                          ¥{getTotalPrice().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 備考 */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      備考
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isSubmitting ? '販売中...' : '販売登録'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
