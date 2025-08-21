const express = require('express');
const line = require('@line/bot-sdk');
const { Client }

// 時間選択処理
async function handleTimeSelection(event, customer, timeNumber) {
  try {
    // 簡易実装：最後に選択されたメニューを使用（実際はセッション管理が必要）
    // ここでは仮にカット（menu_id=1）として処理
    const selectedMenuId = 1; // 実際のプロダクトではセッション管理で取得
    
    // 選択されたメニュー情報を取得
    const menuResult = await dbClient.query(
      'SELECT * FROM menus WHERE menu_id = $1',
      [selectedMenuId]
    );
    
    if (menuResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: 'メニュー情報が見つかりません。「予約」と入力してやり直してください。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }
    
    const selectedMenu = menuResult.rows[0];
    
    // 空き時間を再取得して指定された番号の時間を取得
    const availableTimes = await getAvailableTimes(selectedMenu.duration);
    
    if (timeNumber > availableTimes.length) {
      const errorMessage = {
        type: 'text',
        text: '無効な時間番号です。\n「予約」と入力してやり直してください。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }
    
    const selectedTime = availableTimes[timeNumber - 1];
    const reservationDate = new Date(selectedTime.datetime);
    
    // 予約をデータベースに保存
    const reservationResult = await dbClient.query(
      `INSERT INTO reservations (customer_id, staff_id, menu_id, reservation_date, status, created_at)
       VALUES ($1, $2, $3, $4, 'confirmed', NOW()) RETURNING reservation_id`,
      [
        customer.line_user_id,
        1, // 仮のスタッフID（実際はスタッフ選択機能を追加）
        selectedMenu.menu_id,
        selectedTime.datetime
      ]
    );
    
    const reservationId = reservationResult.rows[0].reservation_id;
    
    // 予約確定メッセージを作成
    const dateStr = `${reservationDate.getMonth() + 1}/${reservationDate.getDate()}(${['日','月','火','水','木','金','土'][reservationDate.getDay()]})`;
    const timeStr = `${reservationDate.getHours().toString().padStart(2, '0')}:${reservationDate.getMinutes().toString().padStart(2, '0')}`;
    
    const confirmationMessage = {
      type: 'text',
      text: `${customer.real_name}様\n\n✅ 予約が確定しました！\n\n【予約内容】\n予約番号：${reservationId}\n日時：${dateStr} ${timeStr}～\nメニュー：${selectedMenu.name}\n料金：¥${selectedMenu.price.toLocaleString()}\n所要時間：${selectedMenu.duration}分\n\n当日お待ちしております！\n\n※予約の変更・キャンセルは「予約確認」からお手続きください。`
    };
    
    return client.replyMessage(event.replyToken, confirmationMessage);
    
  } catch (error) {
    console.error('時間選択エラー:', error);
    const errorMessage = {
      type: 'text',
      text: '予約処理中にエラーが発生しました。お手数ですが、お電話でご連絡ください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  } = require('pg');
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

        // Flex Messageでメニューカードを作成
        const flexMessage = {
          type: 'flex',
          altText: 'メニュー一覧',
          contents: {
            type: 'carousel',
            contents: menuResult.rows.map(menu => ({
              type: 'bubble',
              size: 'micro',
              header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: menu.name,
                    weight: 'bold',
                    size: 'sm',
                    color: '#333333'
                  }
                ],
                backgroundColor: '#F8F8F8',
                paddingTop: '19px',
                paddingBottom: '16px'
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: `¥${menu.price.toLocaleString()}`,
                        weight: 'bold',
                        size: 'xl',
                        color: '#E91E63'
                      },
                      {
                        type: 'text',
                        text: `${menu.duration}分`,
                        size: 'sm',
                        color: '#666666',
                        margin: 'md'
                      }
                    ]
                  }
                ],
                spacing: 'sm',
                paddingTop: '13px'
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    action: {
                      type: 'postback',
                      label: '空き時間を見る',
                      data: `menu_${menu.menu_id}`
                    },
                    color: '#4CAF50'
                  }
                ],
                spacing: 'sm',
                paddingTop: '13px'
              }
            }))
          }
        };

        return client.replyMessage(event.replyToken, flexMessage);

      } catch (error) {
        console.error('メニュー取得エラー:', error);
        const errorMessage = {
          type: 'text',
          text: 'メニュー情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
        };
        return client.replyMessage(event.replyToken, errorMessage);
      }

    case '予約確認':
      const checkMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n予約確認機能はまだ準備中です。\nしばらくお待ちください。`
      };
      return client.replyMessage(event.replyToken, checkMessage);

    case 'マイページ':
      const mypageMessage = {
        type: 'text',
        text: `${customer.real_name}様のマイページ\n\n【登録情報】\nお名前：${customer.real_name}\n電話番号：${customer.phone_number}\n登録日：${new Date(customer.registered_date).toLocaleDateString('ja-JP')}\n\n※情報の変更をご希望の場合はスタッフまでお声かけください。`
      };
      return client.replyMessage(event.replyToken, mypageMessage);

    case 'メニュー':
      const menuMessage = {
        type: 'text',
        text: 'メニュー機能はまだ準備中です。\nしばらくお待ちください。'
      };
      return client.replyMessage(event.replyToken, menuMessage);

    default:
      // 数字が入力された場合の処理を分岐
      const inputNumber = parseInt(messageText);
      if (!isNaN(inputNumber) && inputNumber >= 1) {
        
        // 最近のメニュー選択状態をチェック（簡易実装）
        // 実際のプロダクトでは、ユーザーの状態をDBで管理する
        if (inputNumber <= 8) {
          // メニュー番号として処理
          return await handleMenuSelection(event, customer, inputNumber);
        } else if (inputNumber <= 10) {
          // 時間選択として処理（空き時間は最大10件表示）
          return await handleTimeSelection(event, customer, inputNumber);
        } else {
          const invalidMessage = {
            type: 'text',
            text: '無効な番号です。\n「予約」と入力してやり直してください。'
          };
          return client.replyMessage(event.replyToken, invalidMessage);
        }
      }

      // その他のメッセージ
      const helpMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n以下のコマンドをお使いください：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認`
      };
      return client.replyMessage(event.replyToken, helpMessage);
  }
}

