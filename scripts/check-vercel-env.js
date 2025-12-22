// Vercel環境変数の確認スクリプト
// 使用方法: vercel env ls

console.log('Vercel環境変数の確認方法:');
console.log('');
console.log('1. Vercel CLIで確認:');
console.log('   vercel env ls');
console.log('');
console.log('2. Vercelダッシュボードで確認:');
console.log('   https://vercel.com/dashboard');
console.log('   → プロジェクトを選択');
console.log('   → Settings → Environment Variables');
console.log('');
console.log('3. 必要な環境変数:');
console.log('   - DATABASE_URL: データベース接続URL');
console.log('   - NODE_ENV: production');
console.log('');
console.log('4. 環境変数を設定する場合:');
console.log('   vercel env add DATABASE_URL production');
console.log('   vercel env add NODE_ENV production');
console.log('');
console.log('5. 現在のローカル環境変数:');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  // パスワードを隠す
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`   DATABASE_URL: ${maskedUrl}`);
} else {
  console.log('   DATABASE_URL: 未設定');
}

