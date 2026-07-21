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
  getNumber,
  getRichText,
  getSelect,
  getTitle,
  getUrl,
} from "./parse-page-properties";

export const EVENT_SCHEDULE_PROPERTIES = {
  title: "イベント名",
  cafe: "カフェ",
  date: "日付",
  time: "時間",
  memo: "メモ",
  feeYen: "参加費",
  summary: "企画概要",
  audience: "対象者",
  capacity: "定員",
  meetupUrl: "Meetup URL",
  instagramUrl: "Instagram URL",
  venueNote: "場所補足",
  flow: "当日の流れ",
  notesForGuests: "持ちもの・注意",
  language: "言語",
  meetupSent: "Meetup文担当へ送付",
  instagramSent: "インスタ文担当へ送付",
  sentAt: "送付日",
  marketingDone: "マーケ完了",
} as const;

export type PlannedEvent = {
  id: string;
  title: string;
  cafe: string | null;
  date: string | null;
  time: string | null;
  memo: string | null;
  feeYen: number;
  summary: string | null;
  audience: string | null;
  capacity: number | null;
  meetupUrl: string | null;
  instagramUrl: string | null;
  venueNote: string | null;
  flow: string | null;
  notesForGuests: string | null;
  language: string | null;
  meetupSent: boolean;
  instagramSent: boolean;
  marketingDone: boolean;
  sentAt: string | null;
  url: string;
  meetupCopy: string;
  instagramCopy: string;
};

export type CreatePlannedEventInput = {
  title: string;
  date: string;
  time?: string | null;
  cafe?: string | null;
  summary?: string | null;
  feeYen?: number | null;
  capacity?: number | null;
  language?: string | null;
  audience?: string | null;
  venueNote?: string | null;
  meetupUrl?: string | null;
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

function languageLineEn(language: string | null): string | null {
  if (!language) return null;
  if (language === "英語メイン") return "Language: English-friendly";
  if (language === "日本語メイン") return "Language: Japanese-friendly";
  return "Language: bilingual (EN / JP)";
}

function languageLineJa(language: string | null): string | null {
  if (!language) return null;
  return `言語: ${language}`;
}

type CopyInput = {
  title: string;
  cafe: string | null;
  date: string | null;
  time: string | null;
  memo: string | null;
  feeYen: number;
  summary: string | null;
  audience: string | null;
  capacity: number | null;
  meetupUrl: string | null;
  venueNote: string | null;
  flow: string | null;
  notesForGuests: string | null;
  language: string | null;
};

export function buildMeetupCopy(input: CopyInput): string {
  const title = input.title.trim() || "ICL Meetup";
  const when = `${formatDateLabel(input.date)}${input.time ? ` · ${input.time}` : ""}`;
  const where = input.cafe?.trim() || "Tokyo (details in Meetup)";
  const pitch =
    input.summary?.trim() ||
    "Enjoy learning something new with other people — cultural exchange in Tokyo.";
  const audience =
    input.audience?.trim() || "Beginners welcome. No long speeches — just easy conversation.";

  return [
    `${title} | International Community Lab (ICL)`,
    "",
    pitch,
    "",
    `When: ${when} (JST)`,
    `Where: ${where}`,
    input.venueNote?.trim() ? `Meeting point: ${input.venueNote.trim()}` : null,
    formatEventFeeLineEn(input.feeYen),
    input.capacity != null ? `Capacity: about ${input.capacity}` : null,
    languageLineEn(input.language),
    "",
    audience,
    input.flow?.trim() ? "" : null,
    input.flow?.trim() ? `Flow: ${input.flow.trim()}` : null,
    input.notesForGuests?.trim() ? `Please note: ${input.notesForGuests.trim()}` : null,
    input.memo?.trim() ? `Note: ${input.memo.trim()}` : null,
    input.meetupUrl?.trim() ? "" : null,
    input.meetupUrl?.trim() ? `RSVP: ${input.meetupUrl.trim()}` : null,
    "",
    "Hosted by International Community Lab (ICL) · Tokyo",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildInstagramCopy(input: CopyInput): string {
  const title = input.title.trim() || "ICL Meetup";
  const when = `${formatDateLabelJa(input.date)}${input.time ? ` ${input.time}` : ""}`;
  const where = input.cafe?.trim() || "Tokyo";
  const pitch =
    input.summary?.trim() ||
    "人と一緒に新しいことを楽しみながら学ぶ。Cultural exchange meetup in Tokyo.";
  const rsvp = input.meetupUrl?.trim()
    ? `Details / RSVP → ${input.meetupUrl.trim()}`
    : "Details / RSVP → link in bio or Meetup";

  return [
    `${title}`,
    `${when} @ ${where}`,
    formatEventFeeLineJa(input.feeYen),
    languageLineJa(input.language),
    "",
    pitch,
    input.audience?.trim() ? input.audience.trim() : "Beginners welcome.",
    input.venueNote?.trim() ? `待ち合わせ: ${input.venueNote.trim()}` : null,
    "",
    rsvp,
    "",
    "#icl_tokyo #tokyomeetup #tokyoexpat #languageexchange #culturalexchange #新宿 #渋谷",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function parsePlannedEvent(page: PageObjectResponse): PlannedEvent {
  const title = getTitle(page.properties, EVENT_SCHEDULE_PROPERTIES.title);
  const cafe = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.cafe);
  const date = getDate(page.properties, EVENT_SCHEDULE_PROPERTIES.date).start;
  const time = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.time);
  const memo = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.memo);
  const feeYen =
    getNumber(page.properties, EVENT_SCHEDULE_PROPERTIES.feeYen) ?? DEFAULT_EVENT_FEE_YEN;
  const summary = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.summary);
  const audience = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.audience);
  const capacity = getNumber(page.properties, EVENT_SCHEDULE_PROPERTIES.capacity);
  const meetupUrl = getUrl(page.properties, EVENT_SCHEDULE_PROPERTIES.meetupUrl);
  const instagramUrl = getUrl(page.properties, EVENT_SCHEDULE_PROPERTIES.instagramUrl);
  const venueNote = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.venueNote);
  const flow = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.flow);
  const notesForGuests = getRichText(page.properties, EVENT_SCHEDULE_PROPERTIES.notesForGuests);
  const language = getSelect(page.properties, EVENT_SCHEDULE_PROPERTIES.language);
  const input: CopyInput = {
    title,
    cafe,
    date,
    time,
    memo,
    feeYen,
    summary,
    audience,
    capacity,
    meetupUrl,
    venueNote,
    flow,
    notesForGuests,
    language,
  };

  return {
    id: page.id,
    title,
    cafe,
    date,
    time,
    memo,
    feeYen,
    summary,
    audience,
    capacity,
    meetupUrl,
    instagramUrl,
    venueNote,
    flow,
    notesForGuests,
    language,
    meetupSent: getCheckbox(page.properties, EVENT_SCHEDULE_PROPERTIES.meetupSent),
    instagramSent: getCheckbox(page.properties, EVENT_SCHEDULE_PROPERTIES.instagramSent),
    marketingDone: getCheckbox(page.properties, EVENT_SCHEDULE_PROPERTIES.marketingDone),
    sentAt: getDate(page.properties, EVENT_SCHEDULE_PROPERTIES.sentAt).start,
    url: page.url,
    meetupCopy: buildMeetupCopy(input),
    instagramCopy: buildInstagramCopy(input),
  };
}

