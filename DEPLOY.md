# ICL Project Hub — 運営チームへの共有手順

コードを触れるのは管理者のみ。運営メンバーには **公開URL** だけを渡します。

## 構成

```
運営メンバー（ブラウザ）
    ↓  URL + パスワード（任意）
Vercel（このアプリ）
    ↓  NOTION_API_KEY（サーバー側のみ）
Notion Project データベース
```

- Notion ログインは不要
- API キーは Vercel の環境変数にのみ保存（リポジトリに含めない）

---

## 1. Vercel にデプロイ（初回・管理者のみ）

### 前提

- [Vercel](https://vercel.com) アカウント
- このフォルダを GitHub 等にプッシュするか、Vercel CLI で直接デプロイ

### 環境変数（Vercel Dashboard → Project → Settings → Environment Variables）

| 名前 | 値 | 必須 |
|------|-----|------|
| `NOTION_API_KEY` | `.env.local` と同じ値 | ✅ |
| `NOTION_DATABASE_ID` | Project DB の ID | ✅ |
| `SITE_PASSWORD` | 運営チーム用の共有パスワード | 推奨 |

`SITE_PASSWORD` を設定すると、ブラウザがログインを求めます。

- **ユーザー名**: 任意（例: `icl`）
- **パスワード**: `SITE_PASSWORD` に設定した文字列

### CLI でデプロイする場合

```bash
cd icl_doc
npx vercel login
npx vercel link
npx vercel env add NOTION_API_KEY
npx vercel env add NOTION_DATABASE_ID
npx vercel env add SITE_PASSWORD
npm run deploy
```

### GitHub 連携する場合

1. リポジトリを作成して `icl_doc` を push
2. Vercel → **Add New Project** → リポジトリを選択
3. 上記の環境変数を設定
4. Deploy

---

## 2. 運営チームへの共有（URL のみ）

デプロイ後に表示される URL を運営に共有します。

**本番URL（運営チーム用）:** https://icl-project-lilac.vercel.app

> `https://icl-project.vercel.app` は別プロジェクトです。共有は **lilac** の URL を使ってください。

**共有するもの**

- ダッシュボードの URL
- `SITE_PASSWORD` を設定した場合はそのパスワード

**共有しないもの**

- `.env.local` / `NOTION_API_KEY`
- このリポジトリ（コード）
- Notion の管理画面への直接リンク（任意）

### 運営メンバーができること

- Immediate Tasks（Due in 7 Days）の確認
- Next Meeting Agenda の確認
- タスクカードを開いて **Done** / **Next Meeting Agenda** を切り替え（Notion に自動同期）

---

## 3. 更新の反映（管理者のみ）

コードを変更したあと:

```bash
npm run deploy
```

または GitHub 連携時は `main` への push で自動デプロイ。

---

## 4. トラブルシュート

| 症状 | 対処 |
|------|------|
| 500 / Offline | Vercel の `NOTION_API_KEY` と DB 共有を確認 |
| 401 ログイン | `SITE_PASSWORD` をチームに共有 |
| タスクが空 | Notion 側の期限・フィルター条件を確認 |
