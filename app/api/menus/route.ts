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

    const queryText = `
      SELECT menu_id, name, price, duration, description,
             CASE 
               WHEN name LIKE '%カット%' AND name LIKE '%カラー%' THEN 'set'
               WHEN name LIKE '%カット%' AND name LIKE '%パーマ%' THEN 'set'
               WHEN name LIKE '%フルコース%' THEN 'special'
               WHEN name LIKE '%カット%' THEN 'cut'
               WHEN name LIKE '%カラー%' THEN 'color'
               WHEN name LIKE '%パーマ%' THEN 'perm'
               WHEN name LIKE '%トリートメント%' THEN 'treatment'
               WHEN name LIKE '%ヘッドスパ%' THEN 'spa'
               ELSE 'other'
             END as category
      FROM menus 
      WHERE tenant_id = $1 
      ORDER BY menu_id
    `;
    const result = await query(queryText, [tenantId]);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

