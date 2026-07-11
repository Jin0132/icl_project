import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@notionhq/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const notion = new Client({ auth: env.NOTION_API_KEY });

const ICL_MASTER_PAGE = "e25335d8-9cd4-4693-8697-33687c921797";
const PROJECT_TRACKER_PAGE = "368934c8-4dda-4526-b612-eb9aa2a839f3";
const DATABASE_ID = env.NOTION_DATABASE_ID;

const PROPS = {
  title: "Title / 名前",
  category: "Category",
  person: "Person in charge",
  dueDate: "Date / 日付",
  nextMeetingAgenda: "Next Meeting Agenda / 次回議題",
  done: "Done / 完了",
  memo: "Memo",
};

const CATEGORIES = [
  "Strategy & Governance",
  "Finance",
  "Team & HR",
  "Marketing & Research",
  "Operations & Systems",
];

function inferCategory(title, memo = "") {
  const text = `${title} ${memo}`.toLowerCase();

  if (
    text.includes("bank") ||
    text.includes("money") ||
    text.includes("accounting") ||
    text.includes("finance") ||
    text.includes("会計")
  ) {
    return "Finance";
  }

  if (
    text.includes("hire") ||
    text.includes("role") ||
    text.includes("team") ||
    text.includes("makiko") ||
    text.includes("theo") ||
    text.includes("operation plan") ||
    text.includes("採用") ||
    text.includes("体制")
  ) {
    return "Team & HR";
  }

  if (
    text.includes("marketing") ||
    text.includes("audience") ||
    text.includes("member") ||
    text.includes("attendee") ||
    text.includes("competitor") ||
    text.includes("interview") ||
    text.includes("research") ||
    text.includes("analyze")
  ) {
    return "Marketing & Research";
  }

  if (
    text.includes("policy") ||
    text.includes("guideline") ||
    text.includes("direction") ||
    text.includes("meeting") ||
    text.includes("company") ||
    text.includes("方針")
  ) {
    return "Strategy & Governance";
  }

  return "Operations & Systems";
}

async function getDataSourceId() {
  const database = await notion.databases.retrieve({ database_id: DATABASE_ID });
  return database.data_sources[0].id;
}

async function ensureCategoryOptions(dataSourceId) {
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: {
      [PROPS.category]: {
        select: {
          options: CATEGORIES.map((name) => ({ name })),
        },
      },
    },
  });
}

async function listProjectPages(dataSourceId) {
  const pages = [];
  let cursor;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if (page.object === "page") pages.push(page);
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function updateAllRows(dataSourceId) {
  const pages = await listProjectPages(dataSourceId);
  let updated = 0;

  for (const page of pages) {
    const titleProp = page.properties[PROPS.title];
    const memoProp = page.properties[PROPS.memo];
    const title =
      titleProp?.type === "title"
        ? titleProp.title.map((item) => item.plain_text).join("")
        : "";
    const memo =
      memoProp?.type === "rich_text"
        ? memoProp.rich_text.map((item) => item.plain_text).join("")
        : "";

    const category = inferCategory(title, memo);

    await notion.pages.update({
      page_id: page.id,
      properties: {
        [PROPS.category]: { select: { name: category } },
        [PROPS.nextMeetingAgenda]: { checkbox: false },
        [PROPS.done]: { checkbox: false },
      },
    });

    updated += 1;
    console.log(`Updated: [${category}] ${title}`);
  }

  return updated;
}

async function createDatabaseView(dataSourceId, name, filter) {
  const existing = await notion.views.list({
    database_id: DATABASE_ID,
    data_source_id: dataSourceId,
  });

  const found = existing.results.find((view) => view.name === name);
  if (found) {
    console.log(`View already exists: ${name} (${found.id})`);
    return found;
  }

  return notion.views.create({
    data_source_id: dataSourceId,
    database_id: DATABASE_ID,
    name,
    type: "table",
    filter,
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
  });
}

async function appendHeading(pageId, text) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: text } }],
        },
      },
    ],
  });
}

async function createLinkedViewOnPage(dataSourceId, parentPageId, name, filter) {
  return notion.views.create({
    data_source_id: dataSourceId,
    name,
    type: "table",
    filter,
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
    create_database: {
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
    },
  });
}

