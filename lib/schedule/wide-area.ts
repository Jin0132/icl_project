import {
  formatScheduleTimeRange,
  getScheduleDateKey,
} from "@/lib/notion/notion-datetime";
import type { ScheduleDraft, ScheduleMember } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import {
  getDeclineGroupKey,
  getMemberSlotRsvpStatus,
  isDeclineDraft,
  type MemberRsvpStatus,
} from "@/lib/notion/schedule-rsvp";

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type WideAreaSlot = {
  id: string;
  candidate: ScheduleDraft;
  dateKey: string;
  timeLabel: string;
};

/** カレンダー1日分のヒートマップ情報 */
export type CalendarDayHeat = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  slots: WideAreaSlot[];
  availableCount: number;
  eligibleCount: number;
  rate: number;
  tier: "full" | "high" | "partial" | "none" | "empty";
  bestSlotId: string | null;
};

export type WideAreaCalendarModel = {
  monthLabel: string;
  days: CalendarDayHeat[];
  topDateKeys: string[];
  memberVotes: Map<string, Set<ScheduleMember>>;
};

export function buildMonthGrid(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
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

    return { dateKey, dayNumber: inMonth ? dayNumber : 0, inMonth };
  });
}

function computeSlotHeat(
  slots: WideAreaSlot[],
  groupDrafts: ScheduleDraft[],
  groupKey: string,
  availabilityByCandidate: Map<string, ScheduleDraft[]>,
  members: readonly ScheduleMember[],
) {
  const memberVotes = new Map<string, Set<ScheduleMember>>();

  for (const slot of slots) {
    const availability = availabilityByCandidate.get(slot.id) ?? [];
    const voters = new Set<ScheduleMember>();

    for (const member of members) {
      const status = getMemberSlotRsvpStatus(groupDrafts, groupKey, member, availability);
      if (status === "available") {
        voters.add(member);
      }
    }

    memberVotes.set(slot.id, voters);
  }

  return memberVotes;
}

function tierForRate(rate: number, availableCount: number): CalendarDayHeat["tier"] {
  if (availableCount === 0) return "none";
  if (rate >= 1) return "full";
  if (rate >= 0.5) return "high";
  return "partial";
}

export function buildWideAreaCalendarModel({
  month,
  candidates,
  groupDrafts,
  groupKey,
  availabilityByCandidate,
  members = SCHEDULE_MEMBERS,
}: {
  month: Date;
  candidates: ScheduleDraft[];
  groupDrafts: ScheduleDraft[];
  groupKey: string;
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  members?: readonly ScheduleMember[];
}): WideAreaCalendarModel {
  const slots: WideAreaSlot[] = [...candidates]
    .sort((left, right) => left.start.localeCompare(right.start))
    .map((candidate) => ({
      id: candidate.id,
      candidate,
      dateKey: getScheduleDateKey(candidate.start, candidate.isDatetime),
      timeLabel: formatScheduleTimeRange(
        candidate.start,
        candidate.end,
        candidate.isDatetime,
      ),
    }));

  const slotsByDate = new Map<string, WideAreaSlot[]>();
  for (const slot of slots) {
    const list = slotsByDate.get(slot.dateKey) ?? [];
    list.push(slot);
    slotsByDate.set(slot.dateKey, list);
  }

  const memberVotes = computeSlotHeat(
    slots,
    groupDrafts,
    groupKey,
    availabilityByCandidate,
    members,
  );

  const grid = buildMonthGrid(month);
  const eligibleCount = members.filter(
    (member) =>
      !groupDrafts.some(
        (draft) =>
          isDeclineDraft(draft) &&
          draft.person === member &&
          getDeclineGroupKey(draft) === groupKey,
      ),
  ).length;

  const days: CalendarDayHeat[] = grid.map((cell) => {
    if (!cell.inMonth) {
      return {
        dateKey: cell.dateKey,
        dayNumber: cell.dayNumber,
        inMonth: false,
        slots: [],
        availableCount: 0,
        eligibleCount,
        rate: 0,
        tier: "empty",
        bestSlotId: null,
      };
    }

    const daySlots = slotsByDate.get(cell.dateKey) ?? [];

    if (daySlots.length === 0) {
      return {
        dateKey: cell.dateKey,
        dayNumber: cell.dayNumber,
        inMonth: true,
        slots: [],
        availableCount: 0,
        eligibleCount,
        rate: 0,
        tier: "empty",
        bestSlotId: null,
      };
    }

    let bestRate = 0;
    let bestCount = 0;
    let bestSlotId: string | null = null;

    for (const slot of daySlots) {
      const count = memberVotes.get(slot.id)?.size ?? 0;
      const rate = eligibleCount > 0 ? count / eligibleCount : 0;

      if (count > bestCount || (count === bestCount && rate > bestRate)) {
        bestCount = count;
        bestRate = rate;
        bestSlotId = slot.id;
      }
    }

    return {
      dateKey: cell.dateKey,
      dayNumber: cell.dayNumber,
      inMonth: true,
      slots: daySlots,
      availableCount: bestCount,
      eligibleCount,
      rate: bestRate,
      tier: tierForRate(bestRate, bestCount),
      bestSlotId,
    };
  });

  const maxRate = days.reduce((max, day) => Math.max(max, day.rate), 0);
  const topDateKeys =
    maxRate > 0
      ? days
          .filter((day) => day.inMonth && day.slots.length > 0 && day.rate === maxRate)
          .map((day) => day.dateKey)
      : [];

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
  }).format(month);

  return { monthLabel, days, topDateKeys, memberVotes };
}

