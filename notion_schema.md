# Notion Workspace Schema — ICL Master

> **Generated:** 2026-07-11  
> **Purpose:** Machine-readable specification of the connected Notion workspace structure, focused on ICL Master and its descendants.  
> **Source:** Notion MCP scan (`notion-fetch`, `notion-search`)

---

## Workspace

| Field | Value |
|-------|-------|
| Workspace name | Theo Lofgren's Space |
| Workspace ID | `86176122-ab9f-8113-92c4-0003103c29fd` |
| Connected user | Taka (`inkt.0132@icloud.com`) |
| User ID | `38fd872b-594c-81b3-b725-000275f835da` |

---

## Hierarchy Overview

```
ICL Master (page)
├── Ideas & Brainstorming / 企画・アイデア (page)
│   └── 📅 イベント日程・カフェ確定表 (database)
├── Venues & Partners / 会場・カフェ管理（営業リスト） (page)
│   ├── ☕ Cafes to try (database)
│   └── 🏨 ICL_CRM_Phase1_Hotels_Hostels_Notion (database)
├── Project Tracker / タスク・進捗管理 (page)
│   └── Project (database)
├── Team & Operations / メンバー・運営管理 (page)
│   └── Calendar of availability (database)
├── Archive / 過去の記録・写真 (page)
│   └── 📸 ICL Photos (database)
├── Meeting Minutes / 議事録 (page) [blank]
└── Event Marketing / イベントマーケティング (page)
```

**Totals under ICL Master:**
- Pages: 8 (root + 7 subpages)
- Databases: 6
- Database rows (entries): not enumerated in this schema document

---

## Pages

### Root

#### 🏠 ICL Master

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `e25335d8-9cd4-4693-8697-33687c921797` |
| URL | https://app.notion.com/p/e25335d89cd44693869733687c921797 |
| Icon | 🏠 |
| Parent | (workspace root) |
| Properties | `title`: "ICL Master" |
| Description | Master hub for ICL (International Community Lab). Links to all sections. |

**Direct child pages:**

| # | Title | Page ID |
|---|-------|---------|
| 1 | Ideas & Brainstorming / 企画・アイデア | `59a234be-2a85-4390-9f35-cad48be4f5c4` |
| 2 | Venues & Partners / 会場・カフェ管理（営業リスト） | `dac1d11d-3fd6-4546-8a7e-8873bb682405` |
| 3 | Project Tracker / タスク・進捗管理 | `368934c8-4dda-4526-b612-eb9aa2a839f3` |
| 4 | Team & Operations / メンバー・運営管理 | `39876122-ab9f-801a-bbdf-e55b5b0cb13d` |
| 5 | Archive / 過去の記録・写真 | `39876122-ab9f-803b-abc1-d191ed4c2407` |
| 6 | Meeting Minutes / 議事録 | `39876122-ab9f-80b7-bc8b-d4155bc5d50c` |
| 7 | Event Marketing / イベントマーケティング | `39876122-ab9f-8022-a62f-df23bb12553d` |

---

### Subpages

#### 💡 Ideas & Brainstorming / 企画・アイデア

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `59a234be-2a85-4390-9f35-cad48be4f5c4` |
| URL | https://app.notion.com/p/59a234be2a8543909f35cad48be4f5c4 |
| Icon | 💡 |
| Parent | ICL Master |
| Properties | `title`: "Ideas & Brainstorming / 企画・アイデア" |
| Embedded databases | イベント日程・カフェ確定表 |
| Content notes | Theme ideas (Culture Clash, Life in Japan, Tokyo Explorer, Food Around the Table, Around the World) |

#### 📍 Venues & Partners / 会場・カフェ管理（営業リスト）

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `dac1d11d-3fd6-4546-8a7e-8873bb682405` |
| URL | https://app.notion.com/p/dac1d11d3fd645468a7e8873bb682405 |
| Icon | 📍 |
| Parent | ICL Master |
| Properties | `title`: "Venues & Partners / 会場・カフェ管理（営業リスト）" |
| Embedded databases | Cafes to try, ICL_CRM_Phase1_Hotels_Hostels_Notion |

