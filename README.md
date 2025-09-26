# スケジュール管理 Web アプリケーション

Excel 版の 7 シート構成を Next.js + Prisma + SQLite で再構築したスケジュール管理システムです。共有フォルダに配置した SQLite ファイルを用いて、複数メンバーが同時に閲覧・編集できます。

## 主な機能

1. **メインダッシュボード** – KPI カード、稼働率グラフ、週次推移チャート、フィルタリング API。
2. **プロジェクト一覧 (02)** – CRUD、期日矛盾チェック、月次スケジュールへのリンク、CSV 入出力。
3. **月次スケジュール (03)** – 日粒度の予定登録、工程マスタ参照、休日ハイライトに対応したデータモデル。
4. **担当者リソース (04)** – 調整後工数とその他作業を集計した稼働率、MAX_UTIL 超過の強調表示。
5. **工程マスタ (05)** – 03/06 のドロップダウン候補となる工程コード・係数の管理。
6. **その他作業 (06)** – 会議や庶務などの追加タスク登録と CSV 互換の入出力。
7. **設定・メモ (07)** – 閾値・稼働期間・休日マスタ・運用メモ・監査ログ管理。

## 技術スタック

- Node.js LTS + TypeScript
- Next.js 14 (App Router) / React / Tailwind CSS / shadcn 互換 UI コンポーネント
- Prisma + SQLite (WAL モード・busy_timeout)
- Chart.js + react-chartjs-2
- Basic 認証 (viewer/editor/admin) – `.env` でパスワードを定義
- テスト: Vitest (単体) / Playwright (E2E)

## セットアップ

1. 依存インストール

   ```bash
   npm install
   ```

2. 環境変数を設定

   ```bash
   cp .env.example .env
   # DB_FILE を UNC 共有パスに差し替える
   ```

3. Prisma のマイグレーションと初期データ投入

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   npm run seed
   ```

4. 開発サーバ起動

   ```bash
   npm run dev
   ```

5. ブラウザで `http://localhost:3000` を開き、Basic 認証 (viewer/editor/admin) でログイン

## 共有 SQLite 運用

- `.env` の `DB_FILE` に `\\fileserver\shared\db\dev_sched.sqlite` など UNC パスを指定します。
- アプリ起動時に `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;` を自動設定します。
- 共有フォルダにアクセスするサービスアカウントで Node.js プロセスを実行してください。

## バックアップ

PowerShell で WAL を考慮したスナップショットを作成するスクリプトを `backup/backup-db.ps1` に同梱しています。

```powershell
pwsh backup/backup-db.ps1 -DbPath \\fileserver\shared\db\dev_sched.sqlite -Destination D:\\backups
```

## CSV / 将来の Excel 連携

- `/api/export/csv?entity=projects` などで BOM 付き UTF-8 / CRLF の CSV を取得できます。
- `/api/import/csv` はフォーム (`entity`, `file`) でアップロードでき、列名・型検証後にエラー行を返します。(初期実装では `projects` をサポート)
- 将来的な Excel (XLSX) エクスポートに備え、`entityMap` を用いた変換レイヤーをコード内コメントで明示しています。

## テスト

```bash
npm test      # Vitest
npm run test:e2e  # Playwright (別途 dev サーバを起動)
```

## npm スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Next.js 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番起動 |
| `npm run prisma:migrate` | Prisma マイグレーション (dev) |
| `npm run prisma:generate` | Prisma クライアント生成 |
| `npm run seed` | 初期データ投入 |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |

## 権限・監査

- `viewer` – 閲覧のみ
- `editor` – CRUD 操作
- `admin` – 設定変更 + すべての権限
- 監査ログ (`audit_logs`) に CRUD 操作が JSON で記録され、設定ページで最新 10 件を表示します。

## トラブルシューティング

- **`SQLITE_BUSY` エラー**: 共有フォルダの遅延やロックが原因です。アプリは `busy_timeout` を 5 秒に設定済みですが、長期ロック発生時は WAL ファイルのバックアップを確認してください。
- **Basic 認証に失敗する**: `.env` のパスワードが空の場合、該当ロールでログインできません。テスト用途では viewer/editor/admin を設定してください。
- **Playwright テストが失敗する**: `npm run dev` を別ターミナルで起動した状態で実行してください。
- **npm install が 403 で失敗する**: 社内プロキシで npm のスコープ付きパッケージ (`@prisma/client` など) が遮断されている場合があります。`npm config set registry https://registry.npmjs.org/` などで許可されたレジストリに切り替えるか、社内ネットワーク管理者にアクセス権を確認してください。

## 将来の拡張メモ

- ダッシュボード集計が重くなった際は、月次集計テーブルもしくは Redis キャッシュを検討します。
- OIDC 認証への差し替えを想定し、Basic 認証はミドルウェアに閉じ込めています。
