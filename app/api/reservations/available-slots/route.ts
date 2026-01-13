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

    const date = request.nextUrl.searchParams.get('date');
    const menuIdParam = request.nextUrl.searchParams.get('menu_id');
    const staffIdParam = request.nextUrl.searchParams.get('staff_id');
    const staffId = staffIdParam ? parseInt(staffIdParam) : null;
    
    console.log('available-slots API呼び出し:', {
      date,
      menuIdParam,
      staffIdParam,
      staffId,
      staffIdType: typeof staffId
    });

    if (!date) {
      return NextResponse.json(
        { error: 'dateパラメータが必要です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（複数メニュー対応）
    let duration = 60; // デフォルト
    if (menuIdParam) {
      // カンマ区切りの場合は複数メニュー
      const menuIds = menuIdParam.includes(',') 
        ? menuIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : [parseInt(menuIdParam)];
      
      if (menuIds.length > 0) {
        try {
          const menuResult = await query(
            `SELECT SUM(duration) as total_duration FROM menus 
             WHERE menu_id = ANY($1::int[]) AND tenant_id = $2`,
            [menuIds, tenantId]
          );
          if (menuResult.rows.length > 0 && menuResult.rows[0].total_duration) {
            duration = parseInt(menuResult.rows[0].total_duration);
          }
        } catch (error: any) {
          // フォールバック: 最初のメニューのみ
          const menuResult = await query(
            'SELECT duration FROM menus WHERE menu_id = $1 AND tenant_id = $2',
            [menuIds[0], tenantId]
          );
          if (menuResult.rows.length > 0) {
            duration = menuResult.rows[0].duration;
          }
        }
      }
    }

    // 店舗情報を取得（最大同時予約数と営業時間）
    // カラムが存在するかチェック
    let selectColumns = 'max_concurrent_reservations, business_hours';
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('closed_days', 'temporary_closed_days', 'special_business_hours')`
      );
      const columnNames = columnCheck.rows.map((row: any) => row.column_name);
      if (columnNames.includes('closed_days')) {
        selectColumns += ', closed_days';
      }
      if (columnNames.includes('temporary_closed_days')) {
        selectColumns += ', temporary_closed_days';
      }
      if (columnNames.includes('special_business_hours')) {
        selectColumns += ', special_business_hours';
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
      const rawValue = tenantResult.rows[0]?.temporary_closed_days;
      // null、undefined、空文字列の場合は空配列を返す
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        temporaryClosedDays = [];
      } else if (typeof rawValue === 'string') {
        // 文字列の場合はパースを試みる
        const trimmed = rawValue.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === '[]' || trimmed === 'null' || trimmed === 'NULL') {
          temporaryClosedDays = [];
        } else {
          try {
            const parsed = JSON.parse(rawValue);
            temporaryClosedDays = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('temporary_closed_daysのJSONパースエラー:', parseError);
            temporaryClosedDays = [];
          }
        }
      } else if (Array.isArray(rawValue)) {
        temporaryClosedDays = rawValue;
      } else {
        temporaryClosedDays = [];
      }
      // 最終的に配列でない場合は空配列にする
      if (!Array.isArray(temporaryClosedDays)) {
        temporaryClosedDays = [];
      }
      console.log('臨時休業日の取得結果:', { 
        rawValue, 
        temporaryClosedDays, 
        length: temporaryClosedDays.length,
        type: typeof rawValue
      });
    } catch (e) {
      console.error('temporary_closed_daysのパースエラー:', e);
      temporaryClosedDays = [];
    }
    
    // 特別営業時間を取得
    let specialBusinessHours: Record<string, { open: string; close: string }> = {};
    try {
      if (tenantResult.rows[0]?.special_business_hours) {
        specialBusinessHours = typeof tenantResult.rows[0].special_business_hours === 'string'
          ? JSON.parse(tenantResult.rows[0].special_business_hours)
          : tenantResult.rows[0].special_business_hours;
      }
    } catch (e) {
      console.error('special_business_hoursのパースエラー:', e);
    }
    
    // 選択された日付の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    // 日付文字列を正しくパース（YYYY-MM-DD形式を想定）
    const dateObj = new Date(date + 'T00:00:00'); // タイムゾーン問題を回避
    const dayOfWeek = dateObj.getDay();
    
    // 臨時休業日の場合は空のスロットを返す
    // 日付のフォーマットを正規化して比較（YYYY-MM-DD形式に統一、時刻部分があれば除去）
    const normalizedDate = date.split('T')[0].split(' ')[0]; // 時刻部分や時刻情報があれば除去
    if (Array.isArray(temporaryClosedDays) && temporaryClosedDays.length > 0) {
      // 各日付を正規化して比較
      const normalizedClosedDays = temporaryClosedDays.map(d => {
        if (typeof d === 'string') {
          return d.split('T')[0].split(' ')[0]; // 時刻部分があれば除去
        }
        return String(d).split('T')[0].split(' ')[0];
      });
      
      if (normalizedClosedDays.includes(normalizedDate)) {
        console.log('臨時休業日のため空のスロットを返します:', { 
          date, 
          normalizedDate, 
          temporaryClosedDays,
          normalizedClosedDays 
        });
        return NextResponse.json([]);
      }
    }
    
    // 曜日ベースの定休日チェック（closed_daysに含まれている曜日の場合は空のスロットを返す）
    if (Array.isArray(closedDays) && closedDays.includes(dayOfWeek)) {
      return NextResponse.json([]);
    }
    
    // スタッフが指定されている場合は、シフトを確認（優先）、なければデフォルトの勤務時間を使用
    let staffWorkingHours: { start: string; end: string } | null = null;
    let isStaffOff = false;
    let staffBreakTimes: Array<{ start: string; end: string }> = []; // 休憩時間を保持
    // スタッフ未指定の場合に使用する全スタッフのシフト情報
    let allStaffShiftsInfo: Array<{
      staff_id: number;
      start_time: string;
      end_time: string;
      break_times: Array<{ start: string; end: string }>;
    }> = [];
    
    if (staffId) {
      console.log('スタッフ指定時の処理開始:', { staffId, date, tenantId });
      try {
        // まずシフトを確認（break_timesも取得）
        const shiftResult = await query(
          `SELECT start_time, end_time, is_off, COALESCE(break_times, '[]'::jsonb) as break_times
           FROM staff_shifts 
           WHERE staff_id = $1 AND tenant_id = $2 AND shift_date = $3`,
          [staffId, tenantId, date]
        );
        
        console.log('スタッフシフト取得結果:', {
          rowCount: shiftResult.rows.length,
          rows: shiftResult.rows.map((row: any) => ({
            startTime: row.start_time,
            endTime: row.end_time,
            isOff: row.is_off,
            breakTimes: row.break_times,
            breakTimesType: typeof row.break_times
          }))
        });
        
        if (shiftResult.rows.length > 0) {
          const shift = shiftResult.rows[0];
          if (shift.is_off) {
            // 休みの場合は空き時間を返さない
            isStaffOff = true;
            console.log('スタッフは休みです:', { staffId, date });
          } else if (shift.start_time && shift.end_time) {
            // シフトが設定されている場合はそれを使用
            staffWorkingHours = {
              start: shift.start_time.substring(0, 5), // HH:MM形式に変換
              end: shift.end_time.substring(0, 5)
            };
            // 休憩時間を取得
            try {
              console.log('休憩時間のパース前:', {
                rawBreakTimes: shift.break_times,
                type: typeof shift.break_times
              });
              staffBreakTimes = typeof shift.break_times === 'string' 
                ? JSON.parse(shift.break_times) 
                : (shift.break_times || []);
              console.log('スタッフの休憩時間を取得:', {
                staffId,
                date,
                breakTimes: staffBreakTimes,
                shiftStart: staffWorkingHours.start,
                shiftEnd: staffWorkingHours.end,
                isArray: Array.isArray(staffBreakTimes),
                length: Array.isArray(staffBreakTimes) ? staffBreakTimes.length : 0
              });
            } catch (e) {
              console.error('休憩時間のパースエラー:', e, {
                rawBreakTimes: shift.break_times
              });
              staffBreakTimes = [];
            }
          } else {
            console.log('シフトの開始時間または終了時間が設定されていません:', {
              startTime: shift.start_time,
              endTime: shift.end_time
            });
          }
        } else {
          console.log('シフトが設定されていません。デフォルトの勤務時間を使用します:', { staffId, date });
          // シフトが設定されていない場合は、デフォルトの勤務時間を使用
          const staffResult = await query(
            'SELECT working_hours FROM staff WHERE staff_id = $1 AND tenant_id = $2',
            [staffId, tenantId]
          );
          if (staffResult.rows.length > 0 && staffResult.rows[0].working_hours) {
            const workingHoursStr = staffResult.rows[0].working_hours;
            const match = workingHoursStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
              staffWorkingHours = { start: match[1], end: match[2] };
              console.log('デフォルトの勤務時間を使用:', staffWorkingHours);
            }
          }
        }
      } catch (error: any) {
        console.error('スタッフシフト/勤務時間取得エラー:', error);
        // エラーが発生しても続行（店舗の営業時間を使用）
      }
    } else {
      // スタッフが指定されていない場合：その日付に勤務している全スタッフのシフト終了時間と休憩時間を取得
      // 各スタッフの情報を保持（スロットフィルタリング時に使用）
      try {
        // LEFT JOINに変更して、シフトが設定されていないスタッフも含める
        const allStaffShiftsResult = await query(
          `SELECT 
            ss.start_time as shift_start_time,
            ss.end_time as shift_end_time,
            COALESCE(ss.is_off, false) as is_off,
            COALESCE(ss.break_times, '[]'::jsonb) as break_times,
            s.working_hours,
            s.staff_id
          FROM staff s
          LEFT JOIN staff_shifts ss ON s.staff_id = ss.staff_id 
            AND ss.tenant_id = $1 
            AND ss.shift_date = $2
          WHERE s.tenant_id = $1
          AND (ss.is_off = false OR ss.is_off IS NULL)
          AND (
            (ss.start_time IS NOT NULL AND ss.end_time IS NOT NULL)
            OR (ss.start_time IS NULL AND ss.end_time IS NULL AND s.working_hours IS NOT NULL)
          )`,
          [tenantId, date]
        );
        
        console.log('全スタッフのシフト取得結果:', {
          rowCount: allStaffShiftsResult.rows.length,
          rows: allStaffShiftsResult.rows.map((row: any) => ({
            staffId: row.staff_id,
            shiftStart: row.shift_start_time,
            shiftEnd: row.shift_end_time,
            isOff: row.is_off,
            breakTimes: row.break_times,
            workingHours: row.working_hours,
            breakTimesType: typeof row.break_times
          }))
        });
        
        // 各スタッフのシフト情報を保持
        for (const row of allStaffShiftsResult.rows) {
          // シフトが設定されていて、休みでない場合のみ処理
          if (row.is_off) {
            continue;
          }
          
          let startTime: string | null = null;
          let endTime: string | null = null;
          let breakTimes: Array<{ start: string; end: string }> = [];
          
          // シフトが設定されている場合はシフト時間を優先
          if (row.shift_start_time && row.shift_end_time) {
            startTime = row.shift_start_time.substring(0, 5);
            endTime = row.shift_end_time.substring(0, 5);
            
            // 休憩時間を取得
            try {
              if (row.break_times !== null && row.break_times !== undefined && row.break_times !== '') {
                if (typeof row.break_times === 'string') {
                  const trimmed = row.break_times.trim();
                  if (trimmed !== '' && trimmed !== 'null' && trimmed !== '[]' && trimmed !== 'NULL') {
                    breakTimes = JSON.parse(row.break_times);
                  }
                } else if (Array.isArray(row.break_times)) {
                  breakTimes = row.break_times;
                }
              }
            } catch (e) {
              console.error('休憩時間のパースエラー:', e, {
                rawBreakTimes: row.break_times,
                staffId: row.staff_id
              });
            }
          } else if (row.working_hours) {
            // シフトが設定されていない場合はデフォルトの勤務時間を使用
            const match = row.working_hours.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
              startTime = match[1];
              endTime = match[2];
            }
          }
          
          if (startTime && endTime) {
            allStaffShiftsInfo.push({
              staff_id: row.staff_id,
              start_time: startTime,
              end_time: endTime,
              break_times: breakTimes
            });
          }
        }
        
        console.log('全スタッフのシフト情報:', {
          staffCount: allStaffShiftsInfo.length,
          staffShifts: allStaffShiftsInfo.map(s => ({
            start: s.start_time,
            end: s.end_time,
            breakCount: s.break_times.length
          }))
        });
        
        // 最も早いシフト開始時間と最も遅いシフト終了時間を取得
        // シフトが設定されている場合はシフト時間を、設定されていない場合はデフォルトの勤務時間を使用
        let earliestStartTime: string | null = null;
        let latestEndTime: string | null = null;
        
        for (const row of allStaffShiftsResult.rows) {
          // シフトが休みの場合はスキップ
          if (row.is_off) {
            continue;
          }
          
          let startTime: string | null = null;
          let endTime: string | null = null;
          
          // シフトが設定されている場合はシフト時間を優先
          if (row.shift_start_time && row.shift_end_time) {
            startTime = row.shift_start_time.substring(0, 5);
            endTime = row.shift_end_time.substring(0, 5);
          } else if (row.working_hours) {
            // シフトが設定されていない場合はデフォルトの勤務時間を使用
            const match = row.working_hours.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
              startTime = match[1];
              endTime = match[2];
            }
          }
          
          if (startTime) {
            if (!earliestStartTime || startTime < earliestStartTime) {
              earliestStartTime = startTime;
            }
          }
          
          if (endTime) {
            if (!latestEndTime || endTime > latestEndTime) {
              latestEndTime = endTime;
            }
          }
        }
        
        // シフト時間を設定（スタッフがいる場合のみ）
        if (earliestStartTime && latestEndTime) {
          staffWorkingHours = {
            start: earliestStartTime,
            end: latestEndTime
          };
          console.log('スタッフ未指定時のシフト時間:', { 
            earliestStartTime, 
            latestEndTime, 
            staffCount: allStaffShiftsResult.rows.length 
          });
        } else {
          console.log('スタッフ未指定時: シフト時間が設定されませんでした（店舗の営業時間を使用）', {
            earliestStartTime,
            latestEndTime,
            staffCount: allStaffShiftsResult.rows.length
          });
        }
      } catch (error: any) {
        console.error('全スタッフシフト取得エラー:', error);
        // エラーが発生しても続行（店舗の営業時間を使用）
      }
    }
    
    // スタッフが休みの場合は空き時間を返さない
    if (isStaffOff) {
      return NextResponse.json([]);
    }
    
    // 特別営業時間が設定されている場合はそれを使用、そうでなければ曜日の営業時間を使用
    let dayBusinessHours: { open: string; close: string };
    if (specialBusinessHours[date]) {
      dayBusinessHours = specialBusinessHours[date];
    } else {
      // 曜日名のマッピング（0=日曜日、1=月曜日、...、6=土曜日）
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      dayBusinessHours = businessHours[dayNames[dayOfWeek]] || businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '19:00' };
    }
    
    // スタッフの勤務時間が設定されている場合はそれを使用、そうでなければ店舗の営業時間を使用
    const openTime = staffWorkingHours ? staffWorkingHours.start : (dayBusinessHours.open || '10:00');
    const closeTime = staffWorkingHours ? staffWorkingHours.end : (dayBusinessHours.close || '19:00');
    
    // 開店時間と閉店時間を分単位に変換
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    const openTimeInMinutes = openHour * 60 + openMinute;
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    console.log('スロット生成パラメータ:', {
      openTime,
      closeTime,
      openTimeInMinutes,
      closeTimeInMinutes,
      duration,
      staffWorkingHours,
      staffId
    });
    
    // 営業時間のスロットを生成（15分間隔）
    // メニューの所要時間を考慮して、シフト終了時間を超えないスロットのみを生成
    const slots: string[] = [];
    // 営業時間が有効な場合のみスロットを生成
    if (openTimeInMinutes < closeTimeInMinutes) {
      // メニュー所要時間を考慮した最大開始時間を計算
      // 予約開始時間 + 予約時間（duration）が勤務終了時間を超えないようにする
      // 例: 勤務終了が20:00（1200分）、予約時間が60分の場合、最大開始時間は19:00（1140分）
      const maxStartTimeInMinutes = closeTimeInMinutes - duration;
      
      console.log('スロット生成詳細:', {
        openTimeInMinutes,
        closeTimeInMinutes,
        duration,
        maxStartTimeInMinutes,
        maxStartTimeFormatted: `${Math.floor(maxStartTimeInMinutes / 60).toString().padStart(2, '0')}:${(maxStartTimeInMinutes % 60).toString().padStart(2, '0')}`,
        maxEndTimeFormatted: `${Math.floor(closeTimeInMinutes / 60).toString().padStart(2, '0')}:${(closeTimeInMinutes % 60).toString().padStart(2, '0')}`
      });
      
      // 最大開始時間を超えないスロットのみを生成（15分間隔）
      // 例: 20:00終了、60分予約の場合、19:00までのスロットのみ生成（19:00開始なら20:00終了）
      for (let time = openTimeInMinutes; time <= maxStartTimeInMinutes; time += 15) {
        const hour = Math.floor(time / 60);
        const minute = time % 60;
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotEndTime = time + duration;
        
        // 念のため、スロット終了時間が勤務終了時間を超えないことを確認
        if (slotEndTime <= closeTimeInMinutes) {
          slots.push(slotTime);
        }
      }
    } else {
      console.warn('営業時間が無効です:', { openTime, closeTime, openTimeInMinutes, closeTimeInMinutes });
    }
    
    console.log('生成されたスロット:', {
      slotCount: slots.length,
      slots: slots.slice(-10) // 最後の10個を表示
    });

    // 現在時刻を取得（JST時間を使用）
    const now = new Date();
    // JST時間を取得（UTC+9時間）
    const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(jstNow.getUTCDate()).padStart(2, '0')}`;
      
    // デバッグログ：当日判定の確認
    console.log('日付比較:', {
      requestedDate: date,
      today: today,
      isToday: date === today,
      utcNow: now.toISOString(),
      jstNow: jstNow.toISOString(),
      jstHour: jstNow.getUTCHours(),
      jstMinute: jstNow.getUTCMinutes()
    });
    
    // 予約済みスロットを取得（当日の時間計算の前に取得）
    // スタッフが指定されている場合は、そのスタッフの予約のみをチェック
    let queryText = '';
    let queryParams: any[] = [];
    
    if (staffId) {
      // スタッフ指定の場合：そのスタッフの予約と、メニューの所要時間を考慮（複数メニュー対応）
      queryText = `
        SELECT 
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
        WHERE DATE(r.reservation_date) = $1
        AND r.status = 'confirmed'
        AND r.tenant_id = $2
        AND r.staff_id = $3
      `;
      queryParams = [date, tenantId, staffId];
    } else {
      // スタッフ未指定の場合：全予約をチェック（メニューの所要時間も取得、複数メニュー対応）
      // staff_idも取得して、各スタッフの予約状況を個別にチェックできるようにする
      queryText = `
        SELECT 
          r.reservation_date,
          r.staff_id,
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
        WHERE DATE(r.reservation_date) = $1
        AND r.status = 'confirmed'
        AND r.tenant_id = $2
      `;
      queryParams = [date, tenantId];
    }

    const result = await query(queryText, queryParams);
    
    console.log('予約取得結果:', {
      date,
      rowCount: result.rows.length,
      rows: result.rows.map((row: any) => ({
        reservation_date: row.reservation_date,
        staff_id: row.staff_id,
        duration: row.duration,
        staffIdType: typeof row.staff_id
      }))
    });
    
    // 当日の場合、現在時刻と既存予約の終了時間を考慮して最小開始時間を計算
    let minStartTime = 0; // 最小開始時間（分単位）
    if (date === today) {
      // JST時間を取得（UTC+9時間）
      const currentHour = jstNow.getUTCHours();
      const currentMinute = jstNow.getUTCMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const bufferMinutes = 10; // バッファ時間（10分）
      minStartTime = currentTimeInMinutes + bufferMinutes;
      
      console.log('当日の時間計算:', {
        currentHour,
        currentMinute,
        currentTimeInMinutes,
        bufferMinutes,
        initialMinStartTime: minStartTime,
        initialMinStartTimeFormatted: `${Math.floor(minStartTime / 60).toString().padStart(2, '0')}:${(minStartTime % 60).toString().padStart(2, '0')}`
      });
      
      // 既存予約の終了時間も考慮（既存予約の終了時間の方が遅い場合はそれを使用）
      result.rows.forEach((row: any) => {
        const reservationDateStr = row.reservation_date;
        const reservationDuration = parseInt(row.duration) || 60;
        
        // 文字列から直接時間を抽出
        let reservationHour: number;
        let reservationMinute: number;
        
        if (typeof reservationDateStr === 'string') {
          const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
          if (timeMatch) {
            reservationHour = parseInt(timeMatch[1], 10);
            reservationMinute = parseInt(timeMatch[2], 10);
            
            // UTC時間（Z付き）の場合はJSTに変換（+9時間）
            if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
              reservationHour = (reservationHour + 9) % 24;
            }
          } else {
            const dateObj = new Date(reservationDateStr);
            // UTC時間として取得してJSTに変換
            reservationHour = (dateObj.getUTCHours() + 9) % 24;
            reservationMinute = dateObj.getUTCMinutes();
          }
        } else {
          // Dateオブジェクトの場合（PostgreSQLから返される場合）
          const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
          // UTC時間として取得してJSTに変換
          reservationHour = (dateObj.getUTCHours() + 9) % 24;
          reservationMinute = dateObj.getUTCMinutes();
        }
        
        const reservationStartTime = reservationHour * 60 + reservationMinute;
        const reservationEndTime = reservationStartTime + reservationDuration;
        
        // 既存予約の終了時間が現在時刻 + バッファより遅い場合は、それを使用
        if (reservationEndTime > minStartTime) {
          minStartTime = reservationEndTime;
        }
      });
      
      // 当日の場合、最小開始時間以降のスロットのみを対象にする
      const filteredSlots = slots.filter(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTimeInMinutes = hour * 60 + minute;
        return slotTimeInMinutes >= minStartTime;
      });
      
      console.log('当日のスロットフィルタリング:', {
        beforeFilterCount: slots.length,
        afterFilterCount: filteredSlots.length,
        minStartTime,
        minStartTimeFormatted: `${Math.floor(minStartTime / 60).toString().padStart(2, '0')}:${(minStartTime % 60).toString().padStart(2, '0')}`,
        filteredSlots: filteredSlots.slice(0, 10)
      });
      
      // スロットを更新
      slots.length = 0;
      slots.push(...filteredSlots);
    }
    
    let unavailableSlots: Set<string> = new Set();

    if (staffId) {
      // スタッフ指定の場合：既存予約の終了時間を考慮して、次の予約が取れる時間のみを表示
      // 既存予約と重複する時間帯は完全に除外
      const newUnavailableSlots: Set<string> = new Set();
      slots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = hour * 60 + minute;
        const slotEndTime = slotTime + duration;
        
        // このスロットから開始した場合、既存予約と重複するかチェック
        let hasConflict = false;
        result.rows.forEach((row: any) => {
          // データベースから取得した日時から直接時間を抽出（タイムゾーンの影響を回避）
          const reservationDateStr = row.reservation_date;
          const reservationDuration = parseInt(row.duration) || 60;
          
          // 文字列から直接時間を抽出（YYYY-MM-DD HH:mm:ss または YYYY-MM-DDTHH:mm:ss 形式）
          let reservationHour: number;
          let reservationMinute: number;
          
          if (typeof reservationDateStr === 'string') {
            // 文字列から時間を直接抽出
            // 例: "2025-12-29 10:00:00" または "2025-12-29T10:00:00" または "2025-12-29T01:00:00.000Z"
            const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
            if (timeMatch) {
              reservationHour = parseInt(timeMatch[1], 10);
              reservationMinute = parseInt(timeMatch[2], 10);
              
              // UTC時間（Z付き）の場合はJSTに変換（+9時間）
              if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
                reservationHour = (reservationHour + 9) % 24;
              }
            } else {
              // フォールバック: Dateオブジェクトから取得
              const dateObj = new Date(reservationDateStr);
              // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
              // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
              // そのまま時刻を取得する
              reservationHour = dateObj.getHours();
              reservationMinute = dateObj.getMinutes();
            }
          } else {
            // Dateオブジェクトの場合（PostgreSQLから返される場合）
            const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
            // PostgreSQLから返されるDateオブジェクトは、データベースの時刻をそのまま返す
            // データベースにはJST時刻（タイムゾーン情報なし）が保存されているので、
            // そのまま時刻を取得する
            reservationHour = dateObj.getHours();
            reservationMinute = dateObj.getMinutes();
          }
          
          const reservationStartTime = reservationHour * 60 + reservationMinute;
          const reservationEndTime = reservationStartTime + reservationDuration;
          
          // 時間帯が重複しているかチェック
          // 新しい予約の開始時間が既存予約の終了時間より前、かつ新しい予約の終了時間が既存予約の開始時間より後
          // つまり、slotTime < reservationEndTime && slotEndTime > reservationStartTime
          if (slotTime < reservationEndTime && slotEndTime > reservationStartTime) {
            hasConflict = true;
          }
        });
        
        if (hasConflict) {
          newUnavailableSlots.add(slot);
        }
      });
      
      unavailableSlots = newUnavailableSlots;
    } else {
      // スタッフ未指定の場合：各スタッフの予約状況を個別にチェック
      // 少なくとも1人のスタッフがその時間帯に予約が入っていない場合、予約可能とする
      slots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = hour * 60 + minute; // 分単位
        const slotEndTime = slotTime + duration;
        
        // 各スタッフについて、その時間帯に予約が入っているかチェック
        let hasAvailableStaff = false;
        
        console.log('スロットチェック開始:', {
          slot,
          slotTime,
          slotEndTime,
          staffCount: allStaffShiftsInfo.length,
          reservationCount: result.rows.length
        });
        
        for (const staffShift of allStaffShiftsInfo) {
          const [staffStartHour, staffStartMinute] = staffShift.start_time.split(':').map(Number);
          const [staffEndHour, staffEndMinute] = staffShift.end_time.split(':').map(Number);
          const staffStartTimeInMinutes = staffStartHour * 60 + staffStartMinute;
          const staffEndTimeInMinutes = staffEndHour * 60 + staffEndMinute;
          
          // このスタッフがスロット時間帯に稼働しているかチェック
          // スロット開始時間 >= スタッフ開始時間 && スロット終了時間 <= スタッフ終了時間
          const isWorkingDuringSlot = slotTime >= staffStartTimeInMinutes && slotEndTime <= staffEndTimeInMinutes;
          
          console.log('スタッフの稼働時間チェック:', {
            slot,
            staffId: staffShift.staff_id,
            staffStartTime: staffShift.start_time,
            staffEndTime: staffShift.end_time,
            staffStartTimeInMinutes,
            staffEndTimeInMinutes,
            slotTime,
            slotEndTime,
            isWorkingDuringSlot
          });
          
          if (isWorkingDuringSlot) {
            // このスタッフの休憩時間と重複していないかチェック
            let hasBreakConflict = false;
            for (const breakTime of staffShift.break_times) {
              const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
              const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
              const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
              const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
              
              // スロットの時間帯が休憩時間と重複しているかチェック
              const overlapsWithBreak = slotTime < breakEndTimeInMinutes && slotEndTime > breakStartTimeInMinutes;
              if (overlapsWithBreak) {
                hasBreakConflict = true;
                break;
              }
            }
            
            // 休憩時間と重複していない場合、このスタッフの予約状況をチェック
            if (!hasBreakConflict) {
              // このスタッフの予約をチェック
              let hasReservationConflict = false;
              
              console.log('スタッフの予約チェック開始:', {
                slot,
                staffId: staffShift.staff_id,
                totalReservations: result.rows.length
              });
              
              for (const row of result.rows) {
                // staff_idがNULLの予約も、このスタッフの予約として扱う
                // （staff_idがNULLの予約は、その時間帯に稼働している全スタッフの予約として扱う）
                const isNullStaffReservation = row.staff_id === null || row.staff_id === undefined;
                
                if (!isNullStaffReservation) {
                  // staff_idが指定されている予約の場合、このスタッフの予約のみをチェック
                  // staff_idの型が異なる可能性があるため、数値に変換して比較
                  const reservationStaffId = typeof row.staff_id === 'number' ? row.staff_id : parseInt(row.staff_id);
                  const currentStaffId = typeof staffShift.staff_id === 'number' ? staffShift.staff_id : parseInt(String(staffShift.staff_id));
                  
                  if (reservationStaffId !== currentStaffId) {
                    console.log('別のスタッフの予約をスキップ:', {
                      slot,
                      staffId: currentStaffId,
                      reservationStaffId: reservationStaffId,
                      staffIdType: typeof staffShift.staff_id,
                      reservationStaffIdType: typeof row.staff_id
                    });
                    continue;
                  }
                } else {
                  // staff_idがNULLの予約の場合、このスタッフがその時間帯に稼働しているかチェック
                  // 稼働していない場合は、このスタッフの予約として扱わない
                  const reservationDateStr = row.reservation_date;
                  const reservationDuration = parseInt(row.duration) || 60;
                  
                  let reservationHour: number;
                  let reservationMinute: number;
                  
                  if (typeof reservationDateStr === 'string') {
                    const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
                    if (timeMatch) {
                      reservationHour = parseInt(timeMatch[1], 10);
                      reservationMinute = parseInt(timeMatch[2], 10);
                      
                      if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
                        reservationHour = (reservationHour + 9) % 24;
                      }
                    } else {
                      const dateObj = new Date(reservationDateStr);
                      // UTC時間として取得してJSTに変換
                      reservationHour = (dateObj.getUTCHours() + 9) % 24;
                      reservationMinute = dateObj.getUTCMinutes();
                    }
                  } else {
                    // Dateオブジェクトの場合（PostgreSQLから返される場合）
                    const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
                    // UTC時間として取得してJSTに変換
                    reservationHour = (dateObj.getUTCHours() + 9) % 24;
                    reservationMinute = dateObj.getUTCMinutes();
                  }
                  
                  const reservationStartTime = reservationHour * 60 + reservationMinute;
                  const reservationEndTime = reservationStartTime + reservationDuration;
                  
                  // 予約時間帯がこのスタッフの稼働時間と重複しているかチェック
                  const reservationOverlapsWithStaffShift = reservationStartTime < staffEndTimeInMinutes && reservationEndTime > staffStartTimeInMinutes;
                  
                  if (!reservationOverlapsWithStaffShift) {
                    console.log('staff_idがNULLの予約がこのスタッフの稼働時間外のためスキップ:', {
                      slot,
                      staffId: staffShift.staff_id,
                      reservationDate: row.reservation_date,
                      reservationStartTime,
                      reservationEndTime,
                      staffStartTime: staffStartTimeInMinutes,
                      staffEndTime: staffEndTimeInMinutes
                    });
                    continue;
                  }
                  
                  console.log('staff_idがNULLの予約をこのスタッフの予約として扱います:', {
                    slot,
                    staffId: staffShift.staff_id,
                    reservationDate: row.reservation_date
                  });
                }
                
                console.log('このスタッフの予約をチェック:', {
                  slot,
                  staffId: staffShift.staff_id,
                  reservationDate: row.reservation_date,
                  reservationDuration: row.duration,
                  isNullStaffReservation
                });
                
                // 予約時間を取得
                const reservationDateStr = row.reservation_date;
                const reservationDuration = parseInt(row.duration) || 60;
                
                let reservationHour: number;
                let reservationMinute: number;
                
                if (typeof reservationDateStr === 'string') {
                  const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
                  if (timeMatch) {
                    reservationHour = parseInt(timeMatch[1], 10);
                    reservationMinute = parseInt(timeMatch[2], 10);
                    
                    if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
                      reservationHour = (reservationHour + 9) % 24;
                    }
                  } else {
                    const dateObj = new Date(reservationDateStr);
                    // UTC時間として取得してJSTに変換
                    reservationHour = (dateObj.getUTCHours() + 9) % 24;
                    reservationMinute = dateObj.getUTCMinutes();
                  }
                } else {
                  // Dateオブジェクトの場合（PostgreSQLから返される場合）
                  const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
                  // UTC時間として取得してJSTに変換
                  reservationHour = (dateObj.getUTCHours() + 9) % 24;
                  reservationMinute = dateObj.getUTCMinutes();
                }
                
                const reservationStartTime = reservationHour * 60 + reservationMinute;
                const reservationEndTime = reservationStartTime + reservationDuration;
                
                console.log('予約時間の比較:', {
                  slot,
                  slotTime,
                  slotEndTime,
                  reservationStartTime,
                  reservationEndTime,
                  reservationTime: `${reservationHour}:${reservationMinute}`,
                  reservationDuration
                });
                
                // 時間帯が重複しているかチェック
                const overlaps = slotTime < reservationEndTime && slotEndTime > reservationStartTime;
                if (overlaps) {
                  console.log('予約と重複しています:', {
                    slot,
                    staffId: staffShift.staff_id,
                    reservationStartTime,
                    reservationEndTime,
                    slotTime,
                    slotEndTime,
                    isNullStaffReservation
                  });
                  hasReservationConflict = true;
                  break;
                } else {
                  console.log('予約と重複していません:', {
                    slot,
                    staffId: staffShift.staff_id
                  });
                }
              }
              
              // このスタッフに予約が入っていない場合、利用可能
              if (!hasReservationConflict) {
                console.log('利用可能なスタッフが見つかりました:', {
                  slot,
                  staffId: staffShift.staff_id,
                  staffStart: staffShift.start_time,
                  staffEnd: staffShift.end_time
                });
                hasAvailableStaff = true;
                break; // 1人でも利用可能なスタッフがいればOK
              } else {
                console.log('スタッフに予約が入っています:', {
                  slot,
                  staffId: staffShift.staff_id
                });
              }
            }
          }
        }
        
        // 各スタッフの予約チェックで、staff_idがNULLの予約も各スタッフの予約として扱った
        // 利用可能なスタッフがいない場合、スロットを除外
        if (!hasAvailableStaff) {
          console.log('利用可能なスタッフがいないため、スロットを除外:', {
            slot,
            slotTime,
            slotEndTime
          });
          unavailableSlots.add(slot);
        } else {
          // 利用可能なスタッフがいる場合でも、最大同時予約数をチェック
          // staff_idがNULLの予約と、スタッフ指定の予約を合わせて、最大同時予約数を超えていないかチェック
          const reservationsWithoutStaff = result.rows.filter((row: any) => row.staff_id === null || row.staff_id === undefined);
          
          if (reservationsWithoutStaff.length > 0) {
            // staff_idがNULLの予約がこのスロット時間帯と重複しているかチェック
            let nullStaffReservationCount = 0;
            reservationsWithoutStaff.forEach((row: any) => {
              const reservationDateStr = row.reservation_date;
              const reservationDuration = parseInt(row.duration) || 60;
              
              let reservationHour: number;
              let reservationMinute: number;
              
              if (typeof reservationDateStr === 'string') {
                const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
                if (timeMatch) {
                  reservationHour = parseInt(timeMatch[1], 10);
                  reservationMinute = parseInt(timeMatch[2], 10);
                  
                  if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
                    reservationHour = (reservationHour + 9) % 24;
                  }
                } else {
                  const dateObj = new Date(reservationDateStr);
                  // UTC時間として取得してJSTに変換
                  reservationHour = (dateObj.getUTCHours() + 9) % 24;
                  reservationMinute = dateObj.getUTCMinutes();
                }
              } else {
                // Dateオブジェクトの場合（PostgreSQLから返される場合）
                const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
                // UTC時間として取得してJSTに変換
                reservationHour = (dateObj.getUTCHours() + 9) % 24;
                reservationMinute = dateObj.getUTCMinutes();
              }
              
              const reservationStartTime = reservationHour * 60 + reservationMinute;
              const reservationEndTime = reservationStartTime + reservationDuration;
              
              console.log('最大同時予約数チェック: staff_idがNULLの予約の時間:', {
                slot,
                reservationDateStr,
                reservationHour,
                reservationMinute,
                reservationStartTime,
                reservationEndTime,
                slotTime,
                slotEndTime,
                overlaps: slotTime < reservationEndTime && slotEndTime > reservationStartTime
              });
              
              // スロットの時間帯が重複しているかチェック
              if (slotTime < reservationEndTime && slotEndTime > reservationStartTime) {
                nullStaffReservationCount++;
              }
            });
            
            // このスロット時間帯に、スタッフ指定の予約もカウント
            let staffReservationCount = 0;
            result.rows.forEach((row: any) => {
              if (row.staff_id !== null && row.staff_id !== undefined) {
                const reservationDateStr = row.reservation_date;
                const reservationDuration = parseInt(row.duration) || 60;
                
                let reservationHour: number;
                let reservationMinute: number;
                
                if (typeof reservationDateStr === 'string') {
                  const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
                  if (timeMatch) {
                    reservationHour = parseInt(timeMatch[1], 10);
                    reservationMinute = parseInt(timeMatch[2], 10);
                    
                    if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
                      reservationHour = (reservationHour + 9) % 24;
                    }
                  } else {
                    const dateObj = new Date(reservationDateStr);
                    // UTC時間として取得してJSTに変換
                    reservationHour = (dateObj.getUTCHours() + 9) % 24;
                    reservationMinute = dateObj.getUTCMinutes();
                  }
                } else {
                  // Dateオブジェクトの場合（PostgreSQLから返される場合）
                  const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
                  // UTC時間として取得してJSTに変換
                  reservationHour = (dateObj.getUTCHours() + 9) % 24;
                  reservationMinute = dateObj.getUTCMinutes();
                }
                
                const reservationStartTime = reservationHour * 60 + reservationMinute;
                const reservationEndTime = reservationStartTime + reservationDuration;
                
                // スロットの時間帯が重複しているかチェック
                if (slotTime < reservationEndTime && slotEndTime > reservationStartTime) {
                  staffReservationCount++;
                }
              }
            });
            
            const totalReservationCount = nullStaffReservationCount + staffReservationCount;
            
            console.log('最大同時予約数チェック:', {
              slot,
              nullStaffReservationCount,
              staffReservationCount,
              totalReservationCount,
              maxConcurrent,
              willBeUnavailable: totalReservationCount >= maxConcurrent
            });
            
            // 最大同時予約数を超えている場合は予約不可
            if (totalReservationCount >= maxConcurrent) {
              unavailableSlots.add(slot);
            }
          }
        }
      });
    }

    // 空きスロットを返す（閉店時間と休憩時間を考慮）
    console.log('スロットフィルタリング前:', {
      totalSlots: slots.length,
      slotsSample: slots.slice(0, 10),
      staffBreakTimes,
      closeTimeInMinutes,
      duration,
      unavailableSlotsCount: unavailableSlots.size
    });
    
    const availableSlots = slots.filter(slot => {
      // 既に予約済みのスロットは除外
      if (unavailableSlots.has(slot)) {
        return false;
      }
      
      // 予約開始時間 + 作業時間が閉店時間を超えないかチェック
      const [hour, minute] = slot.split(':').map(Number);
      const slotTimeInMinutes = hour * 60 + minute;
      const slotEndTimeInMinutes = slotTimeInMinutes + duration;
      
      // 閉店時間を超える場合は除外
      if (slotEndTimeInMinutes > closeTimeInMinutes) {
        return false;
      }
      
      // スタッフが指定されている場合：そのスタッフの休憩時間をチェック
      if (staffId) {
        // 休憩時間と重複する場合は除外
        for (const breakTime of staffBreakTimes) {
          const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
          const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
          const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
          const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
          
          // スロットの時間帯が休憩時間と重複しているかチェック
          // スロット開始時間 < 休憩終了時間 && スロット終了時間 > 休憩開始時間
          // 注意: 休憩終了時刻ちょうど（例: 19:00）のスロットは予約可能とする
          const overlapsWithBreak = slotTimeInMinutes < breakEndTimeInMinutes && slotEndTimeInMinutes > breakStartTimeInMinutes;
          if (overlapsWithBreak) {
            console.log('スロットが休憩時間と重複（除外）:', {
              slot,
              slotTimeInMinutes,
              slotEndTimeInMinutes,
              breakTime: `${breakTime.start}-${breakTime.end}`,
              breakStartTimeInMinutes,
              breakEndTimeInMinutes
            });
            return false;
          }
        }
        return true;
      } else {
        // スタッフ未指定の場合：少なくとも1人のスタッフがその時間帯に稼働していて休憩時間外である必要がある
        let hasAvailableStaff = false;
        
        for (const staffShift of allStaffShiftsInfo) {
          const [staffStartHour, staffStartMinute] = staffShift.start_time.split(':').map(Number);
          const [staffEndHour, staffEndMinute] = staffShift.end_time.split(':').map(Number);
          const staffStartTimeInMinutes = staffStartHour * 60 + staffStartMinute;
          const staffEndTimeInMinutes = staffEndHour * 60 + staffEndMinute;
          
          // このスタッフがスロット時間帯に稼働しているかチェック
          // スロット開始時間 >= スタッフ開始時間 && スロット終了時間 <= スタッフ終了時間
          const isWorkingDuringSlot = slotTimeInMinutes >= staffStartTimeInMinutes && slotEndTimeInMinutes <= staffEndTimeInMinutes;
          
          if (isWorkingDuringSlot) {
            // このスタッフの休憩時間と重複していないかチェック
            let hasBreakConflict = false;
            for (const breakTime of staffShift.break_times) {
              const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
              const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
              const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
              const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
              
              // スロットの時間帯が休憩時間と重複しているかチェック
              const overlapsWithBreak = slotTimeInMinutes < breakEndTimeInMinutes && slotEndTimeInMinutes > breakStartTimeInMinutes;
              if (overlapsWithBreak) {
                hasBreakConflict = true;
                break;
              }
            }
            
            // 休憩時間と重複していない場合、このスタッフは利用可能
            if (!hasBreakConflict) {
              hasAvailableStaff = true;
              break; // 1人でも利用可能なスタッフがいればOK
            }
          }
        }
        
        if (!hasAvailableStaff) {
          console.log('スロットに利用可能なスタッフがいない（除外）:', {
            slot,
            slotTimeInMinutes,
            slotEndTimeInMinutes,
            staffCount: allStaffShiftsInfo.length
          });
          return false;
        }
        
        return true;
      }
    });
    
    console.log('スロットフィルタリング後:', {
      availableSlotsCount: availableSlots.length,
      availableSlotsSample: availableSlots.slice(0, 10)
    });
    
    // デバッグログ（問題特定のため本番環境でも出力）
    const existingReservationsDebug = result.rows.map((row: any) => {
      const reservationDateStr = row.reservation_date;
      const reservationDuration = parseInt(row.duration) || 60;
      
      // 文字列から直接時間を抽出
      let hour: number;
      let minute: number;
      
      if (typeof reservationDateStr === 'string') {
        const timeMatch = reservationDateStr.match(/(\d{2}):(\d{2}):/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
          
          // UTC時間（Z付き）の場合はJSTに変換（+9時間）
          if (reservationDateStr.includes('Z') || reservationDateStr.endsWith('+00:00')) {
            hour = (hour + 9) % 24;
          }
        } else {
          const dateObj = new Date(reservationDateStr);
          // UTC時間として取得してJSTに変換
          hour = (dateObj.getUTCHours() + 9) % 24;
          minute = dateObj.getUTCMinutes();
        }
      } else {
        // Dateオブジェクトの場合（PostgreSQLから返される場合）
        const dateObj = reservationDateStr instanceof Date ? reservationDateStr : new Date(reservationDateStr);
        // UTC時間として取得してJSTに変換
        hour = (dateObj.getUTCHours() + 9) % 24;
        minute = dateObj.getUTCMinutes();
      }
      
      // 数値として確実に扱う
      const durationNum = typeof reservationDuration === 'number' ? reservationDuration : parseInt(String(reservationDuration)) || 60;
      const endTimeInMinutes = hour * 60 + minute + durationNum;
      const endHour = Math.floor(endTimeInMinutes / 60);
      const endMinute = endTimeInMinutes % 60;
      
      return {
        reservation_date: reservationDateStr,
        parsed_hour: hour,
        parsed_minute: minute,
        duration: String(durationNum),
        start_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        end_time: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
      };
    });
    
    console.log('空き時間計算結果:', {
      date,
      duration,
      totalSlots: slots.length,
      unavailableCount: unavailableSlots.size,
      availableCount: availableSlots.length,
      isToday: date === today,
      minStartTime: date === today ? `${Math.floor(minStartTime / 60).toString().padStart(2, '0')}:${(minStartTime % 60).toString().padStart(2, '0')}` : null,
      openTime,
      closeTime,
      dayOfWeek,
      openTimeInMinutes,
      closeTimeInMinutes,
      businessHours: JSON.stringify(businessHours),
      dayBusinessHours: JSON.stringify(dayBusinessHours),
      slots: slots.slice(0, 10), // 最初の10個を表示
      availableSlots: availableSlots.slice(0, 10), // 最初の10個を表示
      existingReservations: result.rows.length,
      existingReservationsDebug: existingReservationsDebug
    });
    
    // スロットが空の場合の警告
    if (slots.length === 0) {
      console.warn('スロットが生成されませんでした:', {
        date,
        openTime,
        closeTime,
        openTimeInMinutes,
        closeTimeInMinutes,
        dayOfWeek,
        businessHours: JSON.stringify(businessHours)
      });
    }
    
    return NextResponse.json(availableSlots);
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

