import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const PROJECT_TRACKER_PAGE = "368934c8-4dda-4526-b612-eb9aa2a839f3";
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const PROPS = {
  title: "Title / 名前",
  category: "Category",
  person: "Person in charge",
  nextMeetingAgenda: "Next Meeting Agenda / 次回議題",
  done: "Done / 完了",
  memo: "Memo",
};

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

async function listBlocks(blockId, parentText = "") {
  const items = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      const text =
        block[block.type]?.rich_text?.map((item) => item.plain_text).join("").trim() ??
        "";

      if (block.type === "to_do" && text) {
        items.push({
          blockId: block.id,
          title: text,
          parent: parentText,
        });
      }

      if (block.type === "bulleted_list_item" && text) {
        items.push({
          blockId: block.id,
          title: text,
          parent: parentText,
        });
      }

      if (
        block.has_children &&
        (block.type === "to_do" || block.type === "bulleted_list_item")
      ) {
        const nextParent = block.type === "to_do" && text ? text : parentText;
        items.push(...(await listBlocks(block.id, nextParent)));
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return items;
}

async function getExistingTitles() {
  const database = await notion.databases.retrieve({
    database_id: DATABASE_ID,
  });
  const dataSourceId = database.data_sources[0].id;
  const titles = new Set();
  let cursor;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if (page.object !== "page") continue;

      const titleProperty = page.properties[PROPS.title];
      if (titleProperty?.type === "title") {
        titles.add(
          normalize(titleProperty.title.map((item) => item.plain_text).join("")),
        );
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return titles;
}

function inferMeta(title, parent) {
  const lower = title.toLowerCase();
  const meta = {
    discussInMeeting: false,
    person: null,
    memo: parent ? `Section: ${parent}` : "",
  };

  if (
    lower.includes("discuss") ||
    lower.includes("talk about") ||
    lower.includes("makiko-san") ||
    lower.includes("話し合い") ||
    lower.includes("meeting")
  ) {
    meta.discussInMeeting = true;
  }

  if (lower.includes("makiko")) meta.person = "Makiko";
  else if (lower.includes("theo")) meta.person = "Theo";
  else if (
    lower.includes("bank") ||
    lower.includes("money") ||
    lower.includes("accounting") ||
    lower.includes("会計") ||
    lower.includes("marketing") ||
    lower.includes("audience")
  ) {
    meta.person = "Asaka";
  }

  return meta;
}

function buildProperties(task) {
  const { discussInMeeting, person, memo } = inferMeta(task.title, task.parent);
  const properties = {
    [PROPS.title]: {
      title: [{ text: { content: task.title.slice(0, 2000) } }],
    },
    [PROPS.category]: { select: { name: "Define Company" } },
    [PROPS.nextMeetingAgenda]: { checkbox: discussInMeeting },
    [PROPS.done]: { checkbox: false },
  };

  if (person) {
    properties[PROPS.person] = { select: { name: person } };
  }

  if (memo) {
    properties[PROPS.memo] = {
      rich_text: [{ text: { content: memo.slice(0, 2000) } }],
    };
  }

  return properties;
}

async function archiveBlock(blockId) {
  await notion.blocks.update({ block_id: blockId, archived: true });
}

const tasks = await listBlocks(PROJECT_TRACKER_PAGE);
const existing = await getExistingTitles();

const created = [];
const skipped = [];

for (const task of tasks) {
  const key = normalize(task.title);

  if (existing.has(key)) {
    skipped.push(task.title);
    continue;
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: buildProperties(task),
  });

  existing.add(key);
  created.push(task.title);

  try {
    await archiveBlock(task.blockId);
  } catch (error) {
    console.warn(
      `Could not archive block for "${task.title}":`,
      error instanceof Error ? error.message : error,
    );
  }
}

console.log(`Created ${created.length} rows`);
for (const title of created) console.log(` + ${title}`);
console.log(`Skipped ${skipped.length} duplicates`);
for (const title of skipped) console.log(` - ${title}`);
