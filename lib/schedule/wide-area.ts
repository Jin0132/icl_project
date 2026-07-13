import {
  formatScheduleDateLabel,
  formatScheduleTimeRange,
  getScheduleDateKey,
} from "@/lib/notion/notion-datetime";
import type { ScheduleDraft, ScheduleMember } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import {
  getMemberSlotRsvpStatus,
  type MemberRsvpStatus,
} from "@/lib/notion/schedule-rsvp";

/** 広域調整モード用：列＝候補スロット、行＝メンバー */
export type WideAreaSlot = {
  id: string;
  candidate: ScheduleDraft;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  columnLabel: string;
};

export type WideAreaCell = {
  slotId: string;
  member: ScheduleMember;
  status: MemberRsvpStatus;
};

export type HeatTier = "top" | "high" | "mid" | "low" | "none";

export type WideAreaColumnHeat = {
  slotId: string;
  availableCount: number;
  eligibleCount: number;
  rate: number;
  tier: HeatTier;
};

export type WideAreaMatrixModel = {
  slots: WideAreaSlot[];
  cells: WideAreaCell[];
  columnHeat: WideAreaColumnHeat[];
  topSlotIds: string[];
};

export function buildWideAreaMatrix({
  candidates,
  groupDrafts,
  groupKey,
  availabilityByCandidate,
  members = SCHEDULE_MEMBERS,
}: {
  candidates: ScheduleDraft[];
  groupDrafts: ScheduleDraft[];
  groupKey: string;
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  members?: readonly ScheduleMember[];
}): WideAreaMatrixModel {
  const slots: WideAreaSlot[] = [...candidates]
    .sort((left, right) => left.start.localeCompare(right.start))
    .map((candidate) => {
      const dateKey = getScheduleDateKey(candidate.start, candidate.isDatetime);
      const dateLabel = formatScheduleDateLabel(candidate.start, candidate.isDatetime);
      const timeLabel = formatScheduleTimeRange(
        candidate.start,
        candidate.end,
        candidate.isDatetime,
      );

      return {
        id: candidate.id,
        candidate,
        dateKey,
        dateLabel,
        timeLabel,
        columnLabel: `${dateLabel} ${timeLabel}`,
      };
    });

  const cells: WideAreaCell[] = [];

  for (const slot of slots) {
    const availability = availabilityByCandidate.get(slot.id) ?? [];

    for (const member of members) {
      cells.push({
        slotId: slot.id,
        member,
        status: getMemberSlotRsvpStatus(groupDrafts, groupKey, member, availability),
      });
    }
  }

  const columnHeat = slots.map((slot) => {
    const slotCells = cells.filter((cell) => cell.slotId === slot.id);
    const eligibleCount = slotCells.filter((cell) => cell.status !== "declined").length;
    const availableCount = slotCells.filter((cell) => cell.status === "available").length;
    const rate = eligibleCount > 0 ? availableCount / eligibleCount : 0;

    return {
      slotId: slot.id,
      availableCount,
      eligibleCount,
      rate,
      tier: "none" as HeatTier,
    };
  });

  const maxCount = columnHeat.reduce(
    (max, column) => Math.max(max, column.availableCount),
    0,
  );

  const topSlotIds =
    maxCount > 0
      ? columnHeat.filter((column) => column.availableCount === maxCount).map((column) => column.slotId)
      : [];

  for (const column of columnHeat) {
    if (column.availableCount === 0) {
      column.tier = "none";
    } else if (column.availableCount === maxCount && maxCount > 0) {
      column.tier = "top";
    } else if (column.rate >= 0.5) {
      column.tier = "high";
    } else if (column.availableCount === 1) {
      column.tier = "low";
    } else {
      column.tier = "mid";
    }
  }

  return { slots, cells, columnHeat, topSlotIds };
}

export function getColumnHeatClasses(tier: HeatTier): string {
  switch (tier) {
    case "top":
      return "bg-blue-50/90 ring-2 ring-blue-200 shadow-[0_0_22px_rgba(147,197,253,0.45)]";
    case "high":
      return "bg-sky-50/70 ring-1 ring-sky-200";
    case "low":
      return "bg-rose-50/50 ring-1 ring-rose-200/80";
    case "mid":
      return "bg-slate-50/80 ring-1 ring-slate-200";
    default:
      return "bg-white ring-1 ring-slate-100";
  }
}

export function getCellStatusClasses(status: MemberRsvpStatus, isTopColumn: boolean): string {
  const base =
    status === "available"
      ? "border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600"
      : status === "declined"
        ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50";

  if (isTopColumn && status === "available") {
    return `${base} shadow-[0_0_12px_rgba(52,211,153,0.35)]`;
  }

  if (isTopColumn && status === "pending") {
    return "border-blue-200 bg-blue-50/60 text-slate-500 hover:bg-blue-100/80";
  }

  return base;
}

