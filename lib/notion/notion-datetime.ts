export const NOTION_TIME_ZONE = "Asia/Tokyo";

const NAIVE_DATETIME_RE =
  /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

const OFFSET_DATETIME_RE = /(Z|[+-]\d{2}:\d{2})$/;

export function isDatetimeValue(value: string): boolean {
  return value.includes("T") || value.includes(" ");
}

/** Web/Notion へ書き込む日時は常に日本時間の素の文字列として扱う */
export function toNotionNaiveDatetime(value: string): string {
  const normalized = value.trim().replace(" ", "T");

  if (!OFFSET_DATETIME_RE.test(normalized)) {
    const match = normalized.match(NAIVE_DATETIME_RE);
    if (match) {
      const [, date, hour = "00", minute = "00", second = "00"] = match;
      return `${date}T${hour}:${minute}:${second ?? "00"}`;
    }
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized.replace(/\.\d+/, "").replace(OFFSET_DATETIME_RE, "").slice(0, 19);
  }

  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: NOTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return formatted.replace(" ", "T");
}

export function toNotionDateOnly(value: string): string {
  if (!isDatetimeValue(value)) {
    return value.slice(0, 10);
  }

  return toNotionNaiveDatetime(value).slice(0, 10);
}

export function buildNotionDateProperty(
  start: string,
  end: string | null,
  isDatetime: boolean,
  propertyName: string,
) {
  if (!isDatetime) {
    return {
      [propertyName]: {
        date: {
          start: toNotionDateOnly(start),
          end: end ? toNotionDateOnly(end) : undefined,
        },
      },
    };
  }

  return {
    [propertyName]: {
      date: {
        start: toNotionNaiveDatetime(start),
        end: end ? toNotionNaiveDatetime(end) : undefined,
        time_zone: NOTION_TIME_ZONE,
      },
    },
  };
}

function toJapanDate(value: string, isDatetime: boolean): Date {
  const normalized = value.trim().replace(" ", "T");

  if (!isDatetime) {
    return new Date(`${normalized.slice(0, 10)}T12:00:00+09:00`);
  }

  if (OFFSET_DATETIME_RE.test(normalized)) {
    return new Date(normalized);
  }

  const naive = toNotionNaiveDatetime(normalized);
  return new Date(`${naive}+09:00`);
}

/** 画面表示は常に日本時間 */
export function formatScheduleDateTime(value: string, isDatetime: boolean): string {
  const date = toJapanDate(value, isDatetime);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (isDatetime) {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: NOTION_TIME_ZONE,
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: NOTION_TIME_ZONE,
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatScheduleDateLabel(value: string, isDatetime: boolean): string {
  const date = toJapanDate(value, isDatetime);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: NOTION_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatScheduleTimeOnly(value: string, isDatetime: boolean): string {
  const date = toJapanDate(value, isDatetime);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (!isDatetime) {
    return "終日";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: NOTION_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatScheduleTimeRange(
  start: string,
  end: string | null,
  isDatetime: boolean,
): string {
  const startLabel = formatScheduleTimeOnly(start, isDatetime);
  if (!end || !isDatetime) {
    return startLabel;
  }

  return `${startLabel}–${formatScheduleTimeOnly(end, isDatetime)}`;
}

export function getScheduleDateKey(value: string, isDatetime: boolean): string {
  const date = toJapanDate(value, isDatetime);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: NOTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export type AppEventCategory = "MTG" | "Event" | "Other";

/** アプリから確定したイベントのみ（[MTG] / [Event] / [Other] プレフィックス + ICL-App タグ） */
export function isAppConfirmedEvent(name: string, tags: string[] = []): boolean {
  return (
    /^\[(MTG|Event|Other)\]\s/.test(name) &&
    tags.includes("ICL-App")
  );
}

export function parseAppEventCategory(name: string): AppEventCategory | null {
  const match = name.match(/^\[(MTG|Event|Other)\]\s/);
  return match ? (match[1] as AppEventCategory) : null;
}

export function stripAppEventPrefix(name: string): string {
  return name.replace(/^\[(MTG|Event|Other)\]\s/, "");
}
