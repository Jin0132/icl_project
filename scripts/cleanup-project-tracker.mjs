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

const PROJECT_TRACKER_PAGE = "368934c8-4dda-4526-b612-eb9aa2a839f3";
const PROJECT_DATABASE_ID = env.NOTION_DATABASE_ID;
const PROJECT_DATA_SOURCE_ID = "39a76122-ab9f-80e9-8fbe-000b1cdbdbbc";
const PROJECT_EMBED_BLOCK_ID = "39a76122-ab9f-8086-8152-f4d0ffca9cd2";

const PROPS = {
  dueDate: "Date / 日付",
  checkbox: "Next Meeting Agenda / 次回議題",
  done: "Done / 完了",
};

const KEEP_BLOCK_IDS = new Set([PROJECT_EMBED_BLOCK_ID]);

const LINKED_VIEW_BLOCK_IDS = new Set([
  "39a76122-ab9f-817f-b313-d9b38e78cf03",
  "39a76122-ab9f-8146-93f4-d69f9528fbbd",
]);

const SECTION_HEADING_IDS = new Set([
  "39a76122-ab9f-81b7-a85f-d2e0b2fc0b0b",
  "39a76122-ab9f-8137-bd84-cbc7ed96eaab",
  "39a76122-ab9f-81e3-9605-dd9900103d0b",
]);

const VIEWS_TO_DELETE = [
  "39a76122-ab9f-81b0-a111-000c03248cbb",
  "39a76122-ab9f-8166-a0cc-000ca7b65942",
  "39a76122-ab9f-8088-bb0a-000c4a6eecd0",
  "39a76122-ab9f-808e-bc26-000cd49b7cba",
];

const MAIN_VIEW_IDS = {
  immediate: "39a76122-ab9f-8119-a37b-000cacc7045d",
  agenda: "39a76122-ab9f-81f6-9ec8-000c509b4bda",
  projectList: "39a76122-ab9f-80e0-bd3f-000c8bfdf493",
};

const TABLE_COLUMNS = [
  { property_id: "title", visible: true, width: 280 },
  { property_id: "~Hxk", visible: true, width: 180 },
  { property_id: "k|{D", visible: true, width: 140 },
  { property_id: "sPcq", visible: true, width: 120 },
  { property_id: "kN^v", visible: true, width: 90 },
  { property_id: "oARC", visible: true, width: 140 },
  { property_id: "ou;B", visible: true, width: 200 },
];

const AGENDA_TABLE_COLUMNS = [
  { property_id: "title", visible: true, width: 280 },
  { property_id: "sPcq", visible: true, width: 120 },
  { property_id: "k|{D", visible: true, width: 140 },
  { property_id: "kN^v", visible: true, width: 90 },
  { property_id: "~Hxk", visible: true, width: 180 },
  { property_id: "oARC", visible: true, width: 140 },
  { property_id: "ou;B", visible: true, width: 200 },
];

function tableConfiguration(properties) {
  return {
    type: "table",
    properties,
    wrap_cells: true,
  };
}

function blockText(block) {
  if (block.type === "child_database") return block.child_database?.title ?? "Untitled";
  if (block.type === "heading_2" || block.type === "heading_3") {
    return block[block.type]?.rich_text?.map((item) => item.plain_text).join("") ?? "";
  }
  if (block.type === "paragraph") {
    return block.paragraph?.rich_text?.map((item) => item.plain_text).join("") ?? "";
  }
  return "";
}

function shouldArchiveBlock(block) {
  if (block.archived) return false;
  if (KEEP_BLOCK_IDS.has(block.id)) return false;

  if (LINKED_VIEW_BLOCK_IDS.has(block.id)) return true;
  if (SECTION_HEADING_IDS.has(block.id)) return true;

  if (block.type === "paragraph" && blockText(block).trim() === "") return true;
  if (block.type === "divider") return true;
  if (block.type === "table") return true;
  if (block.type === "heading_3" && blockText(block).includes("Weekly review")) return true;

  return false;
}

async function ensureMainDatabaseViews() {
  const projectList = await notion.views.retrieve({
    view_id: MAIN_VIEW_IDS.projectList,
  });
  const sourceColumns =
    projectList.configuration?.properties?.map((column) => ({
      property_id: column.property_id,
      visible: column.visible ?? true,
      width: column.width,
    })) ?? TABLE_COLUMNS;

  await notion.views.update({
    view_id: MAIN_VIEW_IDS.immediate,
    name: "IMMEDIATE TASKS",
    filter: {
      and: [
        { property: PROPS.dueDate, date: { on_or_after: "today" } },
        { property: PROPS.dueDate, date: { on_or_before: "one_week_from_now" } },
        { property: PROPS.done, checkbox: { equals: false } },
      ],
    },
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
    configuration: tableConfiguration(sourceColumns),
  });

  await notion.views.update({
    view_id: MAIN_VIEW_IDS.agenda,
    name: "NEXT MEETING AGENDA",
    filter: {
      property: PROPS.nextMeetingAgenda,
      checkbox: { equals: true },
    },
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
    configuration: tableConfiguration(AGENDA_TABLE_COLUMNS),
  });

  console.log("Updated main database view tabs");
}

async function deleteRedundantViews() {
  for (const viewId of VIEWS_TO_DELETE) {
    try {
      await notion.views.delete({ view_id: viewId });
      console.log("Deleted view:", viewId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Skip delete view", viewId, message);
    }
  }
}

async function cleanupProjectTrackerPage() {
  const response = await notion.blocks.children.list({
    block_id: PROJECT_TRACKER_PAGE,
  });

  let archived = 0;

  for (const block of response.results) {
    if (!shouldArchiveBlock(block)) continue;

    await notion.blocks.update({
      block_id: block.id,
      archived: true,
    });

    archived += 1;
    console.log("Archived:", block.type, blockText(block) || block.id);
  }

  const after = await notion.blocks.children.list({
    block_id: PROJECT_TRACKER_PAGE,
  });

  const active = after.results.filter((block) => !block.archived);
  const hasIntro = active.some(
    (block) => block.type === "paragraph" && blockText(block).trim().length > 0,
  );

  if (!hasIntro) {
    await notion.blocks.children.append({
      block_id: PROJECT_TRACKER_PAGE,
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
                    "Project データベースのビュータブ（IMMEDIATE TASKS / NEXT MEETING AGENDA / Project List）で課題を管理します。",
                },
              },
            ],
          },
        },
      ],
    });
    console.log("Added intro paragraph");
  }

  console.log(`Archived ${archived} blocks on Project Tracker`);
}

async function main() {
  await deleteRedundantViews();
  await ensureMainDatabaseViews();
  await cleanupProjectTrackerPage();

  const views = await notion.views.list({
    database_id: PROJECT_DATABASE_ID,
    data_source_id: PROJECT_DATA_SOURCE_ID,
    page_size: 100,
  });

  console.log("\nRemaining database views:");
  for (const view of views.results) {
    const full = await notion.views.retrieve({ view_id: view.id });
    if (full.parent?.database_id === PROJECT_DATABASE_ID) {
      console.log("-", full.name, `(${full.type})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
