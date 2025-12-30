import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// シフト一覧取得
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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const staffId = searchParams.get('staff_id');

    // staff_shiftsテーブルが存在するかチェックし、存在しない場合は作成
    try {
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'staff_shifts'
        )`
      );
      if (!tableCheck.rows[0].exists) {
        console.log('staff_shiftsテーブルが存在しないため、自動的に作成します');
        await query(`
          CREATE TABLE IF NOT EXISTS staff_shifts (
            shift_id SERIAL PRIMARY KEY,
            staff_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            shift_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            is_off BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, tenant_id, shift_date),
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
          )
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_date 
          ON staff_shifts(staff_id, shift_date)
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_date 
          ON staff_shifts(tenant_id, shift_date)
        `);
        console.log('✅ staff_shiftsテーブルを作成しました');
      }
    } catch (createError: any) {
      console.error('staff_shiftsテーブル作成エラー:', createError);
      // テーブル作成に失敗しても続行（既に存在する可能性がある）
    }

    let queryText = `
      SELECT 
        ss.shift_id,
        ss.staff_id,
        ss.shift_date,
        ss.start_time,
        ss.end_time,
        ss.is_off,
        s.name as staff_name
      FROM staff_shifts ss
      JOIN staff s ON ss.staff_id = s.staff_id
      WHERE ss.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (startDate) {
      queryText += ` AND ss.shift_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      queryText += ` AND ss.shift_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    if (staffId) {
      queryText += ` AND ss.staff_id = $${params.length + 1}`;
      params.push(parseInt(staffId));
    }

    queryText += ' ORDER BY ss.shift_date ASC, s.name ASC';

    const result = await query(queryText, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// シフト一括登録・更新
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
    const { shifts } = body; // shiftsは配列 [{staff_id, shift_date, start_time, end_time, is_off}, ...]

    if (!Array.isArray(shifts) || shifts.length === 0) {
      return NextResponse.json(
        { error: 'シフトデータが必要です' },
        { status: 400 }
      );
    }

    // staff_shiftsテーブルが存在するかチェックし、存在しない場合は作成
    try {
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'staff_shifts'
        )`
      );
      if (!tableCheck.rows[0].exists) {
        console.log('staff_shiftsテーブルが存在しないため、自動的に作成します');
        await query(`
          CREATE TABLE IF NOT EXISTS staff_shifts (
            shift_id SERIAL PRIMARY KEY,
            staff_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            shift_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            is_off BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, tenant_id, shift_date),
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
          )
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_date 
          ON staff_shifts(staff_id, shift_date)
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_date 
          ON staff_shifts(tenant_id, shift_date)
        `);
        console.log('✅ staff_shiftsテーブルを作成しました');
      }
    } catch (createError: any) {
      console.error('staff_shiftsテーブル作成エラー:', createError);
      // テーブル作成に失敗しても続行（既に存在する可能性がある）
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const shift of shifts) {
        const { staff_id, shift_date, start_time, end_time, is_off } = shift;

        // バリデーション
        if (!staff_id || !shift_date) {
          continue; // 必須項目がない場合はスキップ
        }

        // スタッフがこのテナントに属しているか確認
        const staffCheck = await client.query(
          'SELECT staff_id FROM staff WHERE staff_id = $1 AND tenant_id = $2',
          [staff_id, tenantId]
        );

        if (staffCheck.rows.length === 0) {
          continue; // スタッフが見つからない場合はスキップ
        }

        // シフトを登録または更新
        await client.query(
          `INSERT INTO staff_shifts (staff_id, tenant_id, shift_date, start_time, end_time, is_off, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (staff_id, tenant_id, shift_date)
           DO UPDATE SET
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             is_off = EXCLUDED.is_off,
             updated_at = CURRENT_TIMESTAMP`,
          [
            staff_id,
            tenantId,
            shift_date,
            is_off ? null : (start_time || null),
            is_off ? null : (end_time || null),
            is_off || false
          ]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true,
        message: 'シフトを保存しました'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error saving shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

