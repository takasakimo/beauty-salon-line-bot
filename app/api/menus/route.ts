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
    const staffId = searchParams.get('staff_id');

    let queryText = `
      SELECT m.menu_id, m.name, m.price, m.duration, m.description,
             CASE 
               WHEN m.name LIKE '%カット%' AND m.name LIKE '%カラー%' THEN 'set'
               WHEN m.name LIKE '%カット%' AND m.name LIKE '%パーマ%' THEN 'set'
               WHEN m.name LIKE '%フルコース%' THEN 'special'
               WHEN m.name LIKE '%カット%' THEN 'cut'
               WHEN m.name LIKE '%カラー%' THEN 'color'
               WHEN m.name LIKE '%パーマ%' THEN 'perm'
               WHEN m.name LIKE '%トリートメント%' THEN 'treatment'
               WHEN m.name LIKE '%ヘッドスパ%' THEN 'spa'
               ELSE 'other'
             END as category
      FROM menus m
      WHERE m.tenant_id = $1 AND m.is_active = true
    `;
    const params: any[] = [tenantId];

    // スタッフが指定されている場合、対応可能メニューのみを取得
    if (staffId) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM staff_menus sm 
        WHERE sm.staff_id = $2 AND sm.menu_id = m.menu_id
      )`;
      params.push(parseInt(staffId));
    }

    queryText += ' ORDER BY m.menu_id';
    
    const result = await query(queryText, params);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

