import { Client } from "@notionhq/client";

let notionClient: Client | null = null;

export function getNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set in environment variables");
  }

  if (!notionClient) {
    notionClient = new Client({ auth: apiKey });
  }

  return notionClient;
}

export function getProjectDatabaseId(): string {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not set in environment variables");
  }

  return databaseId;
}

export function getProjectDataSourceId(): string | null {
  return process.env.NOTION_DATA_SOURCE_ID ?? null;
}

export function getScheduleDraftDatabaseId(): string {
  const databaseId = process.env.NOTION_SCHEDULE_DRAFT_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_SCHEDULE_DRAFT_DATABASE_ID is not set in environment variables",
    );
  }

  return databaseId;
}

export function getCalendarDatabaseId(): string {
  const databaseId = process.env.NOTION_CALENDAR_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_CALENDAR_DATABASE_ID is not set in environment variables",
    );
  }

  return databaseId;
}

/** Meeting Minutes parent page under ICL Master */
export function getMeetingMinutesParentId(): string {
  return (
    process.env.NOTION_MEETING_MINUTES_PARENT_ID ??
    "39876122-ab9f-80b7-bc8b-d4155bc5d50c"
  );
}

/** イベント日程・カフェ確定表（マーケ投稿用） */
export function getEventScheduleDatabaseId(): string {
  return (
    process.env.NOTION_EVENT_SCHEDULE_DATABASE_ID ??
    "bc3bd5c6-1f1a-4d9c-a946-9f37b250a350"
  );
}
