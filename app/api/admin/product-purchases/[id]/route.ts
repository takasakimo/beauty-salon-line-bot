import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 商品購入履歴の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const purchaseId = parseInt(params.id);
    if (isNaN(purchaseId)) {
      return NextResponse.json(
        { error: '無効な購入IDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      product_name,
      product_category,
      quantity,
      unit_price,
      purchase_date,
      staff_id,
      notes
    } = body;

    // バリデーション
    if (!product_name || !quantity || !unit_price) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // 購入履歴が存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT purchase_id FROM product_purchases WHERE purchase_id = $1 AND tenant_id = $2',
      [purchaseId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: '購入履歴が見つかりません' },
        { status: 404 }
      );
    }

    const total_price = quantity * unit_price;

    // 商品購入履歴を更新
    try {
      const result = await query(
        `UPDATE product_purchases 
         SET product_name = $1, 
             product_category = $2, 
             quantity = $3, 
             unit_price = $4, 
             total_price = $5, 
             purchase_date = $6, 
             staff_id = $7, 
             notes = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE purchase_id = $9 AND tenant_id = $10
         RETURNING *`,
        [
          product_name,
          product_category || null,
          quantity,
          unit_price,
          total_price,
          purchase_date,
          staff_id || null,
          notes || null,
          purchaseId,
          tenantId
        ]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error.message && error.message.includes('product_purchases')) {
        return NextResponse.json(
          { error: '商品購入履歴テーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating product purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 商品購入履歴の削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const purchaseId = parseInt(params.id);
    if (isNaN(purchaseId)) {
      return NextResponse.json(
        { error: '無効な購入IDです' },
        { status: 400 }
      );
    }

    // 購入履歴が存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT purchase_id FROM product_purchases WHERE purchase_id = $1 AND tenant_id = $2',
      [purchaseId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: '購入履歴が見つかりません' },
        { status: 404 }
      );
    }

    // 商品購入履歴を削除
    try {
      await query(
        'DELETE FROM product_purchases WHERE purchase_id = $1 AND tenant_id = $2',
        [purchaseId, tenantId]
      );

      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes('product_purchases')) {
        return NextResponse.json(
          { error: '商品購入履歴テーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting product purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

