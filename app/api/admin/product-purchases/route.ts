import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 商品購入履歴の追加
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_id,
      product_name,
      product_category,
      quantity,
      unit_price,
      purchase_date,
      staff_id,
      notes
    } = body;

    // バリデーション
    if (!customer_id || !product_name || !quantity || !unit_price) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // 顧客が存在し、該当店舗の顧客であることを確認
    const customerCheck = await query(
      'SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2',
      [customer_id, tenantId]
    );

    if (customerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    const total_price = quantity * unit_price;
    const purchaseDate = purchase_date || new Date().toISOString();

    // 商品購入履歴を追加
    try {
      const result = await query(
        `INSERT INTO product_purchases 
         (tenant_id, customer_id, product_name, product_category, quantity, unit_price, total_price, purchase_date, staff_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          tenantId,
          customer_id,
          product_name,
          product_category || null,
          quantity,
          unit_price,
          total_price,
          purchaseDate,
          staff_id || null,
          notes || null
        ]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      // product_purchasesテーブルが存在しない場合
      if (error.message && error.message.includes('product_purchases')) {
        return NextResponse.json(
          { error: '商品購入履歴テーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating product purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

