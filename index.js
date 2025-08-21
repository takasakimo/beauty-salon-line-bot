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

  // 既存のオウム返し機能（テスト用に残しておく）
  const echo = { type: 'text', text: `「${messageText}」というメッセージを受信しました` };
  return client.replyMessage(event.replyToken, echo);
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