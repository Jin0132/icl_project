import { getScheduleDateKey, toNotionNaiveDatetime } from "@/lib/notion/notion-datetime";
import type { ScheduleMember, HubFreeSlot } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";

/** 30分刻みの広域空き収集 */
export const HUB_SLOT_MINUTES = 30;
export const HUB_DAY_START_HOUR = 9;
export const HUB_DAY_END_HOUR = 22;

export const HUB_FREE_MEMO_PREFIX = "hub-slot:";
export const HUB_FREE_POLL_PREFIX = "hub:";

export type HubCalendarMode = "confirmed" | "input" | "team";

export type HubTimeSlot = {
  slotKey: string;
  start: string;
  end: string;
  label: string;
};

export type HubSlotHeat = {
  slotKey: string;
  start: string;
  end: string;
  label: string;
  dateKey: string;
  availableCount: number;
  totalMembers: number;
  rate: number;
  tier: "full" | "high" | "partial" | "none";
};

export function buildHubCollectionId(month: Date): string {
  const year = month.getFullYear();
  const monthIndex = month.getMonth() + 1;
  return `${HUB_FREE_POLL_PREFIX}${year}-${String(monthIndex).padStart(2, "0")}`;
}

export function buildHubSlotKey(start: string): string {
  return toNotionNaiveDatetime(start).slice(0, 16);
}

export function buildHubFreeMemo(collectionId: string, slotKey: string): string {
  return `${HUB_FREE_MEMO_PREFIX}${collectionId}:${slotKey}`;
}

export function parseHubFreeMemo(memo: string | null): {
  collectionId: string;
  slotKey: string;
} | null {
  if (!memo?.startsWith(HUB_FREE_MEMO_PREFIX)) return null;
  const rest = memo.slice(HUB_FREE_MEMO_PREFIX.length);
  // memo = hub-slot:hub:YYYY-MM:YYYY-MM-DDTHH:mm
  // collectionId 自体に ":" が含まれるため、先頭の ":" では分割しない
  const match = rest.match(/^(hub:\d{4}-\d{2}):(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/);
  if (match) {
    return { collectionId: match[1], slotKey: match[2] };
  }

  const slotMatch = rest.match(/:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/);
  if (!slotMatch) return null;

  const slotKey = slotMatch[1];
  const collectionId = rest.slice(0, -(slotKey.length + 1));
  if (!collectionId) return null;

  return { collectionId, slotKey };
}

export function slotEndFromStart(start: string): string {
  const naive = toNotionNaiveDatetime(start);
  const date = new Date(`${naive}+09:00`);
  date.setMinutes(date.getMinutes() + HUB_SLOT_MINUTES);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export function buildDayTimeSlots(dateKey: string): HubTimeSlot[] {
  const slots: HubTimeSlot[] = [];
  const totalMinutes = (HUB_DAY_END_HOUR - HUB_DAY_START_HOUR) * 60;

  for (let offset = 0; offset < totalMinutes; offset += HUB_SLOT_MINUTES) {
    const hour = HUB_DAY_START_HOUR + Math.floor(offset / 60);
    const minute = offset % 60;
    const start = `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
    const end = slotEndFromStart(start);
    const slotKey = buildHubSlotKey(start);

    slots.push({
      slotKey,
      start,
      end,
      label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    });
  }

  return slots;
}

export function buildMonthGrid(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  // Local calendar date — weekday 0=Sun matches WEEKDAYS ["日","月",…]
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
    const dateKey = inMonth
      ? `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`
      : "";

    return {
      index,
      dateKey,
      dayNumber: inMonth ? dayNumber : null,
      inMonth,
    };
  });
}

export function serializeHubFreeFromDraft(draft: {
  id: string;
  person: ScheduleMember | null;
  start: string;
  end: string | null;
  memo: string | null;
  isDatetime: boolean;
}): HubFreeSlot | null {
  const parsed = parseHubFreeMemo(draft.memo);
  if (!parsed || !draft.person) return null;

  return {
    id: draft.id,
    person: draft.person,
    start: draft.start,
    end: draft.end ?? slotEndFromStart(draft.start),
    collectionId: parsed.collectionId,
    slotKey: parsed.slotKey,
    dateKey: getScheduleDateKey(draft.start, draft.isDatetime),
  };
}

export function buildSlotHeatMap(
  slots: HubTimeSlot[],
  freeSlots: HubFreeSlot[],
  dateKey: string,
): HubSlotHeat[] {
  const totalMembers = SCHEDULE_MEMBERS.length;

  return slots.map((slot) => {
    const voters = new Set(
      freeSlots
        .filter((item) => item.slotKey === slot.slotKey && item.dateKey === dateKey)
        .map((item) => item.person),
    );
    const availableCount = voters.size;
    const rate = totalMembers > 0 ? availableCount / totalMembers : 0;

    let tier: HubSlotHeat["tier"] = "none";
    if (availableCount === 0) tier = "none";
    else if (rate >= 1) tier = "full";
    else if (rate >= 0.5) tier = "high";
    else tier = "partial";

    return {
      slotKey: slot.slotKey,
      start: slot.start,
      end: slot.end,
      label: slot.label,
      dateKey,
      availableCount,
      totalMembers,
      rate,
      tier,
    };
  });
}

export function getSlotHeatClasses(tier: HubSlotHeat["tier"], selected: boolean): string {
  if (selected) {
    return "border-emerald-400 bg-emerald-500 text-white ring-2 ring-emerald-300";
  }

  switch (tier) {
    case "full":
      return "border-blue-300 bg-blue-50 text-blue-800 shadow-[0_0_14px_rgba(147,197,253,0.45)] ring-1 ring-blue-200";
    case "high":
      return "border-sky-200 bg-sky-50/90 text-sky-800 ring-1 ring-sky-100";
    case "partial":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50";
  }
}

export function getDayHeatSummary(
  dateKey: string,
  freeSlots: HubFreeSlot[],
): { maxRate: number; maxCount: number; slotCount: number } {
  const daySlots = buildDayTimeSlots(dateKey);
  const heat = buildSlotHeatMap(daySlots, freeSlots, dateKey);
  const maxCount = heat.reduce((max, slot) => Math.max(max, slot.availableCount), 0);
  const maxRate = heat.reduce((max, slot) => Math.max(max, slot.rate), 0);
  const slotCount = heat.filter((slot) => slot.availableCount > 0).length;

  return { maxRate, maxCount, slotCount };
}

export function getDayHeatCellClasses(maxRate: number, hasActivity: boolean): string {
  if (!hasActivity) return "border-transparent bg-transparent";
  if (maxRate >= 1) {
    return "border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50 shadow-[0_0_16px_rgba(147,197,253,0.4)] ring-1 ring-blue-200";
  }
  if (maxRate >= 0.5) {
    return "border-sky-200 bg-sky-50/80 ring-1 ring-sky-100";
  }
  if (maxRate > 0) {
    return "border-slate-200 bg-slate-50/90";
  }
  return "border-slate-100 bg-white";
}
