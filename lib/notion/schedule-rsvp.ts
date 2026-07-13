import {
  getScheduleDraftGroupKey,
  SCHEDULE_MEMBERS,
  type ScheduleDraft,
  type ScheduleMember,
} from "./schedule-schema";

export type MemberRsvpStatus = "pending" | "available" | "declined";

export function isDeclineDraft(draft: ScheduleDraft): boolean {
  return draft.memo?.startsWith("decline:") ?? false;
}

export function getDeclineGroupKey(draft: ScheduleDraft): string | null {
  if (!isDeclineDraft(draft) || !draft.memo) {
    return null;
  }

  return draft.memo.slice("decline:".length);
}

export function buildDeclineMemo(groupKey: string): string {
  return `decline:${groupKey}`;
}

function extractCandidateId(memo: string): string | null {
  const match = memo.match(/candidate:([^\s]+)/);
  return match?.[1] ?? null;
}

export function isSlotAvailabilityDraft(draft: ScheduleDraft): boolean {
  return (
    draft.type === "Available / 参加可能" &&
    Boolean(draft.memo?.includes("candidate:")) &&
    !isDeclineDraft(draft)
  );
}

export function getMemberRsvpInGroup(
  drafts: ScheduleDraft[],
  candidates: ScheduleDraft[],
  groupKey: string,
  member: ScheduleMember,
): MemberRsvpStatus {
  if (
    drafts.some(
      (draft) =>
        isDeclineDraft(draft) &&
        draft.person === member &&
        getDeclineGroupKey(draft) === groupKey,
    )
  ) {
    return "declined";
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const hasSlot = drafts.some((draft) => {
    if (!isSlotAvailabilityDraft(draft) || draft.person !== member) {
      return false;
    }

    const candidateId = extractCandidateId(draft.memo ?? "");
    return candidateId ? candidateIds.has(candidateId) : false;
  });

  return hasSlot ? "available" : "pending";
}

export function getMemberSlotRsvpStatus(
  groupDrafts: ScheduleDraft[],
  groupKey: string,
  member: ScheduleMember,
  availability: ScheduleDraft[],
): MemberRsvpStatus {
  if (
    groupDrafts.some(
      (draft) =>
        isDeclineDraft(draft) &&
        draft.person === member &&
        getDeclineGroupKey(draft) === groupKey,
    )
  ) {
    return "declined";
  }

  if (availability.some((draft) => draft.person === member)) {
    return "available";
  }

  return "pending";
}

export function getPendingMembers(
  drafts: ScheduleDraft[],
  candidates: ScheduleDraft[],
  groupKey: string,
): ScheduleMember[] {
  return SCHEDULE_MEMBERS.filter(
    (member) => getMemberRsvpInGroup(drafts, candidates, groupKey, member) === "pending",
  );
}

export function getGroupDraftsForCandidates(
  allDrafts: ScheduleDraft[],
  candidates: ScheduleDraft[],
): ScheduleDraft[] {
  if (candidates.length === 0) {
    return [];
  }

  const groupKey = getScheduleDraftGroupKey(candidates[0]);
  const pollId = candidates[0].pollId;

  return allDrafts.filter((draft) => {
    if (pollId && draft.pollId !== pollId) {
      return false;
    }

    if (draft.type === "Candidate / 候補") {
      return getScheduleDraftGroupKey(draft) === groupKey;
    }

    if (isDeclineDraft(draft)) {
      return getDeclineGroupKey(draft) === groupKey;
    }

    if (isSlotAvailabilityDraft(draft)) {
      const candidateId = extractCandidateId(draft.memo ?? "");
      return candidates.some((candidate) => candidate.id === candidateId);
    }

    return false;
  });
}
