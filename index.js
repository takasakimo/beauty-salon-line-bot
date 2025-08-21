const express = require('express');
const line = require('@line/bot-sdk');
const { Client } = require('pg');
require('dotenv').config();

const app = express();

// LINE設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINEクライアント作成
const client = new line.Client(config);

// データベース接続設定
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// データベース接続
dbClient.connect()
  .then(() => console.log('データベースに接続しました'))
  .catch(err => console.error('データベース接続エラー:', err));

// Webhook処理
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベントハンドラー
async function handleEvent(event) {
  console.log('受信イベント:', event);

  // 友だち追加イベント（follow）の処理
  if (event.type === 'follow') {
    return handleFollowEvent(event);
  }

  // メッセージイベントの処理
  if (event.type === 'message' && event.message.type === 'text') {
    return handleTextMessage(event);
  }

  // Postbackイベントの処理
  if (event.type === 'postback') {
    return handlePostback(event);
  }

  return Promise.resolve(null);
}

// 友だち追加時の処理
async function handleFollowEvent(event) {
  const userId = event.source.userId;
  
  try {
    // 既に登録済みかチェック
    const existingCustomer = await dbClient.query(
      'SELECT * FROM customers WHERE line_user_id = $1',
      [userId]
    );

    if (existingCustomer.rows.length > 0) {
      // 既に登録済みの場合
      const welcomeBackMessage = {
        type: 'text',
        text: `お帰りなさい！${existingCustomer.rows[0].real_name || ''}様\n\n以下のコマンドをお使いいただけます：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認`
      };
      return client.replyMessage(event.replyToken, welcomeBackMessage);
    } else {
      // 新規登録の場合
      const welcomeMessage = {
        type: 'text',
        text: `はじめまして！美容室の予約システムへようこそ✨\n\n新規登録をさせていただきます。\n\nまず、お名前をフルネームで教えてください。\n（例：山田太郎）`
      };
      return client.replyMessage(event.replyToken, welcomeMessage);
    }
  } catch (error) {
    console.error('友だち追加処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'システムエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// テキストメッセージの処理
async function handleTextMessage(event) {
  const userId = event.source.userId;
  const messageText = event.message.text;

  try {
    // 顧客情報をチェック
    const customerResult = await dbClient.query(
      'SELECT * FROM customers WHERE line_user_id = $1',
      [userId]
    );

    // 未登録の場合は登録処理
    if (customerResult.rows.length === 0) {
      return await handleRegistration(event, userId, messageText);
    }

    // 登録済みの場合はコマンド処理
    return await handleCommand(event, customerResult.rows[0], messageText);

  } catch (error) {
    console.error('メッセージ処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'システムエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 新規登録処理
async function handleRegistration(event, userId, messageText) {
  try {
    // 一時登録データをチェック（名前が入力済みかどうか）
    const tempResult = await dbClient.query(
      'SELECT * FROM customers WHERE line_user_id = $1 AND phone_number IS NULL',
      [userId]
    );

    if (tempResult.rows.length === 0) {
      // 名前入力段階
      if (messageText.length < 2 || messageText.length > 20) {
        const errorMessage = {
          type: 'text',
          text: 'お名前は2文字以上20文字以内で入力してください。\n\n再度お名前をフルネームで教えてください。\n（例：山田太郎）'
        };
        return client.replyMessage(event.replyToken, errorMessage);
      }

      // 名前を一時保存
      await dbClient.query(
        'INSERT INTO customers (line_user_id, real_name, registered_date) VALUES ($1, $2, NOW())',
        [userId, messageText]
      );

      const phoneRequestMessage = {
        type: 'text',
        text: `${messageText}様、ありがとうございます！\n\n次に、電話番号を教えてください。\n（例：090-1234-5678）\n\nハイフンありなしどちらでも大丈夫です。`
      };
      return client.replyMessage(event.replyToken, phoneRequestMessage);

    } else {
      // 電話番号入力段階
      const phonePattern = /^[0-9-]{10,13}$/;
      if (!phonePattern.test(messageText)) {
        const errorMessage = {
          type: 'text',
          text: '正しい電話番号を入力してください。\n（例：090-1234-5678 または 09012345678）\n\n再度電話番号を教えてください。'
        };
        return client.replyMessage(event.replyToken, errorMessage);
      }

      // 電話番号を更新して登録完了
      await dbClient.query(
        'UPDATE customers SET phone_number = $1 WHERE line_user_id = $2',
        [messageText, userId]
      );

      const completionMessage = {
        type: 'text',
        text: `${tempResult.rows[0].real_name}様、登録が完了しました！✨\n\n以下のコマンドをお使いいただけます：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認\n\nまずは「予約」と入力して予約を取ってみてください！`
      };
      return client.replyMessage(event.replyToken, completionMessage);
    }

  } catch (error) {
    console.error('登録処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: '登録処理中にエラーが発生しました。お手数ですが、最初からやり直してください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// コマンド処理（登録済み顧客向け）
async function handleCommand(event, customer, messageText) {
  const command = messageText.trim();

  switch (command) {
    case '予約':
      return await showMenuTable(event, customer);

    case '予約確認':
      return await showReservations(event, customer);

    case 'マイページ':
      const mypageMessage = {
        type: 'text',
        text: `${customer.real_name}様のマイページ\n\n【登録情報】\nお名前：${customer.real_name}\n電話番号：${customer.phone_number}\n登録日：${new Date(customer.registered_date).toLocaleDateString('ja-JP')}\n\n※情報の変更をご希望の場合はスタッフまでお声かけください。`
      };
      return client.replyMessage(event.replyToken, mypageMessage);

    case 'メニュー':
      return await showMenuList(event);

    default:
      // その他のメッセージ
      const helpMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n以下のコマンドをお使いください：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認`
      };
      return client.replyMessage(event.replyToken, helpMessage);
  }
}

// メニュー表形式で表示（ぺらいち）
async function showMenuTable(event, customer) {
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

    // Flex Messageでメニュー表を作成（1ページ）
    const flexMessage = {
      type: 'flex',
      altText: 'メニュー表',
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💇 メニュー表',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: 'ご希望のメニューをお選びください',
              size: 'sm',
              color: '#FFFFFF',
              align: 'center',
              margin: 'md'
            }
          ],
          backgroundColor: '#FF6B6B',
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            // メニューヘッダー
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'メニュー',
                  weight: 'bold',
                  size: 'sm',
                  color: '#666666',
                  flex: 3
                },
                {
                  type: 'text',
                  text: '料金',
                  weight: 'bold',
                  size: 'sm',
                  color: '#666666',
                  align: 'center',
                  flex: 2
                },
                {
                  type: 'text',
                  text: '時間',
                  weight: 'bold',
                  size: 'sm',
                  color: '#666666',
                  align: 'center',
                  flex: 1
                }
              ],
              backgroundColor: '#F0F0F0',
              paddingAll: '10px',
              margin: 'none'
            },
            {
              type: 'separator',
              margin: 'none'
            },
            // メニューリスト
            ...menuResult.rows.map((menu, index) => [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: menu.name,
                    size: 'sm',
                    wrap: true,
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: `¥${menu.price.toLocaleString()}`,
                    size: 'sm',
                    align: 'center',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `${menu.duration}分`,
                    size: 'sm',
                    align: 'center',
                    flex: 1
                  }
                ],
                paddingAll: '10px',
                action: {
                  type: 'postback',
                  data: `action=select_menu&menu_id=${menu.menu_id}`,
                  displayText: `${menu.name}を選択`
                },
                backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
              }
            ]).flat()
          ],
          paddingAll: '0px'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'メニューをタップして選択してください',
              size: 'xs',
              color: '#999999',
              align: 'center'
            }
          ],
          backgroundColor: '#F0F0F0',
          paddingAll: '10px'
        }
      }
    };

    return client.replyMessage(event.replyToken, flexMessage);

  } catch (error) {
    console.error('メニュー表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'メニュー情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// メニュー一覧表示（テキスト版）
async function showMenuList(event) {
  try {
    const menuResult = await dbClient.query(
      'SELECT name, price, duration FROM menus ORDER BY menu_id'
    );

    let menuText = '【メニュー一覧】\n\n';
    menuResult.rows.forEach(menu => {
      menuText += `◆ ${menu.name}\n`;
      menuText += `  ¥${menu.price.toLocaleString()} (${menu.duration}分)\n\n`;
    });

    const menuMessage = {
      type: 'text',
      text: menuText
    };
    return client.replyMessage(event.replyToken, menuMessage);

  } catch (error) {
    console.error('メニュー一覧取得エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'メニュー情報の取得中にエラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 予約確認
async function showReservations(event, customer) {
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
}

// Postbackイベント処理
async function handlePostback(event) {
  const userId = event.source.userId;
  const data = new URLSearchParams(event.postback.data);
  const action = data.get('action');

  try {
    // 顧客情報を取得
    const customerResult = await dbClient.query(
      'SELECT * FROM customers WHERE line_user_id = $1',
      [userId]
    );

    if (customerResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: '顧客情報が見つかりません。最初から登録をお願いします。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    const customer = customerResult.rows[0];

    switch (action) {
      case 'select_menu':
        const menuId = data.get('menu_id');
        return await showTimeSelection(event, customer, menuId);

      case 'select_time':
        const selectedMenuId = data.get('menu_id');
        const selectedDateTime = data.get('datetime');
        return await showConfirmation(event, customer, selectedMenuId, selectedDateTime);

      case 'confirm_reservation':
        const confirmMenuId = data.get('menu_id');
        const confirmDateTime = data.get('datetime');
        const staffId = data.get('staff_id') || 1;
        return await confirmReservation(event, customer, confirmMenuId, confirmDateTime, staffId);

      case 'cancel_reservation':
        const cancelMessage = {
          type: 'text',
          text: '予約をキャンセルしました。\n「予約」と入力して最初からやり直してください。'
        };
        return client.replyMessage(event.replyToken, cancelMessage);

      default:
        return Promise.resolve(null);
    }

  } catch (error) {
    console.error('Postback処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 時間選択画面
async function showTimeSelection(event, customer, menuId) {
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

    // 空き時間を取得
    const availableTimes = await getAvailableTimeSlots(menu.duration);

    if (availableTimes.length === 0) {
      const noTimeMessage = {
        type: 'text',
        text: `申し訳ございません。\n「${menu.name}」の空き時間が見つかりませんでした。\n\n別のメニューをお選びいただくか、お電話でお問い合わせください。`
      };
      return client.replyMessage(event.replyToken, noTimeMessage);
    }

    // Flex Messageで時間選択画面を作成
    const flexMessage = {
      type: 'flex',
      altText: '予約時間選択',
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📅 予約時間選択',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: menu.name,
              size: 'md',
              color: '#FFFFFF',
              align: 'center',
              margin: 'sm'
            },
            {
              type: 'text',
              text: `¥${menu.price.toLocaleString()} (${menu.duration}分)`,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#4ECDC4',
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '空き時間から選択してください',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            // 時間スロットをボタンで表示（最大20個）
            ...availableTimes.slice(0, 20).map(slot => {
              const date = new Date(slot.datetime);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['日','月','火','水','木','金','土'][date.getDay()]})`;
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              
              return {
                type: 'button',
                action: {
                  type: 'postback',
                  label: `${dateStr} ${timeStr}～`,
                  data: `action=select_time&menu_id=${menuId}&datetime=${slot.datetime}`,
                  displayText: `${dateStr} ${timeStr}を選択`
                },
                style: 'secondary',
                margin: 'sm',
                height: 'sm'
              };
            })
          ],
          paddingAll: '20px'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'message',
                label: '戻る',
                text: '予約'
              },
              style: 'link',
              height: 'sm'
            }
          ],
          paddingAll: '10px'
        }
      }
    };

    return client.replyMessage(event.replyToken, flexMessage);

  } catch (error) {
    console.error('時間選択表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 確認画面表示
async function showConfirmation(event, customer, menuId, datetime) {
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
    const reservationDate = new Date(datetime);
    const dateStr = `${reservationDate.getMonth() + 1}/${reservationDate.getDate()}(${['日','月','火','水','木','金','土'][reservationDate.getDay()]})`;
    const timeStr = `${reservationDate.getHours().toString().padStart(2, '0')}:${reservationDate.getMinutes().toString().padStart(2, '0')}`;

    // 終了時刻を計算
    const endTime = new Date(reservationDate);
    endTime.setMinutes(endTime.getMinutes() + menu.duration);
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    // Flex Messageで確認画面を作成
    const flexMessage = {
      type: 'flex',
      altText: '予約内容確認',
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✅ 予約内容確認',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#FF6B6B',
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '以下の内容で予約を確定します',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              align: 'center',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'お名前',
                  size: 'sm',
                  color: '#666666',
                  flex: 2
                },
                {
                  type: 'text',
                  text: customer.real_name,
                  size: 'sm',
                  flex: 3,
                  wrap: true
                }
              ],
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '日付',
                  size: 'sm',
                  color: '#666666',
                  flex: 2
                },
                {
                  type: 'text',
                  text: dateStr,
                  size: 'sm',
                  flex: 3
                }
              ],
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '時間',
                  size: 'sm',
                  color: '#666666',
                  flex: 2
                },
                {
                  type: 'text',
                  text: `${timeStr}～${endTimeStr}`,
                  size: 'sm',
                  flex: 3
                }
              ],
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'メニュー',
                  size: 'sm',
                  color: '#666666',
                  flex: 2
                },
                {
                  type: 'text',
                  text: menu.name,
                  size: 'sm',
                  flex: 3,
                  wrap: true
                }
              ],
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '料金',
                  size: 'sm',
                  color: '#666666',
                  flex: 2
                },
                {
                  type: 'text',
                  text: `¥${menu.price.toLocaleString()}`,
                  size: 'sm',
                  flex: 3,
                  weight: 'bold',
                  color: '#FF6B6B'
                }
              ],
              margin: 'md'
            },
            {
              type: 'separator',
              margin: 'lg'
            }
          ],
          paddingAll: '20px'
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: 'キャンセル',
                data: 'action=cancel_reservation'
              },
              style: 'secondary',
              flex: 1,
              height: 'sm'
            },
            {
              type: 'separator',
              margin: 'sm'
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '予約確定',
                data: `action=confirm_reservation&menu_id=${menuId}&datetime=${datetime}&staff_id=1`
              },
              style: 'primary',
              flex: 1,
              height: 'sm',
              color: '#FF6B6B'
            }
          ],
          spacing: 'sm',
          paddingAll: '10px'
        }
      }
    };

    return client.replyMessage(event.replyToken, flexMessage);

  } catch (error) {
    console.error('確認画面表示エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 空き時間取得関数
async function getAvailableTimeSlots(duration) {
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
}

// 予約確定処理
async function confirmReservation(event, customer, menuId, datetime, staffId) {
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
}

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('美容室LINE予約システムが稼働中です！');
});

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`サーバーがポート${port}で起動しました`);
});