const line = require('@line/bot-sdk');
require('dotenv').config();

// LINE設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINEクライアント作成
const client = new line.Client(config);

module.exports = {
  config,
  client,
  middleware: line.middleware(config)
};