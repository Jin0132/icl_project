export const SCHEDULE_DRAFT_PROPERTIES = {
  title: "Title / 名前",
  category: "Category / カテゴリ",
  person: "Person / メンバー",
  creator: "Created by / 作成者",
  date: "Date / 日時",
  type: "Type / 種別",
  status: "Status / ステータス",
  poll: "Poll / 調整ID",
  memo: "Memo / メモ",
} as const;

export const CALENDAR_PROPERTIES = {
  name: "Name",
  date: "Date",
  tags: "Tags",
  location: "場所",
} as const;

export const SCHEDULE_CATEGORIES = [
  "MTG / 定例MTG",
  "Event / イベント",
  "Other / その他",
] as const;

export const SCHEDULE_MEMBERS = ["Asaka", "Theo", "Makiko"] as const;

export const SCHEDULE_DRAFT_TYPES = [
  "Candidate / 候補",
  "Available / 参加可能",
] as const;

export const SCHEDULE_DRAFT_STATUSES = [
  "Draft / 下書き",
  "Open / 調整中",
  "Confirmed / 確定",
  "Cancelled / 取消",
] as const;

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];
export type ScheduleMember = (typeof SCHEDULE_MEMBERS)[number];
export type ScheduleDraftType = (typeof SCHEDULE_DRAFT_TYPES)[number];
export type ScheduleDraftStatus = (typeof SCHEDULE_DRAFT_STATUSES)[number];

export interface ScheduleDraft {
  id: string;
  title: string;
  category: ScheduleCategory | null;
  person: ScheduleMember | null;
  creator: ScheduleMember | null;
  start: string;
  end: string | null;
  isDatetime: boolean;
  type: ScheduleDraftType | null;
  status: ScheduleDraftStatus | null;
  pollId: string | null;
  memo: string | null;
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface ConfirmedEvent {
  id: string;
  name: string;
  start: string;
  end: string | null;
  isDatetime: boolean;
  tags: string[];
  /** Notion「場所」プロパティ（name / address） */
  location: string | null;
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface HubFreeSlot {
  id: string;
  person: ScheduleMember;
  start: string;
  end: string;
  collectionId: string;
  slotKey: string;
  dateKey: string;
}

export interface ScheduleApiResponse {
  drafts: ScheduleDraft[];
  confirmed: ConfirmedEvent[];
  hubFree: HubFreeSlot[];
  meta: {
    fetchedAt: string;
    draftsCount: number;
    confirmedCount: number;
    hubFreeCount: number;
    draftDatabaseId: string;
    calendarDatabaseId: string;
  };
}

export const MEMBER_CALENDAR_TAGS: Record<ScheduleMember, string> = {
  Asaka: "🟡ASAKA",
  Theo: "🟢Theo",
  Makiko: "🔵MAKIKO",
};

/** アプリの「確定」ボタン経由で作成されたカレンダー行のみに付与 */
export const APP_CONFIRMED_CALENDAR_TAG = "ICL-App";

const MEMBER_NAME_PATTERN = SCHEDULE_MEMBERS.join("|");

/** タイトル末尾の「— 作成者名」を除去（旧データ互換） */
export function normalizeScheduleEventTitle(title: string): string {
  const pattern = new RegExp(`\\s*[—–-]\\s*(${MEMBER_NAME_PATTERN})\\s*$`, "i");
  return title.replace(pattern, "").trim();
}

export function getScheduleDraftGroupKey(draft: Pick<ScheduleDraft, "id" | "pollId" | "title">): string {
  const poll = draft.pollId ?? draft.id;
  const title = normalizeScheduleEventTitle(draft.title).toLowerCase();
  return `${poll}::${title}`;
}
