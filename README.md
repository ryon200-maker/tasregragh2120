# TasteGraph v4

TasteGraphは作品への「好き度」を数字で決めるのではなく、作品との関係を自然言語のカテゴリとして記録する実験的なアプリです。

## 6カテゴリ
- 何度でも見たい
- もう一度見たい
- 見た
- 途中離脱
- 見てない
- 見たい

DBにはこのカテゴリをそのまま意味する文字列を保存し、0〜100などの点数には変換しません。後からSQL / Python / Power BIなどの分析層で、必要に応じて分布や傾向を数値化できます。

## 起動
```bash
npm install
npm run dev
```
Supabaseは未設定でもデモUIが動きます。接続する場合は`.env.example`を`.env.local`にして値を設定し、`supabase/schema.sql`を実行してください。

## GitHub
このフォルダをGitリポジトリとして初期化し、GitHubへpushして開発を開始できます。
