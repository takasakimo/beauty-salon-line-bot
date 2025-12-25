import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// カテゴリ一覧取得
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

    // カテゴリ一覧を取得
    let queryText = `
      SELECT 
        category_id,
        category_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM product_categories
      WHERE tenant_id = $1
      ORDER BY category_name ASC
    `;

    try {
      const result = await query(queryText, [tenantId]);
      return NextResponse.json(result.rows);
    } catch (error: any) {
      // product_categoriesテーブルが存在しない場合は空配列を返す
      if (error.message && error.message.includes('product_categories')) {
        console.warn('product_categoriesテーブルが存在しません');
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching product categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// カテゴリ追加
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
      category_name,
      description,
      is_active = true
    } = body;

    // バリデーション
    if (!category_name) {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です' },
        { status: 400 }
      );
    }

    // カテゴリを追加
    try {
      const result = await query(
        `INSERT INTO product_categories 
         (tenant_id, category_name, description, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          tenantId,
          category_name,
          description || null,
          is_active
        ]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error.message && error.message.includes('product_categories')) {
        return NextResponse.json(
          { error: 'カテゴリテーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      // 重複エラー
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このカテゴリ名は既に登録されています' },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating product category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

