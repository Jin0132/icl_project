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

const PROJECT_DATABASE_ID = env.NOTION_DATABASE_ID;
const DATA_SOURCE_ID = "39a76122-ab9f-80e9-8fbe-000b1cdbdbbc";

const OLD_CHECKBOX = "Checkbox";

const PROPS = {
  title: "Title / 名前",
  category: "Category",
  person: "Person in charge",
  dueDate: "Date / 日付",
  nextMeetingAgenda: "Next Meeting Agenda / 次回議題",
  done: "Done / 完了",
  memo: "Memo",
};

const VIEW_IDS = {
  projectList: "39a76122-ab9f-80e0-bd3f-000c8bfdf493",
  immediate: "39a76122-ab9f-8119-a37b-000cacc7045d",
  agenda: "39a76122-ab9f-81f6-9ec8-000c509b4bda",
};

const IMMEDIATE_TASKS_FILTER = {
  and: [
    { property: PROPS.dueDate, date: { on_or_after: "today" } },
    { property: PROPS.dueDate, date: { on_or_before: "one_week_from_now" } },
    { property: PROPS.done, checkbox: { equals: false } },
  ],
};

function tableConfiguration(propertyIds) {
  return {
    type: "table",
    properties: [
      { property_id: propertyIds.title, visible: true, width: 280 },
      { property_id: propertyIds.category, visible: true, width: 160 },
      { property_id: propertyIds.dueDate, visible: true, width: 130 },
      { property_id: propertyIds.nextMeetingAgenda, visible: true, width: 120 },
      { property_id: propertyIds.done, visible: true, width: 90 },
      { property_id: propertyIds.person, visible: true, width: 130 },
      { property_id: propertyIds.memo, visible: true, width: 180 },
    ],
    wrap_cells: true,
  };
}

function agendaTableConfiguration(propertyIds) {
  return {
    type: "table",
    properties: [
      { property_id: propertyIds.title, visible: true, width: 280 },
      { property_id: propertyIds.nextMeetingAgenda, visible: true, width: 120 },
      { property_id: propertyIds.dueDate, visible: true, width: 130 },
      { property_id: propertyIds.done, visible: true, width: 90 },
      { property_id: propertyIds.category, visible: true, width: 160 },
      { property_id: propertyIds.person, visible: true, width: 130 },
      { property_id: propertyIds.memo, visible: true, width: 180 },
    ],
    wrap_cells: true,
  };
}

function getPropertyIdMap(dataSource) {
  const map = {};
  for (const [name, property] of Object.entries(dataSource.properties)) {
    map[name] = property.id;
  }
  return map;
}

function resolvePropertyIds(map) {
  return {
    title: map[PROPS.title] ?? "title",
    category: map[PROPS.category],
    dueDate: map[PROPS.dueDate],
    nextMeetingAgenda: map[PROPS.nextMeetingAgenda],
    done: map[PROPS.done],
    person: map[PROPS.person],
    memo: map[PROPS.memo],
  };
}

async function ensureCheckboxProperties() {
  const current = await notion.dataSources.retrieve({ data_source_id: DATA_SOURCE_ID });
  const hasAgenda = Boolean(current.properties[PROPS.nextMeetingAgenda]);
  const hasDone = Boolean(current.properties[PROPS.done]);
  const hasOldCheckbox = Boolean(current.properties[OLD_CHECKBOX]);

  if (hasAgenda && hasDone) {
    console.log("Checkbox properties already configured");
    return notion.dataSources.retrieve({ data_source_id: DATA_SOURCE_ID });
  }

  const properties = {};

  if (hasOldCheckbox && !hasAgenda) {
    properties[OLD_CHECKBOX] = {
      name: PROPS.nextMeetingAgenda,
      checkbox: {},
    };
  }

  if (!hasDone) {
    properties[PROPS.done] = { checkbox: {} };
  }

  await notion.dataSources.update({
    data_source_id: DATA_SOURCE_ID,
    properties,
  });

  console.log("Updated checkbox properties");
  return notion.dataSources.retrieve({ data_source_id: DATA_SOURCE_ID });
}

async function updateViews(propertyIds) {
  const sharedConfig = tableConfiguration(propertyIds);

  await notion.views.update({
    view_id: VIEW_IDS.projectList,
    configuration: sharedConfig,
  });
  console.log("Updated Project List columns");

  await notion.views.update({
    view_id: VIEW_IDS.immediate,
    name: "IMMEDIATE TASKS",
    filter: IMMEDIATE_TASKS_FILTER,
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
    configuration: sharedConfig,
  });
  console.log("Updated IMMEDIATE TASKS view");

  await notion.views.update({
    view_id: VIEW_IDS.agenda,
    name: "NEXT MEETING AGENDA",
    filter: {
      property: PROPS.nextMeetingAgenda,
      checkbox: { equals: true },
    },
    sorts: [{ property: PROPS.dueDate, direction: "ascending" }],
    configuration: agendaTableConfiguration(propertyIds),
  });
  console.log("Updated NEXT MEETING AGENDA view");
}

async function verifyFilters(propertyIds) {
  const immediate = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: IMMEDIATE_TASKS_FILTER,
  });

  const agenda = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: {
      property: PROPS.nextMeetingAgenda,
      checkbox: { equals: true },
    },
  });

  console.log("\nVerification:");
  console.log("- IMMEDIATE TASKS matches:", immediate.results.length);
  console.log("- NEXT MEETING AGENDA matches:", agenda.results.length);

  for (const page of immediate.results.slice(0, 5)) {
    const title = page.properties[PROPS.title]?.title?.[0]?.plain_text ?? "(untitled)";
    const date = page.properties[PROPS.dueDate]?.date?.start ?? "no date";
    console.log(`  immediate: ${title} (${date})`);
  }
}

async function main() {
  const dataSource = await ensureCheckboxProperties();
  const propertyIds = resolvePropertyIds(getPropertyIdMap(dataSource));

  if (!propertyIds.nextMeetingAgenda || !propertyIds.done) {
    throw new Error("Failed to resolve checkbox property IDs");
  }

  await updateViews(propertyIds);
  await verifyFilters(propertyIds);

  const views = await notion.views.list({ database_id: PROJECT_DATABASE_ID, page_size: 100 });
  console.log("\nDatabase views:");
  for (const view of views.results) {
    const full = await notion.views.retrieve({ view_id: view.id });
    console.log(`- ${full.name}`);
    console.log(`  filter: ${JSON.stringify(full.filter)}`);
    console.log(
      `  columns: ${full.configuration?.properties?.map((column) => column.property_name).join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
