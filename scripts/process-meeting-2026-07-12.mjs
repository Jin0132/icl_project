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
  return {
    [PROPS.memo]: {
      rich_text: [{ text: { content: text.slice(0, 2000) } }],
    },
  };
}

async function markDone(pageId, memo) {
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        [PROPS.done]: { checkbox: true },
        [PROPS.agenda]: { checkbox: false },
        ...memoProp(memo),
      },
    });
    console.log("Done:", pageId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Skip done:", pageId, message);
  }
}

async function createTask({ title, category, agenda = false, memo }) {
  const properties = {
    ...titleProp(title),
    [PROPS.category]: { select: { name: category } },
    [PROPS.done]: { checkbox: false },
    [PROPS.agenda]: { checkbox: agenda },
  };
  if (memo) {
    Object.assign(properties, memoProp(memo));
  }
  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
  console.log("Created:", title);
}

async function archivePage(pageId) {
  await notion.pages.update({ page_id: pageId, archived: true });
}

const DONE_TASKS = [
  {
    id: "39a76122-ab9f-8080-8585-dc17d8ec4b67",
    memo: "Completed at 2026-07-12 meeting. Concept, motto candidates, and direction discussed.",
  },
  {
    id: "39b76122-ab9f-8123-a4d8-e36dd3daac15",
    memo: "Matsuri example modeled: 10 people max, ¥2,000/person, organizer income ~¥13,400/event.",
  },
  {
    id: "39b76122-ab9f-8149-a062-f3b712478f5e",
    memo: "Tested 6:1 guide ratio and monthly ¥100k goal; current model appears insufficient.",
  },
  {
    id: "39a76122-ab9f-80b2-bde1-df05deacc92e",
    memo: "Roles listed in meeting: accountant, events, Instagram, Meetup, booking, IT, sales, design, legal, etc.",
  },
  {
    id: "39a76122-ab9f-81a5-8f6b-ef55414a5c06",
    memo: "Initial audience segments defined for foreigners (residents/students/visitors) and Japanese users.",
  },
];

const NEW_TASKS = [
  {
    title: "Finalize company motto / 会社モットーを最終決定する",
    category: "Strategy & Governance",
    agenda: true,
    memo: "Candidates discussed: Discover yourself in others; Where curiosity becomes community; Meet, Share, Belong; etc.",
  },
  {
    title: "Document company concept and strengths / 会社コンセプトと強みを文書化する",
    category: "Strategy & Governance",
    memo: "Concept: Enjoy learning something new with other people + cultural exchange. Strengths: small events, safety.",
  },
  {
    title: "Define event safety standards / イベントの安全基準を定義する",
    category: "Operations & Systems",
    agenda: true,
    memo: "Safety is a stated strength, but the method to guarantee it is still undefined.",
  },
  {
    title: "Set small event pricing / 小規模イベントの価格設定を決める",
    category: "Finance",
    agenda: true,
    memo: "Small events are a strength, but pricing is not yet decided.",
  },
  {
    title: "Assign bank account opener / 銀行口座開設の担当者を決める",
    category: "Finance",
    agenda: true,
    memo: "Decision: open account in Japan. Open question: who is responsible.",
  },
  {
    title: "Establish weekly meeting cadence / 週次ミーティングの日程ルールを決める",
    category: "Operations & Systems",
    agenda: true,
    memo: "Ideal: once a week. Need a rule for how meetings are scheduled.",
  },
  {
    title: "Revisit revenue model for 100k/month / 月10万円目標の収益モデルを再検討する",
    category: "Finance",
    agenda: true,
    memo: "Current Matsuri-style model appears insufficient to reach ¥100,000/month.",
  },
  {
    title: "Develop themed event prototypes / テーマ別イベント案を具体化する",
    category: "Marketing & Research",
    memo: "Examples: French-culture event with French group member; engineer-focused event; high-level class.",
  },
];

async function main() {
  try {
    await archivePage("39b76122-ab9f-80b9-86b7-cbecf7bafea2");
    console.log("Archived empty task row");
  } catch {
    console.log("Skip archive (already done or missing)");
  }

  for (const task of DONE_TASKS) {
    await markDone(task.id, task.memo);
  }

  for (const task of NEW_TASKS) {
    await createTask(task);
  }

  console.log("\nCompleted task updates for 2026-07-12 meeting.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