// メニュー選択処理
async function handleMenuSelection(event, customer, menuNumber) {
  try {
    // 選択されたメニューを取得
    const menuResult = await dbClient.query(
      'SELECT menu_id, name, price, duration FROM menus ORDER BY menu_id LIMIT 1 OFFSET $1',
      [menuNumber - 1]
    );

    if (menuResult.rows.length === 0) {
      const errorMessage = {
        type: 'text',
        text: '無効なメニュー番号です。\n「予約」と入力してメニューを再選択してください。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    const selectedMenu = menuResult.rows[0];
    
    // 空き時間検索（明日から7日間）
    const availableTimes = await getAvailableTimes(selectedMenu.duration);
    
    if (availableTimes.length === 0) {
      const noTimeMessage = {
        type: 'text',
        text: `申し訳ございません。\n「${selectedMenu.name}」の空き時間が見つかりませんでした。\n\n別のメニューをお選びいただくか、お電話でお問い合わせください。`
      };
      return client.replyMessage(event.replyToken, noTimeMessage);
    }

    // 空き時間を表示
    let timeText = `${customer.real_name}様\n\n【選択メニュー】\n${selectedMenu.name}\n¥${selectedMenu.price.toLocaleString()} (${selectedMenu.duration}分)\n\n【空き時間】\n`;
    
    availableTimes.forEach((time, index) => {
      const date = new Date(time.datetime);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['日','月','火','水','木','金','土'][date.getDay()]})`;
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      timeText += `${index + 1}. ${dateStr} ${timeStr}～\n`;
    });
    
    timeText += '\n予約したい時間の番号を入力してください（例：1）';

    const timeMessage = {
      type: 'text',
      text: timeText
    };
    return client.replyMessage(event.replyToken, timeMessage);

  } catch (error) {
    console.error('メニュー選択エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。「予約」と入力してやり直してください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// 空き時間検索関数
async function getAvailableTimes(duration) {
  const availableTimes = [];
  const now = new Date();
  
  // 明日から7日間をチェック
  for (let day = 1; day <= 7; day++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + day);
    
    // 営業時間：10:00-19:00（最終受付は所要時間を考慮）
    const startHour = 10;
    const endHour = 19;
    const lastAcceptableHour = endHour - Math.ceil(duration / 60);
    
    for (let hour = startHour; hour <= lastAcceptableHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30分刻み
        const slotTime = new Date(checkDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // 既存予約との重複チェック（簡易版）
        const isAvailable = await checkTimeSlotAvailable(slotTime, duration);
        
        if (isAvailable) {
          availableTimes.push({
            datetime: slotTime.toISOString(),
            display: `${slotTime.getMonth() + 1}/${slotTime.getDate()} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          });
        }
        
        // 最大10件まで表示
        if (availableTimes.length >= 10) {
          return availableTimes;
        }
      }
    }
  }
  
  return availableTimes;
}

// 時間枠の空き状況チェック
async function checkTimeSlotAvailable(startTime, duration) {
  try {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);
    
    // 既存予約との重複チェック
    const conflictResult = await dbClient.query(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE reservation_date < $1 AND (reservation_date + INTERVAL '1 minute' * 
       (SELECT duration FROM menus WHERE menu_id = reservations.menu_id)) > $2
       AND status != 'cancelled'`,
      [endTime.toISOString(), startTime.toISOString()]
    );
    
    return parseInt(conflictResult.rows[0].count) === 0;
  } catch (error) {
    console.error('空き時間チェックエラー:', error);
    return true; // エラー時は空きありとして扱う
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