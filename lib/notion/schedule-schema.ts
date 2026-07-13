export const SCHEDULE_DRAFT_PROPERTIES = {
  title: "Title / 名前",
  category: "Category / カテゴリ",
  person: "Person / メンバー",
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
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface ScheduleApiResponse {
  drafts: ScheduleDraft[];
  confirmed: ConfirmedEvent[];
  meta: {
    fetchedAt: string;
    draftsCount: number;
    confirmedCount: number;
    draftDatabaseId: string;
    calendarDatabaseId: string;
  };
}

export const MEMBER_CALENDAR_TAGS: Record<ScheduleMember, string> = {
  Asaka: "🟡ASAKA",
  Theo: "🟢Theo",
  Makiko: "🔵MAKIKO",
};
