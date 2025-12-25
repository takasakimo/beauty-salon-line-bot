import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 商品一覧取得
export async function GET(request: NextRequest) {
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

    // 商品一覧を取得
    let queryText = `
      SELECT 
        product_id,
        product_name,
        product_category,
        manufacturer,
        jan_code,
        unit_price,
        stock_quantity,
        description,
        is_active,
        created_at,
        updated_at
      FROM products
      WHERE tenant_id = $1
      ORDER BY product_name ASC
    `;

    try {
      const result = await query(queryText, [tenantId]);
      return NextResponse.json(result.rows);
    } catch (error: any) {
      // productsテーブルが存在しない場合は空配列を返す
      if (error.message && error.message.includes('products')) {
        console.warn('productsテーブルが存在しません');
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 商品追加
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
      product_name,
      product_category,
      manufacturer,
      jan_code,
      unit_price,
      stock_quantity,
      description,
      is_active = true
    } = body;

    // バリデーション
    if (!product_name || !unit_price) {
      return NextResponse.json(
        { error: '商品名と単価は必須です' },
        { status: 400 }
      );
    }

    // 商品を追加
    try {
      const result = await query(
        `INSERT INTO products 
         (tenant_id, product_name, product_category, manufacturer, jan_code, unit_price, stock_quantity, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          tenantId,
          product_name,
          product_category || null,
          manufacturer || null,
          jan_code || null,
          parseInt(unit_price),
          parseInt(stock_quantity) || 0,
          description || null,
          is_active
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
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

