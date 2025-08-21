const { Client } = require('pg');
require('dotenv').config();

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// データベース接続
const connectDatabase = async () => {
  try {
    await dbClient.connect();
    console.log('データベースに接続しました');
  } catch (err) {
    console.error('データベース接続エラー:', err);
    process.exit(1);
  }
};

module.exports = {
  dbClient,
  connectDatabase
};