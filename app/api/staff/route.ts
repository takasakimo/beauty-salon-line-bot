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

    let queryText = 'SELECT staff_id, name, email, phone_number, working_hours, image_url, created_date FROM staff WHERE tenant_id = $1';
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
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

