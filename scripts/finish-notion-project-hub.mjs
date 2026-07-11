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
const DATA_SOURCE_ID = "39a76122-ab9f-80e9-8fbe-000b1cdbdbbc";

const PROPS = {
  dueDate: "Date / 日付",
  nextMeetingAgenda: "Next Meeting Agenda / 次回議題",
  done: "Done / 完了",
};

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

async function createLinkedViewOnPage(parentPageId, name, filter) {
  return notion.views.create({
    data_source_id: DATA_SOURCE_ID,
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

async function ensureQuickTaskAddPage() {
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
  const hasLinkedDb = blocks.results.some((block) => block.type === "child_database");

  if (!hasLinkedDb) {
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
      data_source_id: DATA_SOURCE_ID,
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
  const trackerBlocks = await notion.blocks.children.list({
    block_id: PROJECT_TRACKER_PAGE,
  });
  const hasLinkedViews = trackerBlocks.results.some(
    (block) =>
      block.type === "child_database" &&
      !block.archived &&
      block.child_database?.title !== "Project",
  );

  if (!hasLinkedViews) {
    await appendHeading(PROJECT_TRACKER_PAGE, "📊 IMMEDIATE TASKS (This Week)");
    await createLinkedViewOnPage(PROJECT_TRACKER_PAGE, "IMMEDIATE TASKS", {
      and: [
        { property: PROPS.dueDate, date: { on_or_after: "today" } },
        { property: PROPS.dueDate, date: { on_or_before: "one_week_from_now" } },
        { property: PROPS.done, checkbox: { equals: false } },
      ],
    });
    console.log("Linked IMMEDIATE TASKS");

    await appendHeading(PROJECT_TRACKER_PAGE, "🗣️ NEXT MEETING AGENDA");
    await createLinkedViewOnPage(PROJECT_TRACKER_PAGE, "NEXT MEETING AGENDA", {
      property: PROPS.nextMeetingAgenda,
      checkbox: { equals: true },
    });
    console.log("Linked NEXT MEETING AGENDA");
  } else {
    console.log("Project Tracker linked views already present");
  }

  const quickPageId = await ensureQuickTaskAddPage();
  console.log("Quick Task Add:", quickPageId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
