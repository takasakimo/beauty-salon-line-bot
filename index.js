const express = require('express');
const { middleware } = require('./config/line');
const { connectDatabase } = require('./config/database');
const lineController = require('./controllers/lineController');

const app = express();

// データベース接続
connectDatabase();

// Webhook処理
app.post('/webhook', middleware, (req, res) => {
  Promise
    .all(req.body.events.map(lineController.handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('美容室LINE予約システムが稼働中です！');
});

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`サーバーがポート${port}で起動しました`);
});