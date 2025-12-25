import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約のコメント取得・更新
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

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: '無効な予約IDです' },
        { status: 400 }
      );
    }

    // 予約のコメントを取得
    const result = await query(
      `SELECT note1, note2, note3 
       FROM reservations 
       WHERE reservation_id = $1 AND tenant_id = $2`,
      [reservationId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      note1: result.rows[0].note1 || '',
      note2: result.rows[0].note2 || '',
      note3: result.rows[0].note3 || ''
    });
  } catch (error: any) {
    console.error('Error fetching reservation notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 予約のコメント更新
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

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: '無効な予約IDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { note1, note2, note3 } = body;

    // 予約が存在し、該当店舗の予約であることを確認
    const checkResult = await query(
      'SELECT reservation_id FROM reservations WHERE reservation_id = $1 AND tenant_id = $2',
      [reservationId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    // コメントを更新（note1, note2, note3カラムが存在しない場合はエラーになる可能性があるが、マイグレーション済みを前提とする）
    try {
      await query(
        `UPDATE reservations 
         SET note1 = $1, note2 = $2, note3 = $3 
         WHERE reservation_id = $4 AND tenant_id = $5`,
        [note1 || null, note2 || null, note3 || null, reservationId, tenantId]
      );
    } catch (error: any) {
      // カラムが存在しない場合はフォールバック（既存のnotesカラムを使用）
      if (error.message && error.message.includes('note1')) {
        console.warn('note1, note2, note3 columns not found, using notes column');
        const combinedNotes = [note1, note2, note3].filter(n => n).join('\n\n---\n\n');
        await query(
          `UPDATE reservations 
           SET notes = $1 
           WHERE reservation_id = $2 AND tenant_id = $3`,
          [combinedNotes || null, reservationId, tenantId]
        );
      } else {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating reservation notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