/** フロント単体検証用モック（Notion API なしでヒートマップ動作を確認） */
export type MockWideAreaVoteKey = `${string}:${ScheduleMember}`;

export type MockWideAreaState = {
  pollTitle: string;
  slots: Array<{ id: string; dateLabel: string; timeLabel: string }>;
  votes: Set<MockWideAreaVoteKey>;
  declines: Set<ScheduleMember>;
};

export function createInitialMockWideAreaState(): MockWideAreaState {
  return {
    pollTitle: "7月定例MTG（サンプル）",
    slots: [
      { id: "mock-slot-1", dateLabel: "7月17日(木)", timeLabel: "18:00–19:00" },
      { id: "mock-slot-2", dateLabel: "7月21日(月)", timeLabel: "12:00–13:00" },
      { id: "mock-slot-3", dateLabel: "7月24日(金)", timeLabel: "17:30–18:30" },
      { id: "mock-slot-4", dateLabel: "7月26日(日)", timeLabel: "10:00–11:00" },
    ],
    votes: new Set<MockWideAreaVoteKey>([
      "mock-slot-1:Asaka",
      "mock-slot-1:Theo",
      "mock-slot-2:Makiko",
      "mock-slot-3:Asaka",
      "mock-slot-3:Theo",
      "mock-slot-3:Makiko",
      "mock-slot-4:Asaka",
    ]),
    declines: new Set(),
  };
}

export function mockVoteKey(slotId: string, member: ScheduleMember): MockWideAreaVoteKey {
  return `${slotId}:${member}`;
}

export function buildMockWideAreaMatrix(state: MockWideAreaState): WideAreaMatrixModel {
  const slots: WideAreaSlot[] = state.slots.map((slot) => ({
    id: slot.id,
    candidate: {
      id: slot.id,
      title: state.pollTitle,
      category: "MTG / 定例MTG",
      person: "Theo",
      creator: "Theo",
      start: slot.dateLabel,
      end: null,
      isDatetime: true,
      type: "Candidate / 候補",
      status: "Open / 調整中",
      pollId: "mock-poll",
      memo: null,
      url: "",
      createdTime: "",
      lastEditedTime: "",
    },
    dateKey: slot.id,
    dateLabel: slot.dateLabel,
    timeLabel: slot.timeLabel,
    columnLabel: `${slot.dateLabel} ${slot.timeLabel}`,
  }));

  const cells: WideAreaCell[] = [];

  for (const slot of slots) {
    for (const member of SCHEDULE_MEMBERS) {
      const status: MemberRsvpStatus = state.declines.has(member)
        ? "declined"
        : state.votes.has(mockVoteKey(slot.id, member))
          ? "available"
          : "pending";

      cells.push({ slotId: slot.id, member, status });
    }
  }

  const columnHeat = slots.map((slot) => {
    const slotCells = cells.filter((cell) => cell.slotId === slot.id);
    const eligibleCount = slotCells.filter((cell) => cell.status !== "declined").length;
    const availableCount = slotCells.filter((cell) => cell.status === "available").length;
    const rate = eligibleCount > 0 ? availableCount / eligibleCount : 0;

    return {
      slotId: slot.id,
      availableCount,
      eligibleCount,
      rate,
      tier: "none" as HeatTier,
    };
  });

  const maxCount = columnHeat.reduce(
    (max, column) => Math.max(max, column.availableCount),
    0,
  );

  const topSlotIds =
    maxCount > 0
      ? columnHeat.filter((column) => column.availableCount === maxCount).map((column) => column.slotId)
      : [];

  for (const column of columnHeat) {
    if (column.availableCount === 0) {
      column.tier = "none";
    } else if (column.availableCount === maxCount && maxCount > 0) {
      column.tier = "top";
    } else if (column.rate >= 0.5) {
      column.tier = "high";
    } else if (column.availableCount === 1) {
      column.tier = "low";
    } else {
      column.tier = "mid";
    }
  }

  return { slots, cells, columnHeat, topSlotIds };
}

export function toggleMockVote(
  state: MockWideAreaState,
  slotId: string,
  member: ScheduleMember,
): MockWideAreaState {
  const key = mockVoteKey(slotId, member);
  const votes = new Set(state.votes);

  if (state.declines.has(member)) {
    const declines = new Set(state.declines);
    declines.delete(member);
    return { ...state, declines };
  }

  if (votes.has(key)) {
    votes.delete(key);
  } else {
    votes.add(key);
  }

  return { ...state, votes };
}