#### 📊 Project Tracker / タスク・進捗管理

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `368934c8-4dda-4526-b612-eb9aa2a839f3` |
| URL | https://app.notion.com/p/368934c84dda4526b612eb9aa2a839f3 |
| Icon | 📊 |
| Parent | ICL Master |
| Properties | `title`: "Project Tracker / タスク・進捗管理" |
| Embedded databases | Project |
| Content notes | Checklist tasks (audience research, finance, hiring, member analysis, etc.) |

#### 👥 Team & Operations / メンバー・運営管理

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `39876122-ab9f-801a-bbdf-e55b5b0cb13d` |
| URL | https://app.notion.com/p/39876122ab9f801abbdfe55b5b0cb13d |
| Icon | 👥 |
| Parent | ICL Master |
| Properties | `title`: "Team & Operations / メンバー・運営管理" |
| Embedded databases | Calendar of availability |
| Content notes | Role assignment table (Venue Booking→Asaka, Event Creation→Theo, etc.) |

#### 📸 Archive / 過去の記録・写真

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `39876122-ab9f-803b-abc1-d191ed4c2407` |
| URL | https://app.notion.com/p/39876122ab9f803babc1d191ed4c2407 |
| Icon | 📸 |
| Parent | ICL Master |
| Properties | `title`: "Archive / 過去の記録・写真" |
| Embedded databases | ICL Photos |

#### 📝 Meeting Minutes / 議事録

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `39876122-ab9f-80b7-bc8b-d4155bc5d50c` |
| URL | https://app.notion.com/p/39876122ab9f80b7bc8bd4155bc5d50c |
| Icon | 📝 |
| Parent | ICL Master |
| Properties | `title`: "Meeting Minutes / 議事録" |
| Embedded databases | (none) |
| Status | Blank page |

#### 📣 Event Marketing / イベントマーケティング

| Field | Value |
|-------|-------|
| Type | `page` |
| ID | `39876122-ab9f-8022-a62f-df23bb12553d` |
| URL | https://app.notion.com/p/39876122ab9f8022a62fdf23bb12553d |
| Icon | 📣 |
| Parent | ICL Master |
| Properties | `title`: "Event Marketing / イベントマーケティング" |
| Embedded databases | (none) |
| Content notes | Promotion channels: Instagram, Hotel/Hostel |

---

## Databases

> Each database is represented as a **data source** in Notion MCP. Use `collection://<data-source-id>` for SQL queries via `notion-query-data-sources`.

---

### 1. 📅 イベント日程・カフェ確定表

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | イベント日程・カフェ確定表 |
| Icon | 📅 |
| Database page ID | `bc3bd5c6-1f1a-4d9c-a946-9f37b250a350` |
| Data source ID | `collection://5b4781a2-2c5f-42ab-a0ae-723c88fe7b5c` |
| URL | https://app.notion.com/p/bc3bd5c61f1a4d9ca9469f37b250a350 |
| Parent page | Ideas & Brainstorming / 企画・アイデア |
| Inline | `true` |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| イベント名 | `title` | Primary title column |
| 日付 | `date` | SQL columns: `date:日付:start`, `date:日付:end`, `date:日付:is_datetime` |
| 時間 | `text` | |
| カフェ | `text` | |
| メモ | `text` | |
| 送付日 | `date` | SQL columns: `date:送付日:start`, `date:送付日:end`, `date:送付日:is_datetime` |
| Meetup文担当へ送付 | `checkbox` | SQL: `"__YES__"` / `"__NO__"` |
| インスタ文担当へ送付 | `checkbox` | SQL: `"__YES__"` / `"__NO__"` |

#### System columns (SQLite)

- `url` (TEXT, UNIQUE)
- `createdTime` (TEXT, ISO-8601)

---

