import { isFullPage, type PageObjectResponse } from "@notionhq/client";
import {
  DEFAULT_EVENT_FEE_YEN,
  formatEventFeeLineEn,
  formatEventFeeLineJa,
} from "@/lib/event-pricing";
import { getNotionClient, getEventScheduleDatabaseId } from "./client";
import {
  getCheckbox,
  getDate,
  getRichText,
  getTitle,
} from "./parse-page-properties";

export const EVENT_SCHEDULE_PROPERTIES = {
  title: "イベント名",
  cafe: "カフェ",
  date: "日付",
  time: "時間",
  memo: "メモ",
  meetupSent: "Meetup文担当へ送付",
  instagramSent: "インスタ文担当へ送付",
  sentAt: "送付日",
} as const;

export type PlannedEvent = {
  id: string;
  title: string;
  cafe: string | null;
  date: string | null;
  time: string | null;
  memo: string | null;
  feeYen: number;
  meetupSent: boolean;
  instagramSent: boolean;
  sentAt: string | null;
  url: string;
  meetupCopy: string;
  instagramCopy: string;
};

const dataSourceIdCache = new Map<string, string>();

async function resolveDataSourceId(databaseId: string): Promise<string> {
  const cached = dataSourceIdCache.get(databaseId);
  if (cached) return cached;

  const notion = getNotionClient();
  const database = await notion.databases.retrieve({ database_id: databaseId });
  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  const dataSourceId = database.data_sources[0].id;
  dataSourceIdCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

function formatDateLabel(dateValue: string | null): string {
  if (!dateValue) return "TBD";
  const dateKey = dateValue.slice(0, 10);
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateLabelJa(dateValue: string | null): string {
  if (!dateValue) return "日付未定";
  const dateKey = dateValue.slice(0, 10);
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function buildMeetupCopy(input: {
  title: string;
  cafe: string | null;
  date: string | null;
  time: string | null;
  memo: string | null;
}): string {
  const title = input.title.trim() || "ICL Meetup";
  const when = `${formatDateLabel(input.date)}${input.time ? ` · ${input.time}` : ""}`;
  const where = input.cafe?.trim() || "Tokyo (details in Meetup)";
  const notes = input.memo?.trim();

  return [
    `${title} | International Community Lab (ICL)`,
    "",
    "Enjoy learning something new with other people — cultural exchange in Tokyo.",
    "",
    `When: ${when} (JST)`,
    `Where: ${where}`,
    formatEventFeeLineEn(),
    "",
    "Come say hi, practice languages, and meet people from different backgrounds.",
    "Beginners welcome. No long speeches — just easy conversation.",
    notes ? "" : null,
    notes ? `Note: ${notes}` : null,
    "",
    "Hosted by International Community Lab (ICL) · Tokyo",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildInstagramCopy(input: {
  title: string;
  cafe: string | null;
  date: string | null;
  time: string | null;
}): string {
  const title = input.title.trim() || "ICL Meetup";
  const when = `${formatDateLabelJa(input.date)}${input.time ? ` ${input.time}` : ""}`;
  const where = input.cafe?.trim() || "Tokyo";

  return [
    `${title}`,
    `${when} @ ${where}`,
    formatEventFeeLineJa(),
    "",
    "人と一緒に新しいことを楽しみながら学ぶ。",
    "Cultural exchange meetup in Tokyo — beginners welcome.",
    "",
    "Details / RSVP → link in bio or Meetup",
    "",
    "#icl_tokyo #tokyomeetup #tokyoexpat #languageexchange #culturalexchange #新宿 #渋谷",
  ].join("\n");
}

function parsePlannedEvent(page: PageObjectResponse): PlannedEvent {
  const title = getTitle(page.properties, EVENT_SCHEDULE_PROPERTIES.title);
  const cafe = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.cafe);
  const date = getDate(page.properties, EVENT_SCHEDULE_PROPERTIES.date).start;
  const time = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.time);
  const memo = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.memo);
  const input = { title, cafe, date, time, memo };

  return {
    id: page.id,
    title,
    cafe,
    date,
    time,
    memo,
    feeYen: DEFAULT_EVENT_FEE_YEN,
    meetupSent: getCheckbox(page.properties, EVENT_SCHEDULE_PROPERTIES.meetupSent),
    instagramSent: getCheckbox(page.properties, EVENT_SCHEDULE_PROPERTIES.instagramSent),
    sentAt: getDate(page.properties, EVENT_SCHEDULE_PROPERTIES.sentAt).start,
    url: page.url,
    meetupCopy: buildMeetupCopy(input),
    instagramCopy: buildInstagramCopy(input),
  };
}

export async function fetchPlannedEvents(): Promise<PlannedEvent[]> {
  const notion = getNotionClient();
  const databaseId = getEventScheduleDatabaseId();
  const dataSourceId = await resolveDataSourceId(databaseId);
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      sorts: [{ property: EVENT_SCHEDULE_PROPERTIES.date, direction: "ascending" }],
    });

    for (const page of response.results) {
      if (isFullPage(page)) results.push(page);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const todayKey = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return results
    .map(parsePlannedEvent)
    .filter((event) => !event.date || event.date.slice(0, 10) >= todayKey)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export async function markMarketingSent(input: {
  eventId: string;
  channel: "meetup" | "instagram";
}): Promise<PlannedEvent> {
  const notion = getNotionClient();
  const todayKey = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const checkboxProperty =
    input.channel === "meetup"
      ? EVENT_SCHEDULE_PROPERTIES.meetupSent
      : EVENT_SCHEDULE_PROPERTIES.instagramSent;

  const page = await notion.pages.update({
    page_id: input.eventId,
    properties: {
      [checkboxProperty]: { checkbox: true },
      [EVENT_SCHEDULE_PROPERTIES.sentAt]: {
        date: { start: todayKey },
      },
    },
  });

  if (!isFullPage(page)) {
    throw new Error("Updated event page is not accessible");
  }

  return parsePlannedEvent(page);
}
