# GitHubリポジトリ作成とVercel自動デプロイ設定ガイド

## ステップ1: GitHubでリポジトリを作成

1. **GitHubにログイン**
   - https://github.com にアクセス
   - アカウントにログイン

2. **新しいリポジトリを作成**
   - 右上の「+」アイコンをクリック
   - 「New repository」を選択

3. **リポジトリ情報を入力**
   - **Repository name**: `beauty-salon-line-bot`（または任意の名前）
   - **Description**: 「美容院予約管理システム - Next.js版」（任意）
   - **Visibility**: 
     - **Public**（公開）または
     - **Private**（非公開）を選択
   - **⚠️ 重要**: 「Initialize this repository with a README」は**チェックしない**
   - 「Add .gitignore」も**選択しない**（既にプロジェクトにあります）
   - 「Choose a license」も**選択しない**

4. **「Create repository」をクリック**

5. **リポジトリURLをコピー**
   - 作成後、表示されるページでリポジトリURLをコピー
   - 例: `https://github.com/your-username/beauty-salon-line-bot.git`
   - または: `git@github.com:your-username/beauty-salon-line-bot.git`

## ステップ2: ローカルリポジトリをGitHubに接続

ターミナルで以下のコマンドを実行：

```bash
# プロジェクトディレクトリに移動
cd /Users/takasakimotonobu/Desktop/beauty-salon-line-bot

# GitHubリポジトリをリモートとして追加
# ⚠️ 以下のURLを、ステップ1で作成した実際のリポジトリURLに置き換えてください
git remote add origin https://github.com/your-username/beauty-salon-line-bot.git

# リモートが正しく追加されたか確認
git remote -v

# メインブランチをGitHubにプッシュ
git push -u origin main
```

**注意**: 
- 初回プッシュ時、GitHubの認証情報（ユーザー名とパスワード/トークン）を求められる場合があります
- パスワードの代わりに、Personal Access Token（PAT）が必要な場合があります

## ステップ3: VercelでGitHubリポジトリを連携

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com にログイン

2. **プロジェクト設定を開く**
   - 既存のプロジェクト「beauty-salon-line-bot」を選択
   - または、新しいプロジェクトとしてインポート

3. **GitHubリポジトリを連携**
   - プロジェクト設定 → 「Git」タブ
   - 「Connect Git Repository」をクリック
   - GitHubを選択
   - 作成したリポジトリ「beauty-salon-line-bot」を選択
   - 「Import」をクリック

4. **自動デプロイの確認**
   - 連携後、Vercelが自動的にデプロイを開始します
   - 「Deployments」タブでデプロイ状況を確認できます

## ステップ4: 今後のデプロイ方法

GitHubにプッシュするだけで、Vercelが自動的にデプロイします：

```bash
# 変更をコミット
git add .
git commit -m "変更内容の説明"

# GitHubにプッシュ（これで自動的にVercelがデプロイを開始）
git push origin main
```

## トラブルシューティング

### GitHub認証エラーが発生する場合

1. **Personal Access Token（PAT）を作成**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 「Generate new token (classic)」をクリック
   - スコープ: `repo` にチェック
   - トークンを生成してコピー

2. **プッシュ時にトークンを使用**
   - ユーザー名: GitHubのユーザー名
   - パスワード: 生成したトークン

### リモートリポジトリが既に存在する場合

```bash
# 既存のリモートを削除
git remote remove origin

# 新しいリモートを追加
git remote add origin https://github.com/your-username/beauty-salon-line-bot.git
```

### Vercelでリポジトリが見つからない場合

- GitHubとVercelの連携を確認
- Vercelの「Settings」→「Git」でリポジトリが正しく連携されているか確認
- 必要に応じて、リポジトリを再インポート