### 2. ☕ Cafes to try

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | Cafes to try |
| Icon | ☕ |
| Database page ID | `b23e36cc-9566-4986-b162-341793fd3626` |
| Data source ID | `collection://14b640db-613e-402a-8440-9341cde692bb` |
| URL | https://app.notion.com/p/b23e36cc95664986b162341793fd3626 |
| Parent page | Venues & Partners / 会場・カフェ管理（営業リスト） |
| Inline | `true` |
| Page templates | 新規ページ (`39176122-ab9f-80c3-9a43-d68836fd3eba`) |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| Name | `title` | Primary title column |
| Type | `select` | `☕ Cafe`, `🍺 Craft beer` |
| Area / nearest station | `text` | |
| Link | `url` | |
| Why I want to go | `text` | |
| Notes | `text` | |

---

### 3. 🏨 ICL_CRM_Phase1_Hotels_Hostels_Notion

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | ICL_CRM_Phase1_Hotels_Hostels_Notion |
| Icon | 🏨 |
| Database page ID | `39576122-ab9f-805f-b931-d857f183bc52` |
| Data source ID | `collection://39576122-ab9f-805e-bf34-000b38091b33` |
| URL | https://app.notion.com/p/39576122ab9f805fb931d857f183bc52 |
| Parent page | Venues & Partners / 会場・カフェ管理（営業リスト） |
| Inline | `true` |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| 施設名 | `title` | Primary title column |
| カテゴリ | `text` | |
| エリア | `text` | |
| 優先度 | `select` | `★★★★★`, `★★★★☆` |
| 営業ステータス | `select` | `未連絡` |
| 初回連絡日 | `text` | |
| 最終連絡日 | `text` | |
| 次回フォロー日 | `text` | |
| 提案内容 | `text` | |
| 返信内容 | `text` | |
| 成果 | `text` | |
| チラシ設置 | `select` | `未確認` |
| QR設置 | `select` | `未確認` |
| 公式サイト | `url` | |
| 問い合わせフォーム | `url` | |
| Instagram | `url` | |
| 情報元URL | `url` | |
| メール | `email` | |
| 電話番号 | `text` | |
| 担当部署 | `text` | |
| メモ | `text` | |

---

### 4. Project

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | Project |
| Icon | (none) |
| Database page ID | `39a76122-ab9f-8086-8152-f4d0ffca9cd2` |
| Data source ID | `collection://39a76122-ab9f-80e9-8fbe-000b1cdbdbbc` |
| URL | https://app.notion.com/p/39a76122ab9f80868152f4d0ffca9cd2 |
| Parent page | Project Tracker / タスク・進捗管理 |
| Inline | `true` |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| Title / 名前 | `title` | Primary title column |
| Category | `select` | `Define Company` |
| Person in charge | `select` | `Asaka`, `Makiko`, `Theo`, `All` |
| Date / 日付 | `date` | SQL columns: `date:Date / 日付:start`, `date:Date / 日付:end`, `date:Date / 日付:is_datetime` |
| Checkbox | `checkbox` | SQL: `"__YES__"` / `"__NO__"` |
| Memo | `text` | |

---

### 5. Calendar of availability

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | Calendar of availability |
| Icon | (none) |
| Database page ID | `39176122-ab9f-806d-bdef-c7287ac6174b` |
| Data source ID | `collection://39176122-ab9f-8044-8b8e-000b88e82842` |
| URL | https://app.notion.com/p/39176122ab9f806dbdefc7287ac6174b |
| Parent page | Team & Operations / メンバー・運営管理 |
| Inline | `true` |
| SQL limitations | `場所` (place) not available in querySql |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| Name | `title` | Primary title column |
| Date | `date` | SQL columns: `date:Date:start`, `date:Date:end`, `date:Date:is_datetime` |
| Tags | `multi_select` | `🔵MAKIKO`, `🟢Theo`, `🟡ASAKA` (JSON array in SQL) |
| 場所 | `place` | Not queryable via SQL |

