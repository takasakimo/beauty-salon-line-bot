import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const menuId = searchParams.get('menu_id');

    // image_urlカラムが存在するかチェック
    let hasImageUrl = false;
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'staff' AND column_name = 'image_url'`
      );
      hasImageUrl = columnCheck.rows.length > 0;
    } catch (checkError: any) {
      console.error('カラムチェックエラー:', checkError);
      // エラーが発生しても続行（image_urlなしで処理）
    }

    // image_urlカラムが存在する場合は含める
    const selectColumns = hasImageUrl
      ? 'staff_id, name, email, phone_number, working_hours, image_url, created_date'
      : 'staff_id, name, email, phone_number, working_hours, created_date';

    let queryText = `SELECT ${selectColumns} FROM staff WHERE tenant_id = $1`;
    const params: any[] = [tenantId];

    // メニューIDが指定されている場合、対応可能なスタッフのみを取得
    if (menuId) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM staff_menus sm 
        WHERE sm.staff_id = staff.staff_id AND sm.menu_id = $2
      )`;
      params.push(parseInt(menuId));
    }

    queryText += ' ORDER BY staff_id';
    
    const result = await query(queryText, params);
    
    // image_urlが存在しない場合は、各レコードにnullを追加
    const rows = result.rows.map((row: any) => {
      if (!hasImageUrl) {
        row.image_url = null;
      }
      return row;
    });
    
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

