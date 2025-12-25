import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// カテゴリ更新
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

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: '無効なカテゴリIDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      category_name,
      description,
      is_active
    } = body;

    // バリデーション
    if (!category_name) {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です' },
        { status: 400 }
      );
    }

    // カテゴリが存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT category_id FROM product_categories WHERE category_id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    // カテゴリを更新
    try {
      const result = await query(
        `UPDATE product_categories 
         SET category_name = $1, 
             description = $2, 
             is_active = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE category_id = $4 AND tenant_id = $5
         RETURNING *`,
        [
          category_name,
          description || null,
          is_active !== undefined ? is_active : true,
          categoryId,
          tenantId
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
    console.error('Error updating product category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// カテゴリ削除
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

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: '無効なカテゴリIDです' },
        { status: 400 }
      );
    }

    // カテゴリが存在し、該当店舗のものであることを確認
    const checkResult = await query(
      'SELECT category_id FROM product_categories WHERE category_id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    // カテゴリを削除
    try {
      await query(
        'DELETE FROM product_categories WHERE category_id = $1 AND tenant_id = $2',
        [categoryId, tenantId]
      );

      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes('product_categories')) {
        return NextResponse.json(
          { error: 'カテゴリテーブルが存在しません。マイグレーションを実行してください。' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting product category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

