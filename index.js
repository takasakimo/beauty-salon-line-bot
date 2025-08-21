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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
      const reservationMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n予約機能はまだ準備中です。\nしばらくお待ちください。`
      };
      return client.replyMessage(event.replyToken, reservationMessage);

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
      const helpMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n以下のコマンドをお使いください：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認`
      };
      return client.replyMessage(event.replyToken, helpMessage);
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