'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/app/components/AdminNav';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

// モックデータ - 商品データを生成
const generateMockProducts = () => {
  const categories = [
    { category_id: 1, category_name: 'シャンプー', description: 'ヘアケア用品' },
    { category_id: 2, category_name: 'トリートメント', description: 'ヘアケア用品' },
    { category_id: 3, category_name: 'スタイリング剤', description: 'スタイリング用品' },
    { category_id: 4, category_name: 'カラー剤', description: 'ヘアカラー用品' },
    { category_id: 5, category_name: 'その他', description: 'その他の商品' }
  ];

  const products = [
    { product_id: 1, product_name: 'モイストシャンプー', product_category: 'シャンプー', manufacturer: 'ビューティーコスメ', jan_code: '4901234567890', unit_price: 2500, stock_quantity: 15, description: 'うるおいを与えるシャンプー', is_active: true },
    { product_id: 2, product_name: 'リペアトリートメント', product_category: 'トリートメント', manufacturer: 'ビューティーコスメ', jan_code: '4901234567891', unit_price: 3000, stock_quantity: 12, description: 'ダメージを修復するトリートメント', is_active: true },
    { product_id: 3, product_name: 'スタイリングワックス', product_category: 'スタイリング剤', manufacturer: 'スタイルプロ', jan_code: '4901234567892', unit_price: 1800, stock_quantity: 20, description: '自然な仕上がりのワックス', is_active: true },
    { product_id: 4, product_name: 'ナチュラルカラー', product_category: 'カラー剤', manufacturer: 'カラー専門', jan_code: '4901234567893', unit_price: 4500, stock_quantity: 8, description: '自然な色合いのカラー剤', is_active: true },
    { product_id: 5, product_name: 'ボリュームシャンプー', product_category: 'シャンプー', manufacturer: 'ビューティーコスメ', jan_code: '4901234567894', unit_price: 2800, stock_quantity: 10, description: 'ボリュームアップ効果', is_active: true },
    { product_id: 6, product_name: 'ヘアオイル', product_category: 'その他', manufacturer: 'オイル専門', jan_code: '4901234567895', unit_price: 3500, stock_quantity: 5, description: '艶やかな仕上がり', is_active: true },
    { product_id: 7, product_name: 'スプレー', product_category: 'スタイリング剤', manufacturer: 'スタイルプロ', jan_code: '4901234567896', unit_price: 1200, stock_quantity: 25, description: '軽い仕上がりのスプレー', is_active: true },
    { product_id: 8, product_name: 'ブリーチ剤', product_category: 'カラー剤', manufacturer: 'カラー専門', jan_code: '4901234567897', unit_price: 5000, stock_quantity: 3, description: '明るくするブリーチ剤', is_active: true }
  ];

  return { categories, products };
};

const { categories, products } = generateMockProducts();

export default function DemoAdminProducts() {
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);

  // 商品をカテゴリごとにグループ化
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.product_category || 'カテゴリなし';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  // カテゴリをソート
  const sortedProductCategories = Object.keys(groupedProducts).sort((a, b) => {
    if (a.startsWith('その他')) return 1;
    if (b.startsWith('その他')) return -1;
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav currentPath="/demo/admin/products" title="商品管理（デモ）" />
      
      {/* デモバナー */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 mt-4 rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-800 font-semibold">デモモード</p>
            <p className="text-yellow-700 text-sm">この画面はデモ用です。実際のデータは表示されません。</p>
          </div>
          <Link
            href="/demo"
            className="text-yellow-800 hover:text-yellow-900 underline text-sm"
          >
            デモトップに戻る
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">商品管理（デモ）</h2>
            <div className="flex space-x-3">
              <button
                disabled
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                カテゴリ追加
              </button>
              <button
                disabled
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                商品を追加
              </button>
            </div>
          </div>

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
                          </div>
                          {category.description && (
                            <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            disabled
                            className="p-2 text-gray-300 cursor-not-allowed"
                            title="デモモードでは編集できません"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            disabled
                            className="p-2 text-gray-300 cursor-not-allowed"
                            title="デモモードでは削除できません"
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
                  <>
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
                                <div className="flex items-center space-x-2">
                                  <button
                                    disabled
                                    className="p-2 text-gray-300 cursor-not-allowed"
                                    title="デモモードでは販売できません"
                                  >
                                    <ShoppingBagIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    disabled
                                    className="p-2 text-gray-300 cursor-not-allowed"
                                    title="デモモードでは編集できません"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    disabled
                                    className="p-2 text-gray-300 cursor-not-allowed"
                                    title="デモモードでは削除できません"
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

