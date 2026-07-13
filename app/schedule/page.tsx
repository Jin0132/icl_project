"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  formatScheduleDateLabel,
  formatScheduleDateTime,
  formatScheduleTimeRange,
  getScheduleDateKey,
  parseAppEventCategory,
  stripAppEventPrefix,
  type AppEventCategory,
} from "@/lib/notion/notion-datetime";
import { MonthCalendar } from "./MonthCalendar";
import type {
  ConfirmedEvent,
  ScheduleApiResponse,
  ScheduleCategory,
  ScheduleDraft,
  ScheduleMember,
} from "@/lib/notion/schedule-schema";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_MEMBERS,
  getScheduleDraftGroupKey,
  normalizeScheduleEventTitle,
} from "@/lib/notion/schedule-schema";

type LoadState = "loading" | "success" | "error";
type SectionFilter = "drafts" | "confirmed";
type ConfirmedCategoryFilter = "all" | AppEventCategory;

type ViewMode = "list" | "calendar";

const CONFIRMED_CATEGORY_LABELS: Record<AppEventCategory, string> = {
  MTG: "会議（MTG）",
  Event: "イベント",
  Other: "その他",
};

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

const CATEGORY_STYLES: Record<string, { border: string; pill: string }> = {
  "MTG / 定例MTG": {
    border: "border-l-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
  },
  "Event / イベント": {
    border: "border-l-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-100",
  },
  "Other / その他": {
    border: "border-l-slate-400",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

function addMinutesToLocalDatetime(localValue: string, minutes: number): string {
  const date = new Date(localValue);
  date.setMinutes(date.getMinutes() + minutes);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDatetimeToNotion(localValue: string): string {
  return `${localValue}:00`;
}

function defaultStartValue(): string {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getAvailabilityForCandidate(
  drafts: ScheduleDraft[],
  candidate: ScheduleDraft,
): ScheduleDraft[] {
  return drafts.filter(
    (draft) =>
      draft.type === "Available / 参加可能" &&
      draft.memo?.includes(`candidate:${candidate.id}`),
  );
}

function groupCandidates(drafts: ScheduleDraft[]) {
  const candidates = drafts.filter((draft) => draft.type === "Candidate / 候補");
  const groups = new Map<string, ScheduleDraft[]>();

  for (const candidate of candidates) {
    const key = getScheduleDraftGroupKey(candidate);
    const list = groups.get(key) ?? [];
    list.push(candidate);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([groupId, items]) => ({
      groupId,
      pollId: items[0]?.pollId ?? items[0]?.id ?? groupId,
      items: items.sort((left, right) => left.start.localeCompare(right.start)),
      headline: items[0],
      displayTitle: normalizeScheduleEventTitle(items[0]?.title ?? ""),
    }))
    .sort((left, right) =>
      (left.headline?.start ?? "").localeCompare(right.headline?.start ?? ""),
    );
}

function sortDrafts(drafts: ScheduleDraft[]): ScheduleDraft[] {
  return [...drafts].sort((left, right) => left.start.localeCompare(right.start));
}

function sortConfirmed(confirmed: ConfirmedEvent[]): ConfirmedEvent[] {
  return [...confirmed].sort((left, right) => left.start.localeCompare(right.start));
}

function patchScheduleData(
  prev: ScheduleApiResponse,
  patch: Partial<Pick<ScheduleApiResponse, "drafts" | "confirmed">>,
): ScheduleApiResponse {
  const drafts = patch.drafts ?? prev.drafts;
  const confirmed = patch.confirmed ?? prev.confirmed;

  return {
    ...prev,
    drafts,
    confirmed,
    meta: {
      ...prev.meta,
      fetchedAt: new Date().toISOString(),
      draftsCount: drafts.length,
      confirmedCount: confirmed.length,
    },
  };
}

function removeCandidateFromDrafts(drafts: ScheduleDraft[], candidateId: string): ScheduleDraft[] {
  return drafts.filter(
    (draft) =>
      draft.id !== candidateId && !draft.memo?.includes(`candidate:${candidateId}`),
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white px-5 py-4 ${CARD_SHADOW}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function groupCandidatesByDate(candidates: ScheduleDraft[]) {
  const groups = new Map<string, ScheduleDraft[]>();

  for (const candidate of candidates) {
    const key = getScheduleDateKey(candidate.start, candidate.isDatetime);
    const list = groups.get(key) ?? [];
    list.push(candidate);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([dateKey, items]) => ({
      dateKey,
      label: formatScheduleDateLabel(items[0].start, items[0].isDatetime),
      items: items.sort((left, right) => left.start.localeCompare(right.start)),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
}

const SLOTS_COLLAPSED_LIMIT = 6;

function PollGroupCard({
  groupId,
  displayTitle,
  headline,
  candidates,
  availabilityByCandidate,
  busy,
  confirmingId,
  deletingId,
  onToggleAvailability,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
  onDeleteCandidate,
  onDeleteGroup,
}: {
  groupId: string;
  displayTitle: string;
  headline: ScheduleDraft;
  candidates: ScheduleDraft[];
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  busy: boolean;
  confirmingId: string | null;
  deletingId: string | null;
  onToggleAvailability: (candidate: ScheduleDraft, member: ScheduleMember) => void;
  onRequestConfirm: (candidateId: string) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidateId: string) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onDeleteGroup: (candidateIds: string[]) => void;
}) {
  const style =
    CATEGORY_STYLES[headline.category ?? ""] ?? CATEGORY_STYLES["Other / その他"];
  const dateGroups = useMemo(() => groupCandidatesByDate(candidates), [candidates]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());

  function toggleDateExpanded(dateKey: string) {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${CARD_SHADOW}`}>
      <div className={`border-b border-slate-100 px-5 py-4 border-l-4 ${style.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {headline.category && (
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style.pill}`}>
                  {headline.category.split(" / ")[0]}
                </span>
              )}
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                候補 {candidates.length}件 · {dateGroups.length}日
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-800">{displayTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">
              作成者: {headline.creator ?? headline.person ?? "—"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDeleteGroup(candidates.map((candidate) => candidate.id))}
            className="shrink-0 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            この調整を削除
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {dateGroups.map((dateGroup) => {
          const showAll = expandedDates.has(dateGroup.dateKey);
          const hiddenCount = Math.max(0, dateGroup.items.length - SLOTS_COLLAPSED_LIMIT);
          const visibleItems =
            showAll || hiddenCount === 0
              ? dateGroup.items
              : dateGroup.items.slice(0, SLOTS_COLLAPSED_LIMIT);

          return (
            <section key={dateGroup.dateKey} className="px-4 py-4 sm:px-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-700">{dateGroup.label}</h4>
                <span className="text-xs text-slate-400">{dateGroup.items.length}枠</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">時間</th>
                      <th className="px-3 py-2 font-medium">参加可能</th>
                      <th className="px-3 py-2 font-medium text-right whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleItems.map((candidate) => {
                      const availability = availabilityByCandidate.get(candidate.id) ?? [];
                      const isConfirming = confirmingId === candidate.id;

                      return (
                        <tr key={candidate.id} className="align-top">
                          <td className="px-3 py-3 whitespace-nowrap text-slate-800">
                            {formatScheduleTimeRange(
                              candidate.start,
                              candidate.end,
                              candidate.isDatetime,
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {SCHEDULE_MEMBERS.map((member) => {
                                const active = availability.some((item) => item.person === member);
                                return (
                                  <button
                                    key={member}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onToggleAvailability(candidate, member)}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      active
                                        ? "bg-emerald-600 text-white"
                                        : "border border-slate-200 bg-white text-slate-600"
                                    }`}
                                  >
                                    {member}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {availability.map((item) => item.person).filter(Boolean).join("、") ||
                                "未回答"}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            {isConfirming ? (
                              <div className="inline-block max-w-xs rounded-xl border border-amber-200 bg-amber-50 p-2 text-left">
                                <p className="text-[11px] text-amber-900">この時間で確定しますか？</p>
                                <div className="mt-2 flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={onCancelConfirm}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                  >
                                    戻る
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onConfirm(candidate.id)}
                                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white"
                                  >
                                    確定
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onRequestConfirm(candidate.id)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                  確定
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || deletingId === candidate.id}
                                  onClick={() => onDeleteCandidate(candidate.id)}
                                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                                  title="この候補を削除"
                                >
                                  {deletingId === candidate.id ? "削除中…" : "削除"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDateExpanded(dateGroup.dateKey)}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {showAll ? "折りたたむ" : `あと${hiddenCount}枠を表示`}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<ScheduleApiResponse | null>(null);
  const [section, setSection] = useState<SectionFilter>("drafts");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState<ScheduleCategory | "all">("all");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScheduleCategory>("MTG / 定例MTG");
  const [person, setPerson] = useState<ScheduleMember>("Theo");
  const [start, setStart] = useState(defaultStartValue);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [pollId, setPollId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmedCategoryFilter, setConfirmedCategoryFilter] =
    useState<ConfirmedCategoryFilter>("all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const fetchSchedule = useCallback(async () => {
    setLoadState((current) => (current === "success" ? current : "loading"));
    setErrorMessage(null);

    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      setData((await response.json()) as ScheduleApiResponse);
      setLoadState("success");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to load schedule");
    }
  }, []);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  const filteredDrafts = useMemo(() => {
    if (!data) return [];
    return data.drafts.filter(
      (draft) => categoryFilter === "all" || draft.category === categoryFilter,
    );
  }, [data, categoryFilter]);

  const pollGroups = useMemo(() => groupCandidates(filteredDrafts), [filteredDrafts]);

  const availabilityByCandidate = useMemo(() => {
    const map = new Map<string, ScheduleDraft[]>();
    if (!data) return map;

    for (const candidate of filteredDrafts.filter(
      (draft) => draft.type === "Candidate / 候補",
    )) {
      map.set(candidate.id, getAvailabilityForCandidate(data.drafts, candidate));
    }

    return map;
  }, [data, filteredDrafts]);

  const confirmedEvents = useMemo(() => {
    if (!data) return [];
    return data.confirmed.map((event) => ({
      ...event,
      category: parseAppEventCategory(event.name),
      displayTitle: stripAppEventPrefix(event.name),
    }));
  }, [data]);

  const filteredConfirmed = useMemo(() => {
    if (confirmedCategoryFilter === "all") return confirmedEvents;
    return confirmedEvents.filter((event) => event.category === confirmedCategoryFilter);
  }, [confirmedEvents, confirmedCategoryFilter]);

  const confirmedByCategory = useMemo(() => {
    const groups: Record<AppEventCategory, typeof confirmedEvents> = {
      MTG: [],
      Event: [],
      Other: [],
    };

    for (const event of filteredConfirmed) {
      if (event.category) {
        groups[event.category].push(event);
      }
    }

    return groups;
  }, [filteredConfirmed]);

  async function handleCreateCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || busy) return;

    setBusy(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "candidate",
          title: title.trim(),
          category,
          person,
          start: localDatetimeToNotion(start),
          end: localDatetimeToNotion(addMinutesToLocalDatetime(start, durationMinutes)),
          pollId: pollId ?? undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Create failed (${response.status})`);
      }

      const created = (await response.json()) as ScheduleDraft;
      setPollId(created.pollId);
      setTitle("");
      setFormMessage("候補日時を追加しました");
      setData((prev) =>
        prev ? patchScheduleData(prev, { drafts: sortDrafts([...prev.drafts, created]) }) : prev,
      );
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Failed to add slot");
    } finally {
      setBusy(false);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  }

  async function toggleAvailability(candidate: ScheduleDraft, member: ScheduleMember) {
    if (!data || busy) return;

    const existing = getAvailabilityForCandidate(data.drafts, candidate).find(
      (draft) => draft.person === member,
    );

    const previousData = data;
    setBusy(true);

    try {
      if (existing) {
        setData((prev) =>
          prev
            ? patchScheduleData(prev, {
                drafts: prev.drafts.filter((draft) => draft.id !== existing.id),
              })
            : prev,
        );

        const response = await fetch(`/api/schedule/${existing.id}?type=available`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove availability");
      } else {
        const response = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "available",
            candidateId: candidate.id,
            person: member,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to mark availability");
        }

        const created = (await response.json()) as ScheduleDraft;
        setData((prev) =>
          prev ? patchScheduleData(prev, { drafts: sortDrafts([...prev.drafts, created]) }) : prev,
        );
      }
    } catch (error) {
      setData(previousData);
      setFormMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCandidate(candidateId: string) {
    if (busy) return;
    if (!window.confirm("この候補を削除しますか？")) return;

    setBusy(true);
    setDeletingId(candidateId);
    setFormMessage(null);

    try {
      const response = await fetch(`/api/schedule/${candidateId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete candidate");
      }
      setData((prev) =>
        prev
          ? patchScheduleData(prev, {
              drafts: removeCandidateFromDrafts(prev.drafts, candidateId),
            })
          : prev,
      );
      setFormMessage("候補を削除しました");
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
      setDeletingId(null);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  }

  async function handleDeleteGroup(candidateIds: string[]) {
    if (busy || candidateIds.length === 0) return;
    if (!window.confirm("このイベントの候補をすべて削除しますか？")) return;

    setBusy(true);
    setFormMessage(null);

    try {
      const results = await Promise.all(
        candidateIds.map((candidateId) =>
          fetch(`/api/schedule/${candidateId}`, { method: "DELETE" }),
        ),
      );

      if (results.some((response) => !response.ok)) {
        throw new Error("Failed to delete group");
      }

      setData((prev) => {
        if (!prev) return prev;

        let drafts = prev.drafts;
        for (const candidateId of candidateIds) {
          drafts = removeCandidateFromDrafts(drafts, candidateId);
        }

        return patchScheduleData(prev, { drafts });
      });
      setFormMessage("候補を削除しました");
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  }

  async function handleConfirm(candidateId: string) {
    if (busy) return;

    setBusy(true);
    setConfirmingId(null);

    try {
      const response = await fetch("/api/schedule/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Confirm failed");
      }

      const result = (await response.json()) as {
        confirmedEvent: ConfirmedEvent;
        candidate: ScheduleDraft;
      };

      setPollId(null);
      setSection("confirmed");
      setFormMessage("確定しました。Calendar of availability に反映済みです。");
      setData((prev) => {
        if (!prev) return prev;

        const groupKey = getScheduleDraftGroupKey(result.candidate);

        return patchScheduleData(prev, {
          drafts: prev.drafts.filter((draft) => {
            if (draft.type === "Candidate / 候補") {
              return getScheduleDraftGroupKey(draft) !== groupKey;
            }

            if (draft.type === "Available / 参加可能") {
              const linkedCandidateId = draft.memo?.match(/candidate:([^\s]+)/)?.[1];
              if (!linkedCandidateId) {
                return true;
              }

              const linkedCandidate = prev.drafts.find((item) => item.id === linkedCandidateId);
              if (!linkedCandidate) {
                return false;
              }

              return getScheduleDraftGroupKey(linkedCandidate) !== groupKey;
            }

            return true;
          }),
          confirmed: sortConfirmed([...prev.confirmed, result.confirmedEvent]),
        });
      });
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Confirm failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => setFormMessage(null), 5000);
    }
  }

  const draftCount = filteredDrafts.filter((draft) => draft.type === "Candidate / 候補").length;
  const confirmedCount = confirmedEvents.length;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
              ICL Team Schedule
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-800 sm:text-3xl">
              予定調整
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              調整中は Schedule Drafts、確定後は Calendar of availability に反映されます。表示はすべて日本時間（JST）です。
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            ← Project Hub
          </Link>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <SummaryCard label="調整中の候補" value={draftCount} />
          <SummaryCard label="確定済み" value={confirmedCount} />
        </div>

        {loadState === "error" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-white px-5 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {formMessage && (
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-800">
            {formMessage}
          </div>
        )}

        <details className={`mb-8 rounded-2xl border border-slate-200 bg-white ${CARD_SHADOW}`}>
          <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-slate-700">
            ＋ 候補日時を追加
          </summary>
          <form onSubmit={handleCreateCandidate} className="border-t border-slate-100 px-6 pb-6 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs text-slate-500">タイトル</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例: 7月第3週 定例MTG"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">カテゴリ</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ScheduleCategory)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {SCHEDULE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">提案者</span>
                <select
                  value={person}
                  onChange={(event) => setPerson(event.target.value as ScheduleMember)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {SCHEDULE_MEMBERS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">開始日時</span>
                <input
                  type="datetime-local"
                  step={900}
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">所要時間（分）</span>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy || loadState !== "success"}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                候補を追加
              </button>
              {pollId && (
                <button
                  type="button"
                  onClick={() => setPollId(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  新しい調整を開始
                </button>
              )}
            </div>
          </form>
        </details>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(["drafts", "confirmed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              className={`rounded-full px-4 py-2 text-sm ${
                section === value
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {value === "drafts" ? "調整中" : "確定済み"}
            </button>
          ))}
          {section === "confirmed" && (
            <>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              {(["list", "calendar"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setViewMode(value)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    viewMode === value
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {value === "list" ? "一覧" : "月カレンダー"}
                </button>
              ))}
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              {(["all", "MTG", "Event", "Other"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setConfirmedCategoryFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    confirmedCategoryFilter === value
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {value === "all"
                    ? "すべて"
                    : CONFIRMED_CATEGORY_LABELS[value as AppEventCategory]}
                </button>
              ))}
            </>
          )}
          {section === "drafts" && (
            <>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as ScheduleCategory | "all")
                }
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
              >
                <option value="all">全カテゴリ</option>
                {SCHEDULE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item.split(" / ")[0]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {loadState === "loading" ? (
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-white/80" />
            ))}
          </div>
        ) : section === "drafts" ? (
          <div className="space-y-5">
            {pollGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-400">
                調整中の候補はありません
              </div>
            ) : (
              pollGroups.map((group) =>
                group.headline ? (
                  <PollGroupCard
                    key={group.groupId}
                    groupId={group.groupId}
                    displayTitle={group.displayTitle}
                    headline={group.headline}
                    candidates={group.items}
                    availabilityByCandidate={availabilityByCandidate}
                    busy={busy}
                    confirmingId={confirmingId}
                    deletingId={deletingId}
                    onToggleAvailability={(candidate, member) => {
                      void toggleAvailability(candidate, member);
                    }}
                    onRequestConfirm={setConfirmingId}
                    onCancelConfirm={() => setConfirmingId(null)}
                    onConfirm={(candidateId) => {
                      void handleConfirm(candidateId);
                    }}
                    onDeleteCandidate={(candidateId) => {
                      void handleDeleteCandidate(candidateId);
                    }}
                    onDeleteGroup={(candidateIds) => {
                      void handleDeleteGroup(candidateIds);
                    }}
                  />
                ) : null,
              )
            )}
          </div>
        ) : viewMode === "calendar" ? (
          <MonthCalendar
            month={calendarMonth}
            events={filteredConfirmed}
            onMonthChange={setCalendarMonth}
          />
        ) : filteredConfirmed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-400">
            確定済みのイベントはありません
            <p className="mt-2 text-xs text-slate-400">
              アプリから確定した [MTG] / [Event] / [Other] のみ表示します。編集は Notion で行ってください。
            </p>
          </div>
        ) : confirmedCategoryFilter === "all" ? (
          <div className="space-y-8">
            {(Object.keys(CONFIRMED_CATEGORY_LABELS) as AppEventCategory[]).map((cat) => {
              const items = confirmedByCategory[cat];
              if (items.length === 0) return null;

              return (
                <section key={cat}>
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    {CONFIRMED_CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="space-y-3">
                    {items.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-xl border border-slate-100 border-l-4 border-l-emerald-500 bg-white px-5 py-4 ${CARD_SHADOW}`}
                      >
                        <h3 className="text-[15px] font-semibold text-slate-800">
                          {event.displayTitle}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatScheduleDateTime(event.start, event.isDatetime)}
                        </p>
                        {event.tags.length > 0 && (
                          <p className="mt-2 text-xs text-slate-400">{event.tags.join(" · ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConfirmed.map((event) => (
              <div
                key={event.id}
                className={`rounded-xl border border-slate-100 border-l-4 border-l-emerald-500 bg-white px-5 py-4 ${CARD_SHADOW}`}
              >
                <h3 className="text-[15px] font-semibold text-slate-800">{event.displayTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatScheduleDateTime(event.start, event.isDatetime)}
                </p>
                {event.tags.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">{event.tags.join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