#### Status groups (Tags context)

Tags use `multi_select`, not `status`. Listed options above.

---

### 6. 📸 ICL Photos

| Field | Value |
|-------|-------|
| Type | `database` / `data_source` |
| Name | ICL Photos |
| Icon | 📸 |
| Database page ID | `3be994fc-40d4-4eb2-8691-a6eda1f1d605` |
| Data source ID | `collection://1a93dd94-d804-47c0-af2d-96505c781b33` |
| URL | https://app.notion.com/p/3be994fc40d44eb28691a6eda1f1d605 |
| Parent page | Archive / 過去の記録・写真 |
| Inline | `true` |

#### Properties

| Property name | Type | Options / Notes |
|---------------|------|-----------------|
| Name | `title` | Primary title column |
| Event date | `date` | SQL columns: `date:Event date:start`, `date:Event date:end`, `date:Event date:is_datetime` |
| Photo type | `select` | `イベント前用`, `イベント当日`, `Instagram用`, `Meetup用` |
| Status | `status` | See status groups below |
| Photos | `file` | JSON array of file IDs in SQL |
| Link | `url` | |
| Caption / note | `text` | |

#### Status groups (Status property)

| Group | Options |
|-------|---------|
| to_do | `Need photos` |
| in_progress | `Selecting`, `Editing` |
| complete | `Ready`, `Posted` |

---

## Property Type Reference

| Notion type | Description | SQL notes |
|-------------|-------------|-----------|
| `title` | Primary name of each row | Stored as TEXT |
| `text` | Plain text | TEXT |
| `url` | URL link | TEXT |
| `email` | Email address | TEXT |
| `checkbox` | Boolean | `"__YES__"` = true, `"__NO__"` = false |
| `date` | Date or datetime | Use expanded columns: `date:<name>:start`, `date:<name>:end`, `date:<name>:is_datetime` |
| `select` | Single choice | TEXT, one of defined options |
| `multi_select` | Multiple choices | TEXT, JSON array |
| `status` | Workflow status | TEXT, one of defined options (grouped) |
| `file` | File attachments | TEXT, JSON array of file IDs |
| `place` | Location | Not available in SQL for Calendar of availability |

---

## Programmatic Access

### Fetch by ID

```text
notion-fetch id="e25335d8-9cd4-4693-8697-33687c921797"   # ICL Master page
notion-fetch id="collection://5b4781a2-2c5f-42ab-a0ae-723c88fe7b5c"  # Event schedule DB
```

### SQL query example

```sql
SELECT "イベント名", "date:日付:start", "カフェ"
FROM "collection://5b4781a2-2c5f-42ab-a0ae-723c88fe7b5c"
WHERE "date:日付:start" IS NOT NULL
```

### ID quick lookup

| Entity | ID |
|--------|-----|
| ICL Master (page) | `e25335d8-9cd4-4693-8697-33687c921797` |
| イベント日程・カフェ確定表 (data source) | `5b4781a2-2c5f-42ab-a0ae-723c88fe7b5c` |
| Cafes to try (data source) | `14b640db-613e-402a-8440-9341cde692bb` |
| ICL_CRM_Phase1_Hotels_Hostels_Notion (data source) | `39576122-ab9f-805e-bf34-000b38091b33` |
| Project (data source) | `39a76122-ab9f-80e9-8fbe-000b1cdbdbbc` |
| Calendar of availability (data source) | `39176122-ab9f-8044-8b8e-000b88e82842` |
| ICL Photos (data source) | `1a93dd94-d804-47c0-af2d-96505c781b33` |

---

## Scan Notes

- **Scope:** ICL Master and all directly nested pages and inline databases.
- **Excluded:** Individual database row pages (e.g. cafe entries, hotel CRM records, photo entries) — these follow the database schemas above.
- **Blank pages:** Meeting Minutes / 議事録 has no content or embedded databases.
- **External link:** ICL Master references a related Google Doc (drive attachment).
