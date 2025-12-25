import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 商品更新
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

    const productId = parseInt(params.id);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: '無効な商品IDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      product_name,
      product_category,
      unit_price,
      description,
      is_active
    } = body;

    // バリデーション
    if (!product_name || !unit_price) {
      return NextResponse.json(
        { error: '商品名と単価は必須です' },
        { status: 400 }
      );
    }

    // 商品が存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT product_id FROM products WHERE product_id = $1 AND tenant_id = $2',
      [productId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    // 商品を更新
    try {
      const result = await query(
        `UPDATE products 
         SET product_name = $1, 
             product_category = $2, 
             unit_price = $3, 
             description = $4, 
             is_active = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $6 AND tenant_id = $7
         RETURNING *`,
        [
          product_name,
          product_category || null,
          parseInt(unit_price),
          description || null,
          is_active !== undefined ? is_active : true,
          productId,
          tenantId
        ]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error.message && error.message.includes('products')) {
        return NextResponse.json(
          { error: '商品テーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 商品削除
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

    const productId = parseInt(params.id);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: '無効な商品IDです' },
        { status: 400 }
      );
    }

    // 商品が存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT product_id FROM products WHERE product_id = $1 AND tenant_id = $2',
      [productId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    // 商品を削除
    try {
      await query(
        'DELETE FROM products WHERE product_id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );

      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes('products')) {
        return NextResponse.json(
          { error: '商品テーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