function todayKeyJst(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function richTextProperty(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return {
    rich_text: text
      ? [{ type: "text" as const, text: { content: text.slice(0, 2000) } }]
      : [],
  };
}

export async function fetchPlannedEvents(options?: {
  includeDone?: boolean;
}): Promise<PlannedEvent[]> {
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

  const todayKey = todayKeyJst();
  const includeDone = options?.includeDone ?? false;

  return results
    .map(parsePlannedEvent)
    .filter((event) => !event.date || event.date.slice(0, 10) >= todayKey)
    .filter((event) => includeDone || !event.marketingDone)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export async function createPlannedEvent(
  input: CreatePlannedEventInput,
): Promise<PlannedEvent> {
  const title = input.title.trim();
  const date = input.date.trim().slice(0, 10);
  if (!title) throw new Error("title is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must be YYYY-MM-DD");
  }

  const notion = getNotionClient();
  const databaseId = getEventScheduleDatabaseId();
  const feeYen = input.feeYen ?? DEFAULT_EVENT_FEE_YEN;

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [EVENT_SCHEDULE_PROPERTIES.title]: {
        title: [{ type: "text", text: { content: title.slice(0, 200) } }],
      },
      [EVENT_SCHEDULE_PROPERTIES.date]: {
        date: { start: date },
      },
      [EVENT_SCHEDULE_PROPERTIES.time]: richTextProperty(input.time),
      [EVENT_SCHEDULE_PROPERTIES.cafe]: richTextProperty(input.cafe),
      [EVENT_SCHEDULE_PROPERTIES.summary]: richTextProperty(input.summary),
      [EVENT_SCHEDULE_PROPERTIES.audience]: richTextProperty(input.audience),
      [EVENT_SCHEDULE_PROPERTIES.venueNote]: richTextProperty(input.venueNote),
      [EVENT_SCHEDULE_PROPERTIES.feeYen]: { number: feeYen },
      ...(input.capacity != null
        ? { [EVENT_SCHEDULE_PROPERTIES.capacity]: { number: input.capacity } }
        : {}),
      ...(input.language
        ? {
            [EVENT_SCHEDULE_PROPERTIES.language]: {
              select: { name: input.language },
            },
          }
        : {}),
      ...(input.meetupUrl?.trim()
        ? { [EVENT_SCHEDULE_PROPERTIES.meetupUrl]: { url: input.meetupUrl.trim() } }
        : {}),
      [EVENT_SCHEDULE_PROPERTIES.marketingDone]: { checkbox: false },
      [EVENT_SCHEDULE_PROPERTIES.meetupSent]: { checkbox: false },
      [EVENT_SCHEDULE_PROPERTIES.instagramSent]: { checkbox: false },
    },
  });

  if (!isFullPage(page)) {
    throw new Error("Created event page is not accessible");
  }

  return parsePlannedEvent(page);
}

export async function markMarketingSent(input: {
  eventId: string;
  channel: "meetup" | "instagram";
}): Promise<PlannedEvent> {
  const notion = getNotionClient();
  const todayKey = todayKeyJst();

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

export async function setMarketingDone(input: {
  eventId: string;
  done: boolean;
}): Promise<PlannedEvent> {
  const notion = getNotionClient();
  const page = await notion.pages.update({
    page_id: input.eventId,
    properties: {
      [EVENT_SCHEDULE_PROPERTIES.marketingDone]: { checkbox: input.done },
      ...(input.done
        ? {
            [EVENT_SCHEDULE_PROPERTIES.sentAt]: {
              date: { start: todayKeyJst() },
            },
          }
        : {}),
    },
  });

  if (!isFullPage(page)) {
    throw new Error("Updated event page is not accessible");
  }

  return parsePlannedEvent(page);
}
