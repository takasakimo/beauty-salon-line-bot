import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest, getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 予約作成
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'テナントが見つかりません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_id,
      email,
      phone_number,
      customer_name,
      menu_id,
      menu_ids,
      staff_id,
      reservation_date,
      status = 'confirmed'
    } = body;

    // menu_idsが配列の場合はそれを使用、そうでなければmenu_idを配列に変換
    const menuIds = menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0
      ? menu_ids
      : menu_id
        ? [menu_id]
        : [];

    if (menuIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メニューが選択されていません' },
        { status: 400 }
      );
    }

    // 顧客IDが指定されていない場合は、emailまたはphone_numberで顧客を検索
    let actualCustomerId = customer_id;
    
    if (!actualCustomerId) {
      if (email || phone_number) {
        const customerQuery = email
          ? 'SELECT customer_id FROM customers WHERE email = $1 AND tenant_id = $2'
          : 'SELECT customer_id FROM customers WHERE phone_number = $1 AND tenant_id = $2';
        const customerParams = email ? [email, tenantId] : [phone_number, tenantId];
        const customerResult = await query(customerQuery, customerParams);
        
        if (customerResult.rows.length > 0) {
          actualCustomerId = customerResult.rows[0].customer_id;
        } else if (customer_name) {
          // 顧客が存在しない場合は作成
          const insertCustomerQuery = `
            INSERT INTO customers (tenant_id, email, real_name, phone_number, registered_date) 
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING customer_id
          `;
          const newCustomerResult = await query(insertCustomerQuery, [
            tenantId, email || null, customer_name, phone_number || null
          ]);
          actualCustomerId = newCustomerResult.rows[0].customer_id;
        }
      }
    }

    if (!actualCustomerId) {
      return NextResponse.json(
        { success: false, error: '顧客情報が必要です' },
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
        { success: false, error: '一部のメニューが見つかりません' },
        { status: 404 }
      );
    }

    // 合計金額と合計時間を計算
    const totalPrice = menuResult.rows.reduce((sum, row) => sum + row.price, 0);
    const totalDuration = menuResult.rows.reduce((sum, row) => sum + row.duration, 0);

    // 店舗情報を取得（最大同時予約数と定休日設定）
    // カラムが存在するかチェック
    let selectColumns = 'max_concurrent_reservations';
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

    // 予約日時を計算
    const reservationDateTime = new Date(reservation_date);
    const reservationEndTime = new Date(reservationDateTime.getTime() + totalDuration * 60000);
    
    // 予約日付を取得（YYYY-MM-DD形式）
    const reservationDateStr = reservation_date.split('T')[0];
    
    // 予約日の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    const dayOfWeek = reservationDateTime.getDay();
    
    // 予約開始時間と終了時間を取得（分単位）
    // reservation_dateから直接時間を抽出（JSTとして扱う）
    let reservationStartHour: number;
    let reservationStartMinute: number;
    
    console.log('予約時間抽出デバッグ:', {
      reservation_date,
      reservation_date_type: typeof reservation_date,
      reservation_date_length: typeof reservation_date === 'string' ? reservation_date.length : 0
    });
    
    // 文字列から直接時間を抽出（YYYY-MM-DDTHH:mm:ss+09:00 または YYYY-MM-DDTHH:mm:ss形式）
    if (typeof reservation_date === 'string') {
      // まずTで分割して時間部分を取得
      const timePart = reservation_date.split('T')[1];
      if (timePart) {
        // HH:mm:ss または HH:mm:ss+09:00 から時間と分を抽出
        const timeMatch = timePart.match(/^(\d{2}):(\d{2})/);
        if (timeMatch) {
          reservationStartHour = parseInt(timeMatch[1], 10);
          reservationStartMinute = parseInt(timeMatch[2], 10);
          console.log('時間抽出成功:', { reservationStartHour, reservationStartMinute, timePart });
        } else {
          // フォールバック: Dateオブジェクトから取得
          reservationStartHour = reservationDateTime.getHours();
          reservationStartMinute = reservationDateTime.getMinutes();
          console.log('時間抽出失敗、フォールバック:', { reservationStartHour, reservationStartMinute });
        }
      } else {
        // Tがない場合（YYYY-MM-DD形式のみ）
        reservationStartHour = reservationDateTime.getHours();
        reservationStartMinute = reservationDateTime.getMinutes();
        console.log('Tがない形式、フォールバック:', { reservationStartHour, reservationStartMinute });
      }
    } else {
      reservationStartHour = reservationDateTime.getHours();
      reservationStartMinute = reservationDateTime.getMinutes();
      console.log('文字列ではない、フォールバック:', { reservationStartHour, reservationStartMinute });
    }
    
    const reservationStartTimeInMinutes = reservationStartHour * 60 + reservationStartMinute;
    const reservationEndTimeInMinutes = reservationStartTimeInMinutes + totalDuration;
    
    console.log('予約時間計算結果:', {
      reservationStartHour,
      reservationStartMinute,
      reservationStartTimeInMinutes,
      reservationEndTimeInMinutes,
      totalDuration
    });
    
    // スタッフが指定されている場合は、シフトを確認（優先）、なければデフォルトの勤務時間をチェック
    if (staff_id) {
      try {
        // まずシフトを確認（break_timesも取得）
        const shiftResult = await query(
          `SELECT start_time, end_time, is_off, COALESCE(break_times, '[]'::jsonb) as break_times
           FROM staff_shifts 
           WHERE staff_id = $1 AND tenant_id = $2 AND shift_date = $3`,
          [staff_id, tenantId, reservationDateStr]
        );
        
        let staffStartTime: string | null = null;
        let staffEndTime: string | null = null;
        let staffBreakTimes: Array<{ start: string; end: string }> = [];
        
        if (shiftResult.rows.length > 0) {
          const shift = shiftResult.rows[0];
          if (shift.is_off) {
            // 休みの場合は予約不可
            return NextResponse.json(
              { success: false, error: '選択された日付はスタッフの休み日のため、予約できません。別の日付を選択してください。' },
              { status: 400 }
            );
          } else if (shift.start_time && shift.end_time) {
            // シフトが設定されている場合はそれを使用
            staffStartTime = shift.start_time.substring(0, 5); // HH:MM形式に変換
            staffEndTime = shift.end_time.substring(0, 5);
            // 休憩時間を取得
            try {
              staffBreakTimes = typeof shift.break_times === 'string' 
                ? JSON.parse(shift.break_times) 
                : (shift.break_times || []);
            } catch (e) {
              console.error('休憩時間のパースエラー:', e);
              staffBreakTimes = [];
            }
          }
        } else {
          // シフトが設定されていない場合は、デフォルトの勤務時間を使用
          const staffResult = await query(
            'SELECT working_hours FROM staff WHERE staff_id = $1 AND tenant_id = $2',
            [staff_id, tenantId]
          );
          if (staffResult.rows.length > 0 && staffResult.rows[0].working_hours) {
            const workingHoursStr = staffResult.rows[0].working_hours;
            const match = workingHoursStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
              staffStartTime = match[1];
              staffEndTime = match[2];
            }
          }
        }
        
        // 勤務時間が設定されている場合はチェック
        if (staffStartTime && staffEndTime) {
          // 時間を分単位に変換
          const [startHour, startMinute] = staffStartTime.split(':').map(Number);
          const [endHour, endMinute] = staffEndTime.split(':').map(Number);
          const staffStartTimeInMinutes = startHour * 60 + startMinute;
          const staffEndTimeInMinutes = endHour * 60 + endMinute;
          
          // 予約開始時間が勤務時間内かチェック
          if (reservationStartTimeInMinutes < staffStartTimeInMinutes) {
            return NextResponse.json(
              { success: false, error: `予約開始時間がスタッフの勤務開始時間（${staffStartTime}）より早いため、予約できません。` },
              { status: 400 }
            );
          }
          
          // 予約終了時間が勤務時間を超えないかチェック
          if (reservationEndTimeInMinutes > staffEndTimeInMinutes) {
            return NextResponse.json(
              { success: false, error: `予約終了時間がスタッフの勤務終了時間（${staffEndTime}）を超えるため、予約できません。別の時間を選択してください。` },
              { status: 400 }
            );
          }
        }
        
        // 休憩時間と重複していないかチェック
        for (const breakTime of staffBreakTimes) {
          const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
          const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
          const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
          const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
          
          // 予約時間帯が休憩時間と重複しているかチェック
          if (reservationStartTimeInMinutes < breakEndTimeInMinutes && reservationEndTimeInMinutes > breakStartTimeInMinutes) {
            return NextResponse.json(
              { success: false, error: `この時間帯はスタッフの休憩時間（${breakTime.start}～${breakTime.end}）と重複しているため、予約できません。別の時間を選択してください。` },
              { status: 400 }
            );
          }
        }
        
        // 同じスタッフの既存予約との重複チェック（複数メニュー対応）
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
            [tenantId, staff_id, reservation_date]
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
              [tenantId, staff_id, reservation_date]
            );
          } else {
            throw error;
          }
        }

        // 既存予約との重複をチェック
        for (const existingReservation of conflictCheck.rows) {
          const reservationDateStr = existingReservation.reservation_date;
          const existingDuration = parseInt(existingReservation.duration) || 60;
          
          // 既存予約の時間を分単位に変換
          let existingHour: number;
          let existingMinute: number;
          
          if (typeof reservationDateStr === 'string') {
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
              // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
              // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
              // そのまま時刻を取得する
              existingHour = dateObj.getHours();
              existingMinute = dateObj.getMinutes();
            }
          } else {
            // Dateオブジェクトの場合（PostgreSQLから返される場合）
            const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
            // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
            // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
            // そのまま時刻を取得する
            existingHour = dateObj.getHours();
            existingMinute = dateObj.getMinutes();
          }
          
          const existingStartTimeInMinutes = existingHour * 60 + existingMinute;
          const existingEndTimeInMinutes = existingStartTimeInMinutes + existingDuration;
          
          // 時間帯が重複しているかチェック
          if (reservationStartTimeInMinutes < existingEndTimeInMinutes && reservationEndTimeInMinutes > existingStartTimeInMinutes) {
            const existingTimeStr = `${existingHour.toString().padStart(2, '0')}:${existingMinute.toString().padStart(2, '0')}`;
            return NextResponse.json(
              { success: false, error: `この時間帯は既に予約が入っています。既存予約: ${existingTimeStr}` },
              { status: 400 }
            );
          }
        }
      } catch (error: any) {
        console.error('スタッフシフト/勤務時間チェックエラー:', error);
        // エラーが発生しても続行（店舗の営業時間チェックにフォールバック）
      }
    } else {
      // スタッフが指定されていない場合：その時間帯に勤務しているスタッフがいるか、予約可能かをチェック
      try {
        // その日付に勤務しているスタッフを取得（シフトまたはデフォルト勤務時間、休憩時間も取得）
        const workingStaffResult = await query(
          `SELECT 
            s.staff_id,
            COALESCE(ss.start_time, NULL) as shift_start_time,
            COALESCE(ss.end_time, NULL) as shift_end_time,
            COALESCE(ss.is_off, false) as is_off,
            COALESCE(ss.break_times, '[]'::jsonb) as break_times,
            s.working_hours
          FROM staff s
          LEFT JOIN staff_shifts ss ON s.staff_id = ss.staff_id 
            AND ss.tenant_id = $1 
            AND ss.shift_date = $2
          WHERE s.tenant_id = $1
          ORDER BY s.staff_id`,
          [tenantId, reservationDateStr]
        );
        
        console.log('スタッフ未指定時のバリデーション:', {
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
            
            console.log(`スタッフ${staffRow.staff_id}のチェック:`, {
              staffStartTime,
              staffEndTime,
              staffStartTimeInMinutes,
              staffEndTimeInMinutes,
              reservationStartTimeInMinutes,
              reservationEndTimeInMinutes,
              isWithinWorkingHours
            });
            
            if (isWithinWorkingHours) {
              // 休憩時間と重複していないかチェック
              let hasBreakConflict = false;
              try {
                const breakTimes = typeof staffRow.break_times === 'string' 
                  ? JSON.parse(staffRow.break_times) 
                  : (staffRow.break_times || []);
                
                for (const breakTime of breakTimes) {
                  const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
                  const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
                  const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
                  const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
                  
                  // 予約時間帯が休憩時間と重複しているかチェック
                  if (reservationStartTimeInMinutes < breakEndTimeInMinutes && reservationEndTimeInMinutes > breakStartTimeInMinutes) {
                    hasBreakConflict = true;
                    break;
                  }
                }
              } catch (e) {
                console.error('休憩時間のパースエラー:', e);
              }
              
              // 休憩時間と重複していない場合のみ利用可能なスタッフに追加
              if (!hasBreakConflict) {
                availableStaff.push({
                  staff_id: staffRow.staff_id,
                  start_time: staffStartTimeInMinutes,
                  end_time: staffEndTimeInMinutes
                });
              }
            }
          } else {
            // 勤務時間が設定されていないスタッフも利用可能として扱う（後方互換性のため）
            console.log(`スタッフ${staffRow.staff_id}: 勤務時間が設定されていないため、利用可能として扱います`);
            availableStaff.push({
              staff_id: staffRow.staff_id,
              start_time: 0,
              end_time: 24 * 60
            });
          }
        }
        
        console.log('利用可能なスタッフ:', {
          availableStaffCount: availableStaff.length,
          availableStaffIds: availableStaff.map(s => s.staff_id)
        });
        
        // 勤務しているスタッフがいない場合は予約不可
        if (availableStaff.length === 0) {
          console.error('利用可能なスタッフがいません');
          return NextResponse.json(
            { success: false, error: 'この時間帯に勤務しているスタッフがいないため、予約できません。別の時間を選択してください。' },
            { status: 400 }
          );
        }
        
        // 各スタッフについて、その時間帯に予約が入っているかチェック
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
          AND DATE(r.reservation_date) = $2
          AND r.staff_id IS NOT NULL`,
          [tenantId, reservationDateStr]
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
              // フォールバック: Dateオブジェクトから取得
              const dateObj = new Date(row.reservation_date);
              // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
              // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
              // そのまま時刻を取得する
              reservationHour = dateObj.getHours();
              reservationMinute = dateObj.getMinutes();
            }
          } else {
            // Dateオブジェクトの場合（PostgreSQLから返される場合）
            const dateObj = row.reservation_date instanceof Date ? row.reservation_date : new Date(row.reservation_date);
            // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
            // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
            // そのまま時刻を取得する
            reservationHour = dateObj.getHours();
            reservationMinute = dateObj.getMinutes();
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
        
        console.log('スタッフの予約状況:', {
          staffAvailability,
          hasAvailableStaff,
          reservationCheckCount: reservationCheckResult.rows.length
        });
        
        if (!hasAvailableStaff) {
          console.error('全てのスタッフが予約で埋まっています');
          return NextResponse.json(
            { success: false, error: 'この時間帯は全てのスタッフが予約で埋まっているため、予約できません。別の時間を選択してください。' },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('スタッフ未指定時のバリデーションエラー:', error);
        // エラーが発生した場合は警告を出して続行（既存の最大同時予約数チェックにフォールバック）
        console.warn('スタッフ未指定時のバリデーションに失敗しました。最大同時予約数のチェックにフォールバックします。');
      }
    }
    
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

    // 同じ時間帯の既存予約数をカウント（スタッフ未指定の予約も含む）
    // 複数メニュー対応のため、reservation_menusテーブルから合計時間を取得
    let concurrentCheck;
    try {
      concurrentCheck = await query(
        `SELECT 
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

    // JavaScriptで時間帯の重複をチェック（JST時刻で比較）
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
            // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
            // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
            // そのまま時刻を取得する
            existingHour = dateObj.getHours();
            existingMinute = dateObj.getMinutes();
          }
        } else {
          // Dateオブジェクトの場合（PostgreSQLから返される場合）
          const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
          // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
          // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
          // そのまま時刻を取得する
          existingHour = dateObj.getHours();
          existingMinute = dateObj.getMinutes();
        }
      
      const existingStartTimeInMinutes = existingHour * 60 + existingMinute;
      const existingEndTimeInMinutes = existingStartTimeInMinutes + existingDuration;
      
      // 時間帯が重複しているかチェック（分単位で比較）
      // 新しい予約の開始時間が既存予約の終了時間より前、かつ新しい予約の終了時間が既存予約の開始時間より後
      if (reservationStartTimeInMinutes < existingEndTimeInMinutes && reservationEndTimeInMinutes > existingStartTimeInMinutes) {
        concurrentCount++;
      }
    });

    if (concurrentCount >= maxConcurrent) {
      return NextResponse.json(
        { success: false, error: `この時間帯は既に${maxConcurrent}件の予約が入っています。別の時間を選択してください。` },
        { status: 400 }
      );
    }

    // トランザクション開始
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 予約日時をJST時刻として保存（タイムゾーン情報を削除してYYYY-MM-DD HH:mm:ss形式に変換）
      // reservation_dateがYYYY-MM-DDTHH:mm:ss+09:00形式の場合、+09:00を削除してTをスペースに変換
      let dateStrForDb: string;
      if (typeof reservation_date === 'string') {
        // タイムゾーン情報を削除（+09:00やZなどを削除）
        dateStrForDb = reservation_date.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '').replace('T', ' ');
        // YYYY-MM-DD HH:mm:ss形式に統一
        if (dateStrForDb.length === 10) {
          // 日付のみの場合は00:00:00を追加
          dateStrForDb += ' 00:00:00';
        } else if (!dateStrForDb.includes(' ')) {
          // Tが残っている場合はスペースに変換
          dateStrForDb = dateStrForDb.replace('T', ' ');
        }
      } else {
        // Dateオブジェクトの場合は文字列に変換
        const year = reservationDateTime.getFullYear();
        const month = String(reservationDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(reservationDateTime.getDate()).padStart(2, '0');
        const hours = String(reservationDateTime.getHours()).padStart(2, '0');
        const minutes = String(reservationDateTime.getMinutes()).padStart(2, '0');
        const seconds = String(reservationDateTime.getSeconds()).padStart(2, '0');
        dateStrForDb = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

      // 予約を作成（menu_idは最初のメニューを設定、後でreservation_menusに全メニューを保存）
      const insertQuery = `
        INSERT INTO reservations (tenant_id, customer_id, staff_id, menu_id, reservation_date, status, price, created_date)
        VALUES ($1, $2, $3, $4, $5::timestamp, $6, $7, NOW())
        RETURNING reservation_id
      `;
      const result = await client.query(insertQuery, [
        tenantId,
        actualCustomerId,
        staff_id || null,
        menuIds[0], // 最初のメニューIDを設定（後方互換性のため）
        dateStrForDb, // JST時刻（YYYY-MM-DD HH:mm:ss形式、タイムゾーン情報なし）
        status,
        totalPrice
      ]);

      const reservationId = result.rows[0].reservation_id;

      // reservation_menusテーブルに全メニューを保存
      try {
        for (const menuRow of menuResult.rows) {
          await client.query(
            `INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (reservation_id, menu_id) DO NOTHING`,
            [reservationId, menuRow.menu_id, tenantId, menuRow.price]
          );
        }
      } catch (menuError: any) {
        // reservation_menusテーブルが存在しない場合はスキップ（後方互換性）
        if (menuError.message && menuError.message.includes('reservation_menus')) {
          console.log('reservation_menusテーブルが存在しないため、メニュー関連の処理をスキップします');
        } else {
          throw menuError;
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { reservation_id: reservationId },
        message: '予約が完了しました'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('予約作成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '予約の作成に失敗しました',
        details: error.message
      },
      { status: 500 }
    );
  }
}