export function getCalendarDayHeatClasses(
  tier: CalendarDayHeat["tier"],
  isTop: boolean,
  isSelectedByMember: boolean,
): string {
  const selectedRing = isSelectedByMember
    ? "ring-2 ring-emerald-400 ring-offset-1"
    : "";

  switch (tier) {
    case "full":
      return `border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50 shadow-[0_0_20px_rgba(147,197,253,0.45)] ${isTop ? "ring-2 ring-blue-300" : "ring-1 ring-blue-200"} ${selectedRing}`;
    case "high":
      return `border-sky-200 bg-sky-50/80 ring-1 ring-sky-200/80 ${selectedRing}`;
    case "partial":
      return `border-slate-200 bg-slate-50/90 ring-1 ring-slate-100 ${selectedRing}`;
    case "none":
      return `border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/80 ${selectedRing}`;
    default:
      return "border-transparent bg-transparent";
  }
}

export function memberVotedOnDate(
  model: WideAreaCalendarModel,
  dateKey: string,
  member: ScheduleMember,
): boolean {
  const day = model.days.find((item) => item.dateKey === dateKey);
  if (!day) return false;

  return day.slots.some((slot) => model.memberVotes.get(slot.id)?.has(member));
}

export function getDefaultCalendarMonth(candidates: ScheduleDraft[]): Date {
  if (candidates.length === 0) {
    return new Date();
  }

  const first = candidates[0];
  const dateKey = getScheduleDateKey(first.start, first.isDatetime);
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

/** モック用 */
export type MockCalendarVoteKey = `${string}:${ScheduleMember}`;

export type MockWideAreaCalendarState = {
  pollTitle: string;
  month: Date;
  slots: Array<{ id: string; dateKey: string; timeLabel: string }>;
  votes: Set<MockCalendarVoteKey>;
};

export function createInitialMockCalendarState(): MockWideAreaCalendarState {
  return {
    pollTitle: "7月定例MTG（サンプル）",
    month: new Date(2026, 6, 1),
    slots: [
      { id: "mock-1", dateKey: "2026-07-17", timeLabel: "18:00–19:00" },
      { id: "mock-2", dateKey: "2026-07-21", timeLabel: "12:00–13:00" },
      { id: "mock-3", dateKey: "2026-07-24", timeLabel: "17:30–18:30" },
      { id: "mock-4", dateKey: "2026-07-26", timeLabel: "10:00–11:00" },
    ],
    votes: new Set<MockCalendarVoteKey>([
      "mock-1:Asaka",
      "mock-1:Theo",
      "mock-1:Makiko",
      "mock-2:Makiko",
      "mock-3:Asaka",
      "mock-3:Theo",
      "mock-3:Makiko",
      "mock-4:Asaka",
    ]),
  };
}

export function mockCalendarVoteKey(
  slotId: string,
  member: ScheduleMember,
): MockCalendarVoteKey {
  return `${slotId}:${member}`;
}

export function buildMockCalendarModel(
  state: MockWideAreaCalendarState,
): WideAreaCalendarModel {
  const slotsByDate = new Map<string, typeof state.slots>();
  for (const slot of state.slots) {
    const list = slotsByDate.get(slot.dateKey) ?? [];
    list.push(slot);
    slotsByDate.set(slot.dateKey, list);
  }

  const memberVotes = new Map<string, Set<ScheduleMember>>();
  for (const slot of state.slots) {
    const voters = new Set<ScheduleMember>();
    for (const member of SCHEDULE_MEMBERS) {
      if (state.votes.has(mockCalendarVoteKey(slot.id, member))) {
        voters.add(member);
      }
    }
    memberVotes.set(slot.id, voters);
  }

  const eligibleCount = SCHEDULE_MEMBERS.length;
  const grid = buildMonthGrid(state.month);

  const days: CalendarDayHeat[] = grid.map((cell) => {
    if (!cell.inMonth) {
      return {
        dateKey: cell.dateKey,
        dayNumber: cell.dayNumber,
        inMonth: false,
        slots: [],
        availableCount: 0,
        eligibleCount,
        rate: 0,
        tier: "empty",
        bestSlotId: null,
      };
    }

    const daySlots = (slotsByDate.get(cell.dateKey) ?? []).map((slot) => ({
      id: slot.id,
      dateKey: slot.dateKey,
      timeLabel: slot.timeLabel,
      candidate: {} as ScheduleDraft,
    }));

    if (daySlots.length === 0) {
      return {
        dateKey: cell.dateKey,
        dayNumber: cell.dayNumber,
        inMonth: true,
        slots: [],
        availableCount: 0,
        eligibleCount,
        rate: 0,
        tier: "empty",
        bestSlotId: null,
      };
    }

    let bestCount = 0;
    let bestRate = 0;
    let bestSlotId: string | null = null;

    for (const slot of daySlots) {
      const count = memberVotes.get(slot.id)?.size ?? 0;
      const rate = count / eligibleCount;
      if (count > bestCount) {
        bestCount = count;
        bestRate = rate;
        bestSlotId = slot.id;
      }
    }

    return {
      dateKey: cell.dateKey,
      dayNumber: cell.dayNumber,
      inMonth: true,
      slots: daySlots,
      availableCount: bestCount,
      eligibleCount,
      rate: bestRate,
      tier: tierForRate(bestRate, bestCount),
      bestSlotId,
    };
  });

  const maxRate = days.reduce((max, day) => Math.max(max, day.rate), 0);
  const topDateKeys =
    maxRate > 0
      ? days
          .filter((day) => day.inMonth && day.slots.length > 0 && day.rate === maxRate)
          .map((day) => day.dateKey)
      : [];

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
  }).format(state.month);

  return { monthLabel, days, topDateKeys, memberVotes };
}

export function toggleMockCalendarVote(
  state: MockWideAreaCalendarState,
  dateKey: string,
  member: ScheduleMember,
): MockWideAreaCalendarState {
  const daySlots = state.slots.filter((slot) => slot.dateKey === dateKey);
  if (daySlots.length === 0) return state;

  const votes = new Set(state.votes);
  const allVoted = daySlots.every((slot) =>
    votes.has(mockCalendarVoteKey(slot.id, member)),
  );

  for (const slot of daySlots) {
    const key = mockCalendarVoteKey(slot.id, member);
    if (allVoted) {
      votes.delete(key);
    } else {
      votes.add(key);
    }
  }

  return { ...state, votes };
}

export function getMemberSlotStatusOnDay(
  model: WideAreaCalendarModel,
  dateKey: string,
  member: ScheduleMember,
): MemberRsvpStatus {
  const day = model.days.find((item) => item.dateKey === dateKey);
  if (!day || day.slots.length === 0) return "pending";

  const voted = day.slots.some((slot) => model.memberVotes.get(slot.id)?.has(member));
  return voted ? "available" : "pending";
}
