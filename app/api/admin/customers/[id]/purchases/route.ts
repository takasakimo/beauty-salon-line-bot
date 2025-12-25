import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 顧客の商品購入履歴取得（管理画面用）
export async function GET(
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

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: '無効な顧客IDです' },
        { status: 400 }
      );
    }

    // 顧客が存在し、該当店舗の顧客であることを確認
    const customerCheck = await query(
      'SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (customerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    // 商品購入履歴を取得
    let queryText = `
      SELECT 
        p.purchase_id,
        p.product_name,
        p.product_category,
        p.quantity,
        p.unit_price,
        p.total_price,
        p.purchase_date,
        p.notes,
        s.staff_id,
        s.name as staff_name
      FROM product_purchases p
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE p.customer_id = $1 
      AND p.tenant_id = $2
      ORDER BY p.purchase_date DESC
    `;

    let result;
    try {
      result = await query(queryText, [customerId, tenantId]);
    } catch (error: any) {
      // product_purchasesテーブルが存在しない場合は空配列を返す
      if (error.message && error.message.includes('product_purchases')) {
        console.warn('product_purchasesテーブルが存在しません');
        return NextResponse.json([]);
      } else {
        throw error;
      }
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching customer purchases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

