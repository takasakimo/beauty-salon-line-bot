import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron Jobsからのリクエストを検証
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // CRON_SECRETが設定されている場合は検証
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // CRON_SECRETが設定されていない場合は、VercelのCronヘッダーを確認
  const cronHeader = request.headers.get('x-vercel-cron');
  return cronHeader === '1';
}

export async function GET(request: NextRequest) {
  try {
    // Cronリクエストの検証
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('予約の自動完了処理を開始します...');

    // 現在時刻を取得（JST）
    // VercelのサーバーはUTCで動作するため、JSTに変換
    const nowUTC = new Date();
    // JST = UTC + 9時間
    const nowJST = new Date(nowUTC.getTime() + (9 * 60 * 60 * 1000));

    // 予約確定（confirmed）ステータスの予約を取得
    // 完了予定時間を計算するために、メニューの合計時間も取得
    const reservationsResult = await query(`
      SELECT 
        r.reservation_id,
        r.tenant_id,
        r.reservation_date,
        r.status,
        COALESCE(
          (SELECT SUM(m.duration) 
           FROM reservation_menus rm 
           JOIN menus m ON rm.menu_id = m.menu_id 
           WHERE rm.reservation_id = r.reservation_id),
          m.duration,
          60
        ) as total_duration
      FROM reservations r
      LEFT JOIN menus m ON r.menu_id = m.menu_id
      WHERE r.status = 'confirmed'
      ORDER BY r.reservation_date ASC
    `);

    if (reservationsResult.rows.length === 0) {
      console.log('自動完了対象の予約はありません');
      return NextResponse.json({ 
        success: true, 
        message: '自動完了対象の予約はありません',
        completed: 0
      });
    }

    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let completedCount = 0;
      const completedReservationIds: number[] = [];

      for (const reservation of reservationsResult.rows) {
        // reservation_dateをJST時刻として解釈
        let reservationDateStr = reservation.reservation_date;
        
        // Dateオブジェクトの場合は文字列に変換
        if (reservationDateStr instanceof Date) {
          // PostgreSQLから返されるDateオブジェクトはUTC時刻として扱われる
          // データベースに保存されている時刻はJST時刻なので、UTCとして解釈された時刻をJSTに戻す
          const year = reservationDateStr.getUTCFullYear();
          const month = String(reservationDateStr.getUTCMonth() + 1).padStart(2, '0');
          const day = String(reservationDateStr.getUTCDate()).padStart(2, '0');
          const hours = String(reservationDateStr.getUTCHours()).padStart(2, '0');
          const minutes = String(reservationDateStr.getUTCMinutes()).padStart(2, '0');
          const seconds = String(reservationDateStr.getUTCSeconds()).padStart(2, '0');
          reservationDateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } else if (typeof reservationDateStr === 'string') {
          // タイムゾーン情報があれば除去
          reservationDateStr = reservationDateStr.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
          // Tをスペースに変換
          reservationDateStr = reservationDateStr.replace('T', ' ');
        }

        // 予約開始時刻をDateオブジェクトに変換（JSTとして扱う）
        // reservationDateStrは "YYYY-MM-DD HH:mm:ss" 形式（JST時刻）
        const [datePart, timePart] = reservationDateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
        
        // JST時刻としてDateオブジェクトを作成
        // データベースに保存されている時刻はJST時刻なので、UTCとして解釈してからJSTに変換
        const reservationStartUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0));
        // JST時刻として扱う（UTC時刻をJSTとして解釈するため、UTC時刻から9時間引く）
        const reservationStart = new Date(reservationStartUTC.getTime() - (9 * 60 * 60 * 1000));
        
        // 完了予定時刻を計算（予約開始時刻 + 合計時間（分））
        const totalDuration = parseInt(reservation.total_duration) || 60;
        const completionTime = new Date(reservationStart.getTime() + totalDuration * 60 * 1000);
        
        // 現在時刻（JST）が完了予定時刻を過ぎているかチェック
        if (nowJST.getTime() >= completionTime.getTime()) {
          // ステータスを「completed」に更新
          await client.query(
            `UPDATE reservations 
             SET status = 'completed'
             WHERE reservation_id = $1 AND tenant_id = $2 AND status = 'confirmed'`,
            [reservation.reservation_id, reservation.tenant_id]
          );
          
          completedCount++;
          completedReservationIds.push(reservation.reservation_id);
          
          console.log(`予約ID ${reservation.reservation_id} を自動完了にしました（完了予定時刻: ${completionTime.toISOString()}）`);
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`予約の自動完了処理が完了しました。完了数: ${completedCount}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `${completedCount}件の予約を自動完了にしました`,
        completed: completedCount,
        reservation_ids: completedReservationIds
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('予約の自動完了処理エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
