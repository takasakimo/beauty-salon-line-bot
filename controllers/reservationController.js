const { dbClient } = require('../config/database');
const { client } = require('../config/line');
const flexMessage = require('../utils/flexMessage');

// メニュー表表示
const showMenuTable = async (event, customer) => {
  try {
    // メニュー一覧を取得
    const menuResult = await dbClient.query(
      'SELECT menu_id, name, price, duration FROM menus ORDER BY menu_id'
    );

    if (menuResult.rows.length === 0) {
      const noMenuMessage = {
        type: 'text',
        text: '申し訳ございません。現在利用可能なメニューがありません。'
      };
      return client.replyMessage(event.replyToken, noMenuMessage);
    }

    const message = flexMessage.createMenuTable(menuResult.rows);
    return client.replyMessage(event.replyToken, message);

  } catch (error) {
    console.error('メニュー表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'メニュー情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// 時間選択画面表示
const showTimeSelection = async (event, customer, menuId) => {
  try {
    // メニュー情報を取得
    const menuResult = await dbClient.query(
      'SELECT * FROM menus WHERE menu_id = $1',
      [menuId]
    );

    if (menuResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: 'メニュー情報が見つかりません。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    const menu = menuResult.rows[0];
    const availableTimes = await getAvailableTimeSlots(menu.duration);

    if (availableTimes.length === 0) {
      const noTimeMessage = {
        type: 'text',
        text: `申し訳ございません。\n「${menu.name}」の空き時間が見つかりませんでした。\n\n別のメニューをお選びいただくか、お電話でお問い合わせください。`
      };
      return client.replyMessage(event.replyToken, noTimeMessage);
    }

    const message = flexMessage.createTimeSelection(menu, availableTimes);
    return client.replyMessage(event.replyToken, message);

  } catch (error) {
    console.error('時間選択表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// 確認画面表示
const showConfirmation = async (event, customer, menuId, datetime) => {
  try {
    // メニュー情報を取得
    const menuResult = await dbClient.query(
      'SELECT * FROM menus WHERE menu_id = $1',
      [menuId]
    );

    if (menuResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: 'メニュー情報が見つかりません。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    const menu = menuResult.rows[0];
    const message = flexMessage.createConfirmation(customer, menu, datetime);
    return client.replyMessage(event.replyToken, message);

  } catch (error) {
    console.error('確認画面表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// 予約確定処理
const confirmReservation = async (event, customer, menuId, datetime, staffId) => {
  try {
    // メニュー情報を取得
    const menuResult = await dbClient.query(
      'SELECT * FROM menus WHERE menu_id = $1',
      [menuId]
    );

    if (menuResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: 'メニュー情報が見つかりません。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    const menu = menuResult.rows[0];

    // 予約を保存
    const reservationResult = await dbClient.query(
      `INSERT INTO reservations (customer_id, staff_id, menu_id, reservation_date, status, created_at)
       VALUES ($1, $2, $3, $4, 'confirmed', NOW()) RETURNING reservation_id`,
      [customer.line_user_id, staffId, menuId, datetime]
    );

    const reservationId = reservationResult.rows[0].reservation_id;
    const reservationDate = new Date(datetime);
    const dateStr = `${reservationDate.getMonth() + 1}/${reservationDate.getDate()}(${['日','月','火','水','木','金','土'][reservationDate.getDay()]})`;
    const timeStr = `${reservationDate.getHours().toString().padStart(2, '0')}:${reservationDate.getMinutes().toString().padStart(2, '0')}`;

    const confirmationMessage = {
      type: 'text',
      text: `${customer.real_name}様\n\n✅ 予約が確定しました！\n\n【予約内容】\n予約番号：${reservationId}\n日時：${dateStr} ${timeStr}～\nメニュー：${menu.name}\n料金：¥${menu.price.toLocaleString()}\n所要時間：${menu.duration}分\n\n当日お待ちしております！\n\n※予約の変更・キャンセルは「予約確認」からお手続きください。`
    };

    return client.replyMessage(event.replyToken, confirmationMessage);

  } catch (error) {
    console.error('予約確定エラー:', error);
    const errorMessage = {
      type: 'text',
      text: '予約処理中にエラーが発生しました。お手数ですが、お電話でご連絡ください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// 予約一覧表示
const showReservations = async (event, customer) => {
  try {
    const reservationResult = await dbClient.query(
      `SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
       FROM reservations r
       JOIN menus m ON r.menu_id = m.menu_id
       JOIN staff s ON r.staff_id = s.staff_id
       WHERE r.customer_id = $1 AND r.status != 'cancelled'
       AND r.reservation_date >= NOW()
       ORDER BY r.reservation_date`,
      [customer.line_user_id]
    );

    if (reservationResult.rows.length === 0) {
      const noReservationMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n現在、予約はありません。\n「予約」と入力して新しい予約を取ってください。`
      };
      return client.replyMessage(event.replyToken, noReservationMessage);
    }

    let reservationText = `${customer.real_name}様の予約一覧\n\n`;
    reservationResult.rows.forEach((reservation, index) => {
      const date = new Date(reservation.reservation_date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['日','月','火','水','木','金','土'][date.getDay()]})`;
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      reservationText += `【予約${index + 1}】\n`;
      reservationText += `予約番号: ${reservation.reservation_id}\n`;
      reservationText += `日時: ${dateStr} ${timeStr}～\n`;
      reservationText += `メニュー: ${reservation.menu_name}\n`;
      reservationText += `担当: ${reservation.staff_name}\n`;
      reservationText += `料金: ¥${reservation.price.toLocaleString()}\n\n`;
    });

    const reservationMessage = {
      type: 'text',
      text: reservationText
    };
    return client.replyMessage(event.replyToken, reservationMessage);

  } catch (error) {
    console.error('予約確認エラー:', error);
    const errorMessage = {
      type: 'text',
      text: '予約情報の取得中にエラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// 空き時間取得関数
const getAvailableTimeSlots = async (duration) => {
  const slots = [];
  const now = new Date();
  
  // 明日から7日間
  for (let day = 1; day <= 7; day++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + day);
    
    // 10:00-19:00の営業時間で30分刻み
    for (let hour = 10; hour < 19; hour++) {
      for (let minute of [0, 30]) {
        const slotTime = new Date(checkDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // 終了時間が営業時間内かチェック
        const endTime = new Date(slotTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        if (endTime.getHours() < 19 || (endTime.getHours() === 19 && endTime.getMinutes() === 0)) {
          slots.push({
            datetime: slotTime.toISOString()
          });
        }
      }
    }
  }
  
  return slots;
};

module.exports = {
  showMenuTable,
  showTimeSelection,
  showConfirmation,
  confirmReservation,
  showReservations
};