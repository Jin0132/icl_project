import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@notionhq/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      let value = line.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = JSON.parse(value);
      }
      return [line.slice(0, index), value];
    }),
);

const notion = new Client({ auth: env.NOTION_API_KEY });
const DATABASE_ID = env.NOTION_DATABASE_ID;

const PROPS = {
  title: "Title / 名前",
  category: "Category",
  dueDate: "Date / 日付",
  done: "Done / 完了",
  agenda: "Next Meeting Agenda / 次回議題",
  memo: "Memo",
};

function titleProp(text) {
  return {
    [PROPS.title]: {
      title: [{ text: { content: text.slice(0, 2000) } }],
    },
  };
}

function memoProp(text) {
  if (!text) return {};
  return {
    [PROPS.memo]: {
      rich_text: [{ text: { content: text.slice(0, 2000) } }],
    },
  };
}

function categoryProp(name) {
  if (!name) return {};
  return { [PROPS.category]: { select: { name } } };
}

function checkboxProps({ done, agenda }) {
  const props = {};
  if (typeof done === "boolean") {
    props[PROPS.done] = { checkbox: done };
  }
  if (typeof agenda === "boolean") {
    props[PROPS.agenda] = { checkbox: agenda };
  }
  return props;
}

function dueDateProp(start) {
  if (!start) return {};
  return {
    [PROPS.dueDate]: {
      date: { start },
    },
  };
}

async function archivePage(pageId, label) {
  try {
    await notion.pages.update({ page_id: pageId, archived: true });
    console.log("Archived:", label);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Skip archive:", label, message);
  }
}

async function updatePage(pageId, { title, category, due, done, agenda, memo }) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      ...titleProp(title),
      ...categoryProp(category),
      ...dueDateProp(due),
      ...checkboxProps({ done, agenda }),
      ...memoProp(memo),
    },
  });
  console.log("Updated:", title);
}

async function createPage({ title, category, due, done, agenda, memo }) {
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      ...titleProp(title),
      ...categoryProp(category),
      ...dueDateProp(due),
      ...checkboxProps({ done: done ?? false, agenda: agenda ?? false }),
      ...memoProp(memo),
    },
  });
  console.log("Created:", title);
  return page.id;
}

async function main() {
  // Delete test + section header rows
  await archivePage(
    "39b76122-ab9f-8180-85ac-fae105bc58ec",
    "[Hub Test] Quick add verification",
  );
  await archivePage(
    "39a76122-ab9f-8183-a84a-ebc2b98c091c",
    "Finance & Accounting / お金・会計",
  );

  // Merge hiring role tasks → keep the one with due date + agenda
  await updatePage("39a76122-ab9f-80b2-bde1-df05deacc92e", {
    title: "Define roles to hire or pay for / 採用・報酬が必要な役割を定義する",
    category: "Team & HR",
    due: "2026-07-12",
    done: false,
    agenda: true,
    memo:
      "When you find any roles we need, write them down in Team & Operations. Merged from duplicate hiring-role tasks.",
  });
  await archivePage(
    "39a76122-ab9f-815a-8d96-dc0d1380ca79",
    "Define what roles we need to hire or pay for (duplicate)",
  );

  // Split finance: budget + money flow test
  await createPage({
    title: "Calculate event budget / イベント予算を計算する",
    category: "Finance",
  });
  await createPage({
    title: "Test money flow / 資金フローをテストする",
    category: "Finance",
  });
  await archivePage(
    "39a76122-ab9f-816b-b745-d08b623e4f58",
    "Calculate money & test money flow (split)",
  );

  // Split auto-schedule into requirements + build
  await createPage({
    title: "Define auto-schedule requirements / 自動スケジュールの要件を定義する",
    category: "Operations & Systems",
  });
  await createPage({
    title: "Build auto-managed schedule system / 自動スケジュールの仕組みを構築する",
    category: "Operations & Systems",
  });
  await archivePage(
    "39a76122-ab9f-8133-9b6b-d6dd963e303a",
    "Make a auto-managed schedule (split)",
  );

  // Bilingual renames for remaining tasks
  const renames = [
    {
      id: "39a76122-ab9f-814f-85a5-eaa5e8478999",
      title: "Retain repeat attendees / リピーター獲得の施策を考える",
      category: "Operations & Systems",
    },
    {
      id: "39a76122-ab9f-8133-b0b3-ea0d02eb7c38",
      title:
        "Competitor research / 東京で人気の国際交流Meetupを3つ分析する",
      category: "Marketing & Research",
    },
    {
      id: "39a76122-ab9f-8124-ba65-e5138b601950",
      title:
        "Interview 3 attendees / 参加者3人に参加理由と東京での悩みを聞く",
      category: "Marketing & Research",
    },
    {
      id: "39a76122-ab9f-81b9-a2ec-ebf3edf82993",
      title:
        "Analyze current members / 過去参加者の属性を書き出す",
      category: "Marketing & Research",
    },
    {
      id: "39a76122-ab9f-81c8-b26d-edb25ea635ad",
      title:
        "Discuss Makiko's role and involvement / Makikoさんの関わり方を話し合う",
      category: "Team & HR",
      done: false,
    },
    {
      id: "39a76122-ab9f-8103-b795-e7450593dada",
      title:
        "Research hiring and payment mechanisms / 採用・支払いの仕組みをリサーチする",
      category: "Team & HR",
    },
    {
      id: "39a76122-ab9f-81e0-84a5-e06f7760c929",
      title:
        "Discuss post-Theo operations plan / Theo帰国後の運営プランを話し合う",
      category: "Team & HR",
    },
    {
      id: "39a76122-ab9f-81ab-ab72-d647183ca242",
      title: "Determine event payment collection / イベントの集金方法を決定する",
      category: "Finance",
    },
    {
      id: "39a76122-ab9f-8105-8958-c2e7c5d74f1b",
      title: "Set up bank account / 銀行口座を開設する",
      category: "Finance",
    },
    {
      id: "39a76122-ab9f-812a-8119-d61bab2959f1",
      title:
        "Review Event Marketing page / イベントマーケページについて話し合う",
      category: "Marketing & Research",
    },
    {
      id: "39a76122-ab9f-81a5-8f6b-ef55414a5c06",
      title:
        "Research target audience options / ターゲット層の候補をリサーチする",
      category: "Marketing & Research",
    },
    {
      id: "39a76122-ab9f-8080-8585-dc17d8ec4b67",
      title:
        "Hold direction-setting meeting / 方針決定のためのミーティングを開く",
      category: "Strategy & Governance",
    },
    {
      id: "39a76122-ab9f-80d9-b104-dbb30d96e2d0",
      title:
        "Formulate core policy and guidelines / 会社方針・ガイドラインを言語化する",
      category: "Strategy & Governance",
    },
  ];

  for (const item of renames) {
    await updatePage(item.id, item);
  }

  console.log("\nDone. Fetching final task list...");
  const response = await notion.dataSources.query({
    data_source_id: "39a76122-ab9f-80e9-8fbe-000b1cdbdbbc",
    page_size: 100,
    sorts: [{ property: PROPS.title, direction: "ascending" }],
  });

  for (const page of response.results) {
    const title =
      page.properties[PROPS.title]?.title?.map((part) => part.plain_text).join("") ??
      "";
    const category = page.properties[PROPS.category]?.select?.name ?? "";
    console.log(`- [${category}] ${title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
