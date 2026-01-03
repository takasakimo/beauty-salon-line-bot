import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 予約一覧取得（管理画面用）
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
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let queryText = `
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.status,
        r.price,
        r.notes,
        r.created_date,
        c.customer_id,
        c.real_name as customer_name,
        c.email as customer_email,
        c.phone_number as customer_phone,
        m.menu_id,
        m.name as menu_name,
        m.price as menu_price,
        m.duration as menu_duration,
        s.staff_id,
        s.name as staff_name,
        COALESCE(
          json_agg(
            json_build_object(
              'menu_id', rm_menu.menu_id,
              'menu_name', rm_menu.name,
              'price', rm.price,
              'duration', rm_menu.duration
            )
          ) FILTER (WHERE rm.reservation_menu_id IS NOT NULL),
          json_build_array(
            json_build_object(
              'menu_id', m.menu_id,
              'menu_name', m.name,
              'price', COALESCE(r.price, m.price),
              'duration', m.duration
            )
          )
        ) as menus
      FROM reservations r
      LEFT JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN menus m ON r.menu_id = m.menu_id
      LEFT JOIN staff s ON r.staff_id = s.staff_id
      LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
      LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id
      WHERE r.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    // 日付フィルタ
    if (date) {
      queryText += ` AND DATE(r.reservation_date) = $${params.length + 1}`;
      params.push(date);
    }

    // ステータスフィルタ
    if (status) {
      queryText += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    queryText += ' GROUP BY r.reservation_id, c.customer_id, c.real_name, c.email, c.phone_number, m.menu_id, m.name, m.price, m.duration, s.staff_id, s.name ORDER BY r.reservation_date ASC';

    const result = await query(queryText, params);

    // メニュー配列をパース
    const reservations = result.rows.map((row: any) => {
      // reservation_dateをJSTとして処理
      let reservationDate = row.reservation_date;
      
      if (reservationDate) {
        if (reservationDate instanceof Date) {
          // Dateオブジェクトの場合、UTC時刻として解釈してJSTに変換
          // PostgreSQLから返されるDateオブジェクトはUTC時刻として扱われる
          // データベースに保存されている時刻はJST時刻なので、UTCとして解釈された時刻をJSTに戻す
          const year = reservationDate.getUTCFullYear();
          const month = String(reservationDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(reservationDate.getUTCDate()).padStart(2, '0');
          const hours = String(reservationDate.getUTCHours()).padStart(2, '0');
          const minutes = String(reservationDate.getUTCMinutes()).padStart(2, '0');
          const seconds = String(reservationDate.getUTCSeconds()).padStart(2, '0');
          // JST時刻として文字列に変換（+09:00を付与）
          reservationDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
        } else if (typeof reservationDate === 'string') {
          // 文字列の場合
          if (!reservationDate.includes('+') && !reservationDate.includes('Z')) {
            // タイムゾーン情報がない場合は+09:00を付与
            reservationDate = reservationDate.replace(' ', 'T') + '+09:00';
          } else if (reservationDate.includes('Z') || reservationDate.endsWith('+00:00')) {
            // UTC時刻（Z付きまたは+00:00）の場合は、JSTに変換
            const dateObj = new Date(reservationDate);
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const hours = String(dateObj.getUTCHours()).padStart(2, '0');
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
            reservationDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
          }
        }
      }
      
      return {
        ...row,
        reservation_date: reservationDate,
        menus: typeof row.menus === 'string' ? JSON.parse(row.menus) : row.menus,
        total_price: Array.isArray(row.menus) ? row.menus.reduce((sum: number, m: any) => sum + (m.price || 0), 0) : (row.price || 0),
        total_duration: Array.isArray(row.menus) ? row.menus.reduce((sum: number, m: any) => sum + (m.duration || 0), 0) : (row.menu_duration || 0)
      };
    });

    return NextResponse.json(reservations);
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 予約追加（管理画面用）
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
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      menu_id,
      menu_ids,
      staff_id,
      reservation_date,
      status = 'confirmed',
      notes
    } = body;

    // menu_idsが配列の場合はそれを使用、そうでなければmenu_idを配列に変換
    const menuIds = menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0
      ? menu_ids
      : menu_id
        ? [menu_id]
        : [];

    // バリデーション
    if (menuIds.length === 0 || !reservation_date) {
      return NextResponse.json(
        { error: 'メニュー、予約日時は必須です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（複数メニュー対応）
    const menuResult = await query(
      `SELECT menu_id, price, duration FROM menus 
       WHERE menu_id = ANY($1::int[]) AND tenant_id = $2`,
      [menuIds, tenantId]
    );

    if (menuResult.rows.length !== menuIds.length) {
      return NextResponse.json(
        { error: '一部のメニューが見つかりません' },
        { status: 404 }
      );
    }

    // 合計金額と合計時間を計算
    const totalPrice = menuResult.rows.reduce((sum, row) => sum + row.price, 0);
    const totalDuration = menuResult.rows.reduce((sum, row) => sum + row.duration, 0);
    
    // 最初のメニューIDをmenu_idとして使用（後方互換性のため）
    const firstMenuId = menuIds[0];

    // 店舗情報を取得（最大同時予約数と営業時間、定休日設定）
    // カラムが存在するかチェック
    let selectColumns = 'max_concurrent_reservations, business_hours';
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('closed_days', 'temporary_closed_days')`
      );
      const columnNames = columnCheck.rows.map((row: any) => row.column_name);
      if (columnNames.includes('closed_days')) {
        selectColumns += ', closed_days';
      }
      if (columnNames.includes('temporary_closed_days')) {
        selectColumns += ', temporary_closed_days';
      }
    } catch (checkError: any) {
      console.error('カラムチェックエラー:', checkError);
    }
    
    const tenantResult = await query(
      `SELECT ${selectColumns} FROM tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;
    
    // 営業時間を取得
    let businessHours: any = {};
    try {
      if (tenantResult.rows[0]?.business_hours) {
        businessHours = typeof tenantResult.rows[0].business_hours === 'string'
          ? JSON.parse(tenantResult.rows[0].business_hours)
          : tenantResult.rows[0].business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }
    
    // 定休日（曜日ベース）を取得
    let closedDays: number[] = [];
    try {
      if (tenantResult.rows[0]?.closed_days) {
        closedDays = typeof tenantResult.rows[0].closed_days === 'string'
          ? JSON.parse(tenantResult.rows[0].closed_days)
          : tenantResult.rows[0].closed_days;
      }
    } catch (e) {
      console.error('closed_daysのパースエラー:', e);
    }
    
    // 臨時休業日を取得
    let temporaryClosedDays: string[] = [];
    try {
      if (tenantResult.rows[0]?.temporary_closed_days) {
        temporaryClosedDays = typeof tenantResult.rows[0].temporary_closed_days === 'string'
          ? JSON.parse(tenantResult.rows[0].temporary_closed_days)
          : tenantResult.rows[0].temporary_closed_days;
      }
    } catch (e) {
      console.error('temporary_closed_daysのパースエラー:', e);
    }

    // 予約日時を計算（合計時間を使用）
    // reservation_dateはJST（+09:00）形式で送られてくるので、タイムゾーン情報を除去してJST時刻として保存
    // 例：2025-12-29T10:00:00+09:00 → 2025-12-29 10:00:00 (JST時刻として保存)
    const dateStr = reservation_date.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, ''); // +09:00やZを除去
    // 文字列から直接時間を抽出（JSTとして扱う）
    const timeMatch = dateStr.match(/T(\d{2}):(\d{2})/);
    if (!timeMatch) {
      return NextResponse.json(
        { error: '予約日時の形式が正しくありません' },
        { status: 400 }
      );
    }
    const reservationStartHour = parseInt(timeMatch[1], 10);
    const reservationStartMinute = parseInt(timeMatch[2], 10);
    
    // 予約終了時間を計算（分単位）
    const reservationStartTimeInMinutes = reservationStartHour * 60 + reservationStartMinute;
    const reservationEndTimeInMinutes = reservationStartTimeInMinutes + totalDuration;
    const reservationEndHour = Math.floor(reservationEndTimeInMinutes / 60) % 24;
    const reservationEndMinute = reservationEndTimeInMinutes % 60;
    
    // 日付文字列から日付部分を取得（YYYY-MM-DD形式）
    const reservationDateStr = dateStr.split('T')[0];
    
    // 選択された日付の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    // 文字列から直接日付を解析（JSTとして扱う）
    const [year, month, day] = reservationDateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    
    // 臨時休業日のチェック
    if (Array.isArray(temporaryClosedDays) && temporaryClosedDays.includes(reservationDateStr)) {
      return NextResponse.json(
        { success: false, error: '選択された日付は臨時休業日のため、予約できません。別の日付を選択してください。' },
        { status: 400 }
      );
    }
    
    // 曜日ベースの定休日チェック
    if (Array.isArray(closedDays) && closedDays.includes(dayOfWeek)) {
      const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      return NextResponse.json(
        { success: false, error: `選択された日付は${dayNames[dayOfWeek]}（定休日）のため、予約できません。別の日付を選択してください。` },
        { status: 400 }
      );
    }
    
    // その曜日の営業時間を取得（デフォルト: 10:00-19:00）
    const dayBusinessHours = businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '19:00' };
    const closeTime = dayBusinessHours.close || '19:00';
    
    // 閉店時間を分単位に変換
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    // 閉店時間を超える場合はエラー
    if (reservationEndTimeInMinutes > closeTimeInMinutes) {
      return NextResponse.json(
        { error: `予約終了時間が閉店時間（${closeTime}）を超えています。作業時間を考慮して、${closeTime}より前に開始できる時間を選択してください。` },
        { status: 400 }
      );
    }
    
    // スタッフが指定されている場合、シフトを確認してから時間の重複チェック
    if (staff_id) {
      // まずシフトを確認
      try {
        const shiftResult = await query(
          `SELECT start_time, end_time, is_off 
           FROM staff_shifts 
           WHERE staff_id = $1 AND tenant_id = $2 AND shift_date = $3`,
          [staff_id, tenantId, reservationDateStr]
        );
        
        if (shiftResult.rows.length > 0) {
          const shift = shiftResult.rows[0];
          if (shift.is_off) {
            // 休みの場合は予約不可
            return NextResponse.json(
              { error: '選択された日付はスタッフの休み日のため、予約できません。別の日付を選択してください。' },
              { status: 400 }
            );
          } else if (shift.start_time && shift.end_time) {
            // シフトが設定されている場合は時間をチェック
            const shiftStartTime = shift.start_time.substring(0, 5);
            const shiftEndTime = shift.end_time.substring(0, 5);
            
            const [shiftStartHour, shiftStartMinute] = shiftStartTime.split(':').map(Number);
            const [shiftEndHour, shiftEndMinute] = shiftEndTime.split(':').map(Number);
            const shiftStartTimeInMinutes = shiftStartHour * 60 + shiftStartMinute;
            const shiftEndTimeInMinutes = shiftEndHour * 60 + shiftEndMinute;
            
            if (reservationStartTimeInMinutes < shiftStartTimeInMinutes) {
              return NextResponse.json(
                { error: `予約開始時間がスタッフのシフト開始時間（${shiftStartTime}）より早いため、予約できません。` },
                { status: 400 }
              );
            }
            
            if (reservationEndTimeInMinutes > shiftEndTimeInMinutes) {
              return NextResponse.json(
                { error: `予約終了時間がスタッフのシフト終了時間（${shiftEndTime}）を超えるため、予約できません。別の時間を選択してください。` },
                { status: 400 }
              );
            }
          }
        }
      } catch (error: any) {
        console.error('スタッフシフトチェックエラー:', error);
        // エラーが発生しても続行
      }
      
      // 同じスタッフの既存予約をチェック（複数メニュー対応）
      const dateStrForQuery = dateStr.replace('T', ' ');
      let conflictCheck;
      try {
        conflictCheck = await query(
          `SELECT 
            r.reservation_id, 
            r.reservation_date,
            COALESCE(
              (SELECT SUM(m2.duration) 
               FROM reservation_menus rm2
               JOIN menus m2 ON rm2.menu_id = m2.menu_id
               WHERE rm2.reservation_id = r.reservation_id),
              m.duration,
              60
            ) as duration
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           AND r.staff_id = $2
           AND r.status = 'confirmed'
           AND DATE(r.reservation_date) = DATE($3)`,
          [tenantId, staff_id, dateStrForQuery]
        );
      } catch (error: any) {
        // reservation_menusテーブルが存在しない場合はフォールバック
        if (error.message && error.message.includes('reservation_menus')) {
          conflictCheck = await query(
            `SELECT reservation_id, reservation_date, COALESCE(m.duration, 60) as duration
             FROM reservations r
             LEFT JOIN menus m ON r.menu_id = m.menu_id
             WHERE r.tenant_id = $1
             AND r.staff_id = $2
             AND r.status = 'confirmed'
             AND DATE(r.reservation_date) = DATE($3)`,
            [tenantId, staff_id, dateStrForQuery]
          );
        } else {
          throw error;
        }
      }

      for (const existingReservation of conflictCheck.rows) {
        // 既存予約の時間を文字列から直接抽出（JSTとして扱う）
        const existingReservationDateStr = existingReservation.reservation_date;
        const existingDuration = existingReservation.duration || 60;
        
        let existingHour: number;
        let existingMinute: number;
        
        if (typeof existingReservationDateStr === 'string') {
          const timeMatch = existingReservationDateStr.match(/(\d{2}):(\d{2}):/);
          if (timeMatch) {
            existingHour = parseInt(timeMatch[1], 10);
            existingMinute = parseInt(timeMatch[2], 10);
            // UTC時間（Z付き）の場合はJSTに変換（+9時間）
            if (existingReservationDateStr.includes('Z') || existingReservationDateStr.endsWith('+00:00')) {
              existingHour = (existingHour + 9) % 24;
            }
          } else {
            const dateObj = new Date(existingReservationDateStr);
            existingHour = (dateObj.getUTCHours() + 9) % 24;
            existingMinute = dateObj.getUTCMinutes();
          }
        } else {
          const dateObj = existingReservationDateStr instanceof Date ? existingReservationDateStr : new Date(existingReservationDateStr);
          existingHour = (dateObj.getUTCHours() + 9) % 24;
          existingMinute = dateObj.getUTCMinutes();
        }
        
        const existingStartTimeInMinutes = existingHour * 60 + existingMinute;
        const existingEndTimeInMinutes = existingStartTimeInMinutes + existingDuration;
        
        // 時間帯が重複しているかチェック
        if (reservationStartTimeInMinutes < existingEndTimeInMinutes && reservationEndTimeInMinutes > existingStartTimeInMinutes) {
          const existingTimeStr = `${existingHour.toString().padStart(2, '0')}:${existingMinute.toString().padStart(2, '0')}`;
          return NextResponse.json(
            { error: `この時間帯は既に予約が入っています。既存予約: ${existingTimeStr}` },
            { status: 400 }
          );
        }
      }
    } else {
      // スタッフが指定されていない場合：その時間帯に勤務しているスタッフがいるか、予約可能かをチェック
      try {
        // その日付に勤務しているスタッフを取得（シフトまたはデフォルト勤務時間）
        const workingStaffResult = await query(
          `SELECT 
            s.staff_id,
            COALESCE(ss.start_time, NULL) as shift_start_time,
            COALESCE(ss.end_time, NULL) as shift_end_time,
            COALESCE(ss.is_off, false) as is_off,
            s.working_hours
          FROM staff s
          LEFT JOIN staff_shifts ss ON s.staff_id = ss.staff_id 
            AND ss.tenant_id = $1 
            AND ss.shift_date = $2
          WHERE s.tenant_id = $1
          ORDER BY s.staff_id`,
          [tenantId, reservationDateStr]
        );
        
        console.log('スタッフ未指定時のバリデーション（管理画面）:', {
          reservationDateStr,
          reservationStartTimeInMinutes,
          reservationEndTimeInMinutes,
          totalStaff: workingStaffResult.rows.length,
          staffData: workingStaffResult.rows.map((r: any) => ({
            staff_id: r.staff_id,
            shift_start_time: r.shift_start_time,
            shift_end_time: r.shift_end_time,
            is_off: r.is_off,
            working_hours: r.working_hours
          }))
        });
        
        const availableStaff: Array<{ staff_id: number; start_time: number; end_time: number }> = [];
        
        for (const staffRow of workingStaffResult.rows) {
          let staffStartTime: string | null = null;
          let staffEndTime: string | null = null;
          
          // シフトが設定されている場合
          if (staffRow.shift_start_time && staffRow.shift_end_time && !staffRow.is_off) {
            staffStartTime = staffRow.shift_start_time.substring(0, 5);
            staffEndTime = staffRow.shift_end_time.substring(0, 5);
          } else if (!staffRow.is_off && staffRow.working_hours) {
            // シフトがなく、デフォルト勤務時間がある場合
            const match = staffRow.working_hours.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
              staffStartTime = match[1];
              staffEndTime = match[2];
            }
          }
          
          // 勤務時間が設定されている場合、その時間帯に勤務しているかチェック
          if (staffStartTime && staffEndTime) {
            const [startHour, startMinute] = staffStartTime.split(':').map(Number);
            const [endHour, endMinute] = staffEndTime.split(':').map(Number);
            const staffStartTimeInMinutes = startHour * 60 + startMinute;
            const staffEndTimeInMinutes = endHour * 60 + endMinute;
            
            // 予約時間が勤務時間内かチェック
            const isWithinWorkingHours = reservationStartTimeInMinutes >= staffStartTimeInMinutes && 
                reservationEndTimeInMinutes <= staffEndTimeInMinutes;
            
            console.log(`スタッフ${staffRow.staff_id}のチェック（管理画面）:`, {
              staffStartTime,
              staffEndTime,
              staffStartTimeInMinutes,
              staffEndTimeInMinutes,
              reservationStartTimeInMinutes,
              reservationEndTimeInMinutes,
              isWithinWorkingHours
            });
            
            if (isWithinWorkingHours) {
              availableStaff.push({
                staff_id: staffRow.staff_id,
                start_time: staffStartTimeInMinutes,
                end_time: staffEndTimeInMinutes
              });
            }
          } else {
            // 勤務時間が設定されていないスタッフも利用可能として扱う（後方互換性のため）
            console.log(`スタッフ${staffRow.staff_id}: 勤務時間が設定されていないため、利用可能として扱います（管理画面）`);
            availableStaff.push({
              staff_id: staffRow.staff_id,
              start_time: 0,
              end_time: 24 * 60
            });
          }
        }
        
        console.log('利用可能なスタッフ（管理画面）:', {
          availableStaffCount: availableStaff.length,
          availableStaffIds: availableStaff.map(s => s.staff_id)
        });
        
        // 勤務しているスタッフがいない場合は予約不可
        if (availableStaff.length === 0) {
          console.error('利用可能なスタッフがいません（管理画面）');
          return NextResponse.json(
            { error: 'この時間帯に勤務しているスタッフがいないため、予約できません。別の時間を選択してください。' },
            { status: 400 }
          );
        }
        
        // 各スタッフについて、その時間帯に予約が入っているかチェック
        const dateStrForQuery = dateStr.replace('T', ' ');
        const reservationCheckResult = await query(
          `SELECT 
            r.staff_id,
            r.reservation_date,
            COALESCE(
              (SELECT SUM(m2.duration) 
               FROM reservation_menus rm2
               JOIN menus m2 ON rm2.menu_id = m2.menu_id
               WHERE rm2.reservation_id = r.reservation_id),
              m.duration,
              60
            ) as duration
          FROM reservations r
          LEFT JOIN menus m ON r.menu_id = m.menu_id
          WHERE r.tenant_id = $1
          AND r.status = 'confirmed'
          AND DATE(r.reservation_date) = DATE($2)
          AND r.staff_id IS NOT NULL`,
          [tenantId, dateStrForQuery]
        );
        
        // 各スタッフの予約状況をチェック
        const staffAvailability: Record<number, boolean> = {};
        availableStaff.forEach(staff => {
          staffAvailability[staff.staff_id] = true; // 初期値は利用可能
        });
        
        reservationCheckResult.rows.forEach((row: any) => {
          if (!row.staff_id || !staffAvailability[row.staff_id]) return;
          
          // 予約時間を分単位に変換
          let reservationHour: number;
          let reservationMinute: number;
          
          if (typeof row.reservation_date === 'string') {
            const timeMatch = row.reservation_date.match(/(\d{2}):(\d{2}):/);
            if (timeMatch) {
              reservationHour = parseInt(timeMatch[1], 10);
              reservationMinute = parseInt(timeMatch[2], 10);
              if (row.reservation_date.includes('Z') || row.reservation_date.endsWith('+00:00')) {
                reservationHour = (reservationHour + 9) % 24;
              }
            } else {
              const dateObj = new Date(row.reservation_date);
              reservationHour = (dateObj.getUTCHours() + 9) % 24;
              reservationMinute = dateObj.getUTCMinutes();
            }
          } else {
            const dateObj = row.reservation_date instanceof Date ? row.reservation_date : new Date(row.reservation_date);
            reservationHour = (dateObj.getUTCHours() + 9) % 24;
            reservationMinute = dateObj.getUTCMinutes();
          }
          
          const existingStartTime = reservationHour * 60 + reservationMinute;
          const existingDuration = parseInt(row.duration) || 60;
          const existingEndTime = existingStartTime + existingDuration;
          
          // 時間帯が重複しているかチェック
          if (reservationStartTimeInMinutes < existingEndTime && reservationEndTimeInMinutes > existingStartTime) {
            staffAvailability[row.staff_id] = false; // このスタッフは予約で埋まっている
          }
        });
        
        // 利用可能なスタッフがいるかチェック
        const hasAvailableStaff = Object.values(staffAvailability).some(available => available);
        
        console.log('スタッフの予約状況（管理画面）:', {
          staffAvailability,
          hasAvailableStaff,
          reservationCheckCount: reservationCheckResult.rows.length
        });
        
        if (!hasAvailableStaff) {
          console.error('全てのスタッフが予約で埋まっています（管理画面）');
          return NextResponse.json(
            { error: 'この時間帯は全てのスタッフが予約で埋まっているため、予約できません。別の時間を選択してください。' },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('スタッフ未指定時のバリデーションエラー:', error);
        // エラーが発生した場合は警告を出して続行（既存の最大同時予約数チェックにフォールバック）
        console.warn('スタッフ未指定時のバリデーションに失敗しました。最大同時予約数のチェックにフォールバックします。');
      }
      
      // 最大同時予約数チェック（フォールバック）
      // スタッフ未指定の場合：最大同時予約数をチェック（複数メニュー対応）
      let concurrentCheck;
      try {
        concurrentCheck = await query(
          `SELECT 
            r.reservation_date,
            COALESCE(
              (SELECT SUM(rm_menu.duration) 
               FROM reservation_menus rm 
               JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id 
               WHERE rm.reservation_id = r.reservation_id),
              m.duration,
              60
            ) as duration
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id
           WHERE r.tenant_id = $1
           AND r.status = 'confirmed'
           AND DATE(r.reservation_date) = DATE($2)`,
          [tenantId, reservation_date]
        );
      } catch (error: any) {
        // reservation_menusテーブルが存在しない場合はフォールバック
        if (error.message && error.message.includes('reservation_menus')) {
          concurrentCheck = await query(
            `SELECT 
              r.reservation_date,
              COALESCE(m.duration, 60) as duration
             FROM reservations r
             LEFT JOIN menus m ON r.menu_id = m.menu_id
             WHERE r.tenant_id = $1
             AND r.status = 'confirmed'
             AND DATE(r.reservation_date) = DATE($2)`,
            [tenantId, reservation_date]
          );
        } else {
          throw error;
        }
      }

      // JavaScriptで時間帯の重複をチェック（JST時刻で比較、分単位）
      let concurrentCount = 0;
      concurrentCheck.rows.forEach((row: any) => {
        // 既存予約の時間を文字列から直接抽出（JSTとして扱う）
        const reservationDateStr = row.reservation_date;
        const existingDuration = parseInt(row.duration) || 60;
        
        let existingHour: number;
        let existingMinute: number;
        
        if (typeof reservationDateStr === 'string') {
          // 文字列から時間を直接抽出
          const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
          if (timeMatch) {
            existingHour = parseInt(timeMatch[1], 10);
            existingMinute = parseInt(timeMatch[2], 10);
            
            // UTC時間（Z付き）の場合はJSTに変換（+9時間）
            if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
              existingHour = (existingHour + 9) % 24;
            }
          } else {
            // フォールバック: Dateオブジェクトから取得
            const dateObj = new Date(reservationDateStr);
            // UTC時間として取得してJSTに変換
            existingHour = (dateObj.getUTCHours() + 9) % 24;
            existingMinute = dateObj.getUTCMinutes();
          }
        } else {
          // Dateオブジェクトの場合（PostgreSQLから返される場合）
          const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
          // UTC時間として取得してJSTに変換
          existingHour = (dateObj.getUTCHours() + 9) % 24;
          existingMinute = dateObj.getUTCMinutes();
        }
        
        const existingStartTimeInMinutes = existingHour * 60 + existingMinute;
        const existingEndTimeInMinutes = existingStartTimeInMinutes + existingDuration;
        
        // 時間帯が重複しているかチェック（分単位で比較）
        // reservationStartTimeInMinutesとreservationEndTimeInMinutesは既に計算済み（344行目と318行目）
        // 新しい予約の開始時間が既存予約の終了時間より前、かつ新しい予約の終了時間が既存予約の開始時間より後
        if (reservationStartTimeInMinutes < existingEndTimeInMinutes && reservationEndTimeInMinutes > existingStartTimeInMinutes) {
          concurrentCount++;
        }
      });

      if (concurrentCount >= maxConcurrent) {
        return NextResponse.json(
          { error: `この時間帯は既に${maxConcurrent}件の予約が入っています。別の時間を選択してください。` },
          { status: 400 }
        );
      }
    }

    // 顧客IDが指定されていない場合は、emailまたはphone_numberで顧客を検索、または新規作成
    let actualCustomerId = customer_id;
    
    if (!actualCustomerId) {
      // 顧客名が指定されている場合（飛び込み客対応）
      if (customer_name) {
        // emailまたはphone_numberで既存顧客を検索
        if (customer_email || customer_phone) {
          const customerQuery = customer_email
            ? 'SELECT customer_id FROM customers WHERE email = $1 AND tenant_id = $2'
            : 'SELECT customer_id FROM customers WHERE phone_number = $1 AND tenant_id = $2';
          const customerParams = customer_email ? [customer_email, tenantId] : [customer_phone, tenantId];
          const customerResult = await query(customerQuery, customerParams);
          
          if (customerResult.rows.length > 0) {
            actualCustomerId = customerResult.rows[0].customer_id;
          }
        }
        
        // 既存顧客が見つからない場合、またはemail/phoneがない場合は新規作成
        if (!actualCustomerId) {
          const insertCustomerQuery = `
            INSERT INTO customers (tenant_id, email, real_name, phone_number, registered_date) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING customer_id
          `;
          const newCustomerResult = await query(insertCustomerQuery, [
            tenantId, customer_email || null, customer_name, customer_phone || null
          ]);
          actualCustomerId = newCustomerResult.rows[0].customer_id;
        }
      }
    }

    if (!actualCustomerId) {
      return NextResponse.json(
        { error: '顧客名が必要です' },
        { status: 400 }
      );
    }

    // トランザクションで予約とメニューを登録
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 予約を作成（最初のメニューIDをmenu_idとして使用）
      // JST時刻をそのまま保存（YYYY-MM-DD HH:mm:ss形式）
      const dateStrForDb = dateStr.replace('T', ' '); // Tをスペースに変換
      const reservationResult = await client.query(
        `INSERT INTO reservations (
          tenant_id, 
          customer_id, 
          staff_id, 
          menu_id, 
          reservation_date, 
          status, 
          price,
          notes,
          created_date
        )
        VALUES ($1, $2, $3, $4, $5::timestamp, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          tenantId,
          actualCustomerId,
          staff_id || null,
          firstMenuId,
          dateStrForDb, // JST時刻（YYYY-MM-DD HH:mm:ss形式）
          status,
          totalPrice,
          notes || null
        ]
      );
      
      const reservation = reservationResult.rows[0];
      const reservationId = reservation.reservation_id;
      
      // 複数メニューをreservation_menusテーブルに登録
      if (menuIds.length > 0) {
        try {
          for (const menuId of menuIds) {
            const menu = menuResult.rows.find(m => m.menu_id === menuId);
            if (menu) {
              await client.query(
                `INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (reservation_id, menu_id) DO NOTHING`,
                [reservationId, menuId, tenantId, menu.price]
              );
            }
          }
        } catch (error: any) {
          // reservation_menusテーブルが存在しない場合はスキップ
          if (error.message && error.message.includes('reservation_menus')) {
            console.warn('reservation_menusテーブルが存在しません。単一メニューとして保存します。');
          } else {
            throw error;
          }
        }
      }
      
      await client.query('COMMIT');
      return NextResponse.json(reservation);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