async function archiveBlock(blockId) {
  await notion.blocks.update({ block_id: blockId, archived: true });
}

async function cleanupProjectTrackerPage() {
  const response = await notion.blocks.children.list({
    block_id: PROJECT_TRACKER_PAGE,
  });

  for (const block of response.results) {
    if (block.type === "child_database") {
      await archiveBlock(block.id);
      console.log("Archived old embedded database block");
    }
  }
}

async function ensureQuickTaskAddPage(dataSourceId) {
  const search = await notion.search({
    query: "Quick Task Add",
    filter: { property: "object", value: "page" },
  });

  const existing = search.results.find((page) => {
    if (page.object !== "page") return false;
    const parent = page.parent;
    return parent.type === "page_id" && parent.page_id === ICL_MASTER_PAGE;
  });

  let pageId = existing?.id;

  if (!pageId) {
    const page = await notion.pages.create({
      parent: { page_id: ICL_MASTER_PAGE },
      properties: {
        title: { title: [{ text: { content: "Quick Task Add" } }] },
      },
      icon: { type: "emoji", emoji: "⚡" },
    });
    pageId = page.id;
    console.log("Created Quick Task Add page");
  } else {
    console.log("Quick Task Add page already exists");
  }

  const blocks = await notion.blocks.children.list({ block_id: pageId });
  const hasForm = blocks.results.some((block) => block.type === "child_database");

  if (!hasForm) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content:
                    "新しいタスクをここから追加できます。送信すると Project データベースに反映されます。",
                },
              },
            ],
          },
        },
      ],
    });

    await notion.views.create({
      data_source_id: dataSourceId,
      name: "Add Task",
      type: "form",
      create_database: {
        parent: {
          type: "page_id",
          page_id: pageId,
        },
      },
    });
    console.log("Added form view to Quick Task Add page");
  }

  return pageId;
}

async function main() {
  const dataSourceId = await getDataSourceId();
  console.log("Data source:", dataSourceId);

  console.log("\n1) Updating category options...");
  await ensureCategoryOptions(dataSourceId);

  console.log("\n2) Updating rows (categories + unchecking boxes)...");
  const updated = await updateAllRows(dataSourceId);
  console.log(`Updated ${updated} rows`);

  console.log("\n3) Creating database views...");
  const immediateView = await createDatabaseView(dataSourceId, "IMMEDIATE TASKS", {
    and: [
      { property: PROPS.dueDate, date: { on_or_after: "today" } },
      { property: PROPS.dueDate, date: { on_or_before: "one_week_from_now" } },
      { property: PROPS.done, checkbox: { equals: false } },
    ],
  });
  console.log("Created view:", immediateView.name, immediateView.id);

  const agendaView = await createDatabaseView(dataSourceId, "NEXT MEETING AGENDA", {
    property: PROPS.nextMeetingAgenda,
    checkbox: { equals: true },
  });
  console.log("Created view:", agendaView.name, agendaView.id);

  console.log("\n4) Updating Project Tracker page linked views...");
  await cleanupProjectTrackerPage();

  await appendHeading(PROJECT_TRACKER_PAGE, "📊 IMMEDIATE TASKS (This Week)");
  await createLinkedViewOnPage(dataSourceId, PROJECT_TRACKER_PAGE, "IMMEDIATE TASKS", {
    and: [
      { property: PROPS.dueDate, date: { on_or_after: "today" } },
      { property: PROPS.dueDate, date: { on_or_before: "one_week_from_now" } },
      { property: PROPS.done, checkbox: { equals: false } },
    ],
  });
  console.log("Linked IMMEDIATE TASKS on Project Tracker");

  await appendHeading(PROJECT_TRACKER_PAGE, "🗣️ NEXT MEETING AGENDA");
  await createLinkedViewOnPage(dataSourceId, PROJECT_TRACKER_PAGE, "NEXT MEETING AGENDA", {
    property: PROPS.nextMeetingAgenda,
    checkbox: { equals: true },
  });
  console.log("Linked NEXT MEETING AGENDA on Project Tracker");

  console.log("\n5) Creating Quick Task Add page...");
  const quickTaskPageId = await ensureQuickTaskAddPage(dataSourceId);
  console.log("Quick Task Add page:", quickTaskPageId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
