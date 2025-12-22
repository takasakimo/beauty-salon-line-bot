# VercelでGitHubリポジトリを連携する手順

## ✅ 完了した作業
- GitHubリポジトリへのプッシュが完了しました
- リポジトリURL: https://github.com/takasakimo/beauty-salon-line-bot

## 次のステップ: VercelでGitHubを連携

### 方法1: 既存プロジェクトにGitHubを連携（推奨）

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard にログイン

2. **プロジェクトを選択**
   - 「beauty-salon-line-bot」プロジェクトをクリック

3. **Settingsを開く**
   - 上部の「Settings」タブをクリック

4. **Git連携を設定**
   - 左サイドバーの「Git」をクリック
   - 「Connect Git Repository」ボタンをクリック
   - 「GitHub」を選択
   - 認証が必要な場合は、GitHubアカウントで認証
   - リポジトリ一覧から「takasakimo/beauty-salon-line-bot」を選択
   - 「Import」をクリック

5. **自動デプロイの確認**
   - 連携後、自動的にデプロイが開始されます
   - 「Deployments」タブでデプロイ状況を確認できます

### 方法2: 新しいプロジェクトとしてインポート

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard

2. **「Add New...」→「Project」をクリック**

3. **GitHubリポジトリを選択**
   - 「Import Git Repository」で「takasakimo/beauty-salon-line-bot」を検索
   - リポジトリを選択

4. **プロジェクト設定**
   - Framework Preset: Next.js（自動検出されるはず）
   - Root Directory: `./`（そのまま）
   - Build Command: `npm run build`（自動設定）
   - Output Directory: `.next`（自動設定）

5. **環境変数の設定**
   - 「Environment Variables」セクションで以下を設定：
     - `DATABASE_URL`: データベース接続URL
     - `NODE_ENV`: `production`

6. **デプロイ**
   - 「Deploy」をクリック
   - デプロイが完了するまで待機

## 今後のデプロイ方法

GitHubにプッシュするだけで、Vercelが自動的にデプロイします：

```bash
# 変更をコミット
git add .
git commit -m "変更内容の説明"

# GitHubにプッシュ（自動的にVercelがデプロイを開始）
git push origin main
```

## 確認事項

- ✅ GitHubリポジトリ: https://github.com/takasakimo/beauty-salon-line-bot
- ✅ コードは正常にプッシュ済み
- ⏳ VercelでのGit連携（手動で実行が必要）

## トラブルシューティング

### GitHubリポジトリが見つからない場合
- VercelとGitHubの連携を確認
- Vercelの「Settings」→「Git」でGitHubアカウントが正しく連携されているか確認

### デプロイが失敗する場合
- 「Deployments」タブでエラーログを確認
- 環境変数（特に`DATABASE_URL`）が正しく設定されているか確認
- ビルドログを確認してエラーを特定

