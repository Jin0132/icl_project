"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatScheduleDateTime } from "@/lib/notion/notion-datetime";
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
} from "@/lib/notion/schedule-schema";

type LoadState = "loading" | "success" | "error";
type SectionFilter = "drafts" | "confirmed";
type ViewMode = "list" | "calendar";

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

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

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
    const key = candidate.pollId ?? candidate.id;
    const list = groups.get(key) ?? [];
    list.push(candidate);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([groupId, items]) => ({
      groupId,
      items: items.sort((left, right) => left.start.localeCompare(right.start)),
      headline: items[0],
    }))
    .sort((left, right) =>
      (left.headline?.start ?? "").localeCompare(right.headline?.start ?? ""),
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

function PollGroupCard({
  headline,
  candidates,
  availabilityByCandidate,
  busy,
  confirmingId,
  onToggleAvailability,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
}: {
  headline: ScheduleDraft;
  candidates: ScheduleDraft[];
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  busy: boolean;
  confirmingId: string | null;
  onToggleAvailability: (candidate: ScheduleDraft, member: ScheduleMember) => void;
  onRequestConfirm: (candidateId: string) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidateId: string) => void;
}) {
  const style =
    CATEGORY_STYLES[headline.category ?? ""] ?? CATEGORY_STYLES["Other / その他"];

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${CARD_SHADOW}`}>
      <div className={`border-b border-slate-100 px-5 py-4 border-l-4 ${style.border}`}>
        <div className="flex flex-wrap items-center gap-2">
          {headline.category && (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style.pill}`}>
              {headline.category.split(" / ")[0]}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
            候補 {candidates.length}件
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-slate-800">{headline.title}</h3>
        <p className="mt-1 text-sm text-slate-500">提案: {headline.person ?? "—"}</p>
      </div>

      <div className="divide-y divide-slate-100">
        {candidates.map((candidate) => {
          const availability = availabilityByCandidate.get(candidate.id) ?? [];

          return (
            <div key={candidate.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {formatScheduleDateTime(candidate.start, candidate.isDatetime)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    参加可能:{" "}
                    {availability.map((item) => item.person).filter(Boolean).join("、") || "なし"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    {SCHEDULE_MEMBERS.map((member) => {
                      const active = availability.some((item) => item.person === member);
                      return (
                        <button
                          key={member}
                          type="button"
                          disabled={busy}
                          onClick={() => onToggleAvailability(candidate, member)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
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

                  {confirmingId === candidate.id ? (
                    <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-right">
                      <p className="text-xs text-amber-900">
                        この時間で確定しますか？ Calendar of availability に書き出されます。
                      </p>
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={onCancelConfirm}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onConfirm(candidate.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          確定する
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRequestConfirm(candidate.id)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      この時間で確定
                    </button>
                  )}
                </div>
              </div>
            </div>
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

  const fetchSchedule = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/schedule");
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

  const calendarDays = useMemo(() => {
    const map = new Map<string, { drafts: ScheduleDraft[]; confirmed: ConfirmedEvent[] }>();

    for (const draft of filteredDrafts.filter((item) => item.type === "Candidate / 候補")) {
      const key = toDateKey(draft.start);
      const entry = map.get(key) ?? { drafts: [], confirmed: [] };
      entry.drafts.push(draft);
      map.set(key, entry);
    }

    for (const event of data?.confirmed ?? []) {
      const key = toDateKey(event.start);
      const entry = map.get(key) ?? { drafts: [], confirmed: [] };
      entry.confirmed.push(event);
      map.set(key, entry);
    }

    return [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [filteredDrafts, data]);

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
      await fetchSchedule();
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

    setBusy(true);

    try {
      if (existing) {
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
      }

      await fetchSchedule();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
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

      setPollId(null);
      setSection("confirmed");
      setFormMessage("確定しました。Calendar of availability に反映済みです。");
      await fetchSchedule();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Confirm failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => setFormMessage(null), 5000);
    }
  }

  const draftCount = filteredDrafts.filter((draft) => draft.type === "Candidate / 候補").length;
  const confirmedCount = data?.confirmed.length ?? 0;

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
              {value === "list" ? "リスト" : "カレンダー"}
            </button>
          ))}
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
        </div>

        {loadState === "loading" ? (
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-white/80" />
            ))}
          </div>
        ) : section === "drafts" ? (
          viewMode === "list" ? (
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
                      headline={group.headline}
                      candidates={group.items}
                      availabilityByCandidate={availabilityByCandidate}
                      busy={busy}
                      confirmingId={confirmingId}
                      onToggleAvailability={(candidate, member) => {
                        void toggleAvailability(candidate, member);
                      }}
                      onRequestConfirm={setConfirmingId}
                      onCancelConfirm={() => setConfirmingId(null)}
                      onConfirm={(candidateId) => {
                        void handleConfirm(candidateId);
                      }}
                    />
                  ) : null,
                )
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {calendarDays.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-400">
                  表示する候補がありません
                </div>
              ) : (
                calendarDays.map(([day, items]) => (
                  <div
                    key={day}
                    className={`rounded-2xl border border-slate-200 bg-white p-5 ${CARD_SHADOW}`}
                  >
                    <h3 className="text-sm font-semibold text-slate-700">
                      {formatScheduleDateTime(day, false)}
                    </h3>
                    <div className="mt-4 space-y-2">
                      {items.drafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                        >
                          <p className="font-medium text-slate-800">{draft.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatScheduleDateTime(draft.start, draft.isDatetime)} · 提案{" "}
                            {draft.person}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {(data?.confirmed.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-400">
                確定済みのイベントはありません
                <p className="mt-2 text-xs text-slate-400">
                  このページではアプリから確定した [MTG] / [Event] / [Other] のみ表示します。
                </p>
              </div>
            ) : (
              data?.confirmed.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-xl border border-slate-100 border-l-4 border-l-emerald-500 bg-white px-5 py-4 ${CARD_SHADOW}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      確定
                    </span>
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold text-slate-800">{event.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatScheduleDateTime(event.start, event.isDatetime)}
                  </p>
                  {event.tags.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">{event.tags.join(" · ")}</p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {calendarDays.filter(([, items]) => items.confirmed.length > 0).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-400">
                表示する確定予定がありません
              </div>
            ) : (
              calendarDays
                .filter(([, items]) => items.confirmed.length > 0)
                .map(([day, items]) => (
                  <div
                    key={day}
                    className={`rounded-2xl border border-slate-200 bg-white p-5 ${CARD_SHADOW}`}
                  >
                    <h3 className="text-sm font-semibold text-slate-700">
                      {formatScheduleDateTime(day, false)}
                    </h3>
                    <div className="mt-4 space-y-2">
                      {items.confirmed.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm"
                        >
                          <p className="font-medium text-slate-800">{event.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatScheduleDateTime(event.start, event.isDatetime)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
