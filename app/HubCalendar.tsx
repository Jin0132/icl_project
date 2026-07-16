"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HubConfirmedEvent } from "@/lib/hub-confirmed-events";
import {
  buildHubSlotKey,
  buildDayTimeSlots,
  buildHubCollectionId,
  buildMonthGrid,
  buildSlotHeatMap,
  getDayHeatCellClasses,
  getDayHeatSummary,
  getSlotHeatClasses,
  type HubCalendarMode,
} from "@/lib/hub-availability";
import type {
  HubFreeSlot,
  ScheduleApiResponse,
  ScheduleCategory,
  ScheduleMember,
} from "@/lib/notion/schedule-schema";
import { SCHEDULE_CATEGORIES, SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import { enJa } from "@/lib/ui/bilingual";
import { MonthCalendar } from "./schedule/MonthCalendar";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const MODE_LABELS: Record<HubCalendarMode, string> = {
  confirmed: enJa("Confirmed", "確定済み"),
  input: enJa("Phase 1 · Free", "Phase 1 · 空き入力"),
  team: enJa("Phase 2 · Assign", "Phase 2 · 振り分け"),
};

function MemberPills({
  activeMember,
  onChange,
}: {
  activeMember: ScheduleMember | null;
  onChange: (member: ScheduleMember) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">{enJa("Answering as", "回答者")}</span>
        {SCHEDULE_MEMBERS.map((member) => (
          <button
            key={member}
            type="button"
            onClick={() => onChange(member)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeMember === member
                ? "border-blue-400 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {member}
          </button>
        ))}
      </div>
      {!activeMember && (
        <p className="text-xs text-amber-700">
          {enJa(
            "Select who you are answering as before marking free slots.",
            "先に回答者を選んでから、空き時間を入力してください。",
          )}
        </p>
      )}
    </div>
  );
}

function HubPersonalFreeInput({
  month,
  onMonthChange,
  collectionId,
  activeMember,
  hubFree,
  pendingSlotKeys,
  onToggleSlot,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  collectionId: string;
  activeMember: ScheduleMember | null;
  hubFree: HubFreeSlot[];
  pendingSlotKeys: Set<string>;
  onToggleSlot: (start: string) => void;
}) {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return key;
  });

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
  }).format(month);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const monthFree = useMemo(
    () => hubFree.filter((slot) => slot.collectionId === collectionId),
    [hubFree, collectionId],
  );

  const daySlots = useMemo(
    () => (selectedDateKey ? buildDayTimeSlots(selectedDateKey) : []),
    [selectedDateKey],
  );

  const memberSlotKeys = useMemo(
    () =>
      new Set(
        activeMember
          ? monthFree
              .filter((slot) => slot.person === activeMember)
              .map((slot) => slot.slotKey)
          : [],
      ),
    [monthFree, activeMember],
  );

  const canEditSlots = Boolean(activeMember);

  const heatByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getDayHeatSummary>>();
    for (const cell of grid) {
      if (cell.inMonth) {
        map.set(cell.dateKey, getDayHeatSummary(cell.dateKey, monthFree));
      }
    }
    return map;
  }, [grid, monthFree]);

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        {enJa(
          "Click a date, then tap 30-minute slots you are free. Times are JST.",
          "日付を選び、空いている30分枠をタップしてください（日本時間）。",
        )}
      </p>

      <div className="rounded-xl border border-slate-100 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            if (!cell.inMonth) {
              return <div key={`empty-${cell.dayNumber}`} className="h-10" />;
            }

            const summary = heatByDay.get(cell.dateKey);
            const isSelected = selectedDateKey === cell.dateKey;
            const myCount = activeMember
              ? monthFree.filter(
                  (slot) => slot.person === activeMember && slot.dateKey === cell.dateKey,
                ).length
              : 0;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`h-10 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? "border-blue-400 bg-blue-600 text-white"
                    : getDayHeatCellClasses(summary?.maxRate ?? 0, (summary?.slotCount ?? 0) > 0)
                }`}
              >
                {cell.dayNumber}
                {myCount > 0 && !isSelected && (
                  <span className="ml-0.5 text-[9px] text-emerald-600">●</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey && (
        <div
          className={`mt-4 rounded-xl border border-slate-100 p-3 ${
            canEditSlots ? "" : "opacity-60"
          }`}
        >
          <p className="mb-2 text-xs font-medium text-slate-600">
            {selectedDateKey.replace(/-/g, "/")} · {enJa("30-min slots", "30分枠")}
            {!canEditSlots && (
              <span className="ml-2 font-normal text-amber-700">
                {enJa("(select a person first)", "（先に回答者を選択）")}
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {daySlots.map((slot) => {
              const selected = memberSlotKeys.has(slot.slotKey);
              const pending = pendingSlotKeys.has(slot.slotKey);
              return (
                <button
                  key={slot.slotKey}
                  type="button"
                  disabled={!canEditSlots || pending}
                  onClick={() => onToggleSlot(slot.start)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${pending ? "animate-pulse" : ""}`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HubTeamFreeHeatmap({
  month,
  onMonthChange,
  collectionId,
  hubFree,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  collectionId: string;
  hubFree: HubFreeSlot[];
}) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScheduleCategory>("MTG / 定例MTG");
  const [person, setPerson] = useState<ScheduleMember>("Theo");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{
    pollId: string;
    scheduleHref: string;
    minutesUrl: string | null;
    taskUrl: string | null;
  } | null>(null);

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
  }).format(month);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const monthFree = useMemo(
    () => hubFree.filter((slot) => slot.collectionId === collectionId),
    [hubFree, collectionId],
  );

  const selectedHeat = useMemo(() => {
    if (!selectedDateKey) return [];
    return buildSlotHeatMap(buildDayTimeSlots(selectedDateKey), monthFree, selectedDateKey);
  }, [selectedDateKey, monthFree]);

  function toggleSlot(slotKey: string) {
    setSelectedSlotKeys((current) => {
      const next = new Set(current);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
    setResultLinks(null);
  }

  async function handleCreatePlan() {
    if (!selectedDateKey || selectedSlotKeys.size === 0 || !title.trim()) {
      setMessage(enJa("Select slots and enter a title.", "枠を選び、タイトルを入力してください。"));
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const daySlots = buildDayTimeSlots(selectedDateKey);
      const slots = daySlots
        .filter((slot) => selectedSlotKeys.has(slot.slotKey))
        .map((slot) => ({ start: slot.start, end: slot.end }));

      const scheduleUrl =
        typeof window !== "undefined" ? `${window.location.origin}/schedule` : "/schedule";

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hub-plan",
          title: title.trim(),
          category,
          person,
          slots,
          createMinutes: category.startsWith("MTG"),
          scheduleUrl,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create plan");
      }

      const result = (await response.json()) as {
        pollId: string;
        task: { url: string } | null;
        minutes: { url: string } | null;
      };

      setResultLinks({
        pollId: result.pollId,
        scheduleHref: `/schedule?pollId=${encodeURIComponent(result.pollId)}`,
        minutesUrl: result.minutes?.url ?? null,
        taskUrl: result.task?.url ?? null,
      });
      setMessage(
        enJa(
          "Created candidates for Phase 3. Members can now RSVP on Schedule.",
          "候補を作成しました。Phase 3（予定調整）で出欠できます。",
        ),
      );
      setSelectedSlotKeys(new Set());
      setTitle("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        {enJa(
          "Phase 2: pick glowing shared free slots and assign MTG / Event / Other.",
          "Phase 2：光っている共通空きを選び、MTG / イベント / その他に振り分けます。",
        )}
      </p>

      <div className="rounded-xl border border-slate-100 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            if (!cell.inMonth) {
              return <div key={`empty-${cell.dayNumber}`} className="h-12" />;
            }

            const summary = getDayHeatSummary(cell.dateKey, monthFree);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => {
                  setSelectedDateKey(cell.dateKey);
                  setSelectedSlotKeys(new Set());
                  setResultLinks(null);
                }}
                className={`flex h-12 flex-col items-center justify-center rounded-lg border text-sm transition-all ${getDayHeatCellClasses(summary.maxRate, summary.slotCount > 0)} ${
                  selectedDateKey === cell.dateKey ? "ring-2 ring-blue-400" : ""
                }`}
              >
                <span className="font-semibold text-slate-800">{cell.dayNumber}</span>
                {summary.maxCount > 0 && (
                  <span className="text-[9px] text-slate-500">
                    {summary.maxCount}/{SCHEDULE_MEMBERS.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey && (
        <div className="mt-4 space-y-4 rounded-xl border border-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">
              {selectedDateKey.replace(/-/g, "/")} ·{" "}
              {enJa("Click slots to assign", "枠をクリックして選択")}
            </p>
            <span className="text-[11px] text-slate-400">
              {enJa(
                `${selectedSlotKeys.size} selected`,
                `${selectedSlotKeys.size}枠選択中`,
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {selectedHeat.map((slot) => {
              const selected = selectedSlotKeys.has(slot.slotKey);
              return (
                <button
                  key={slot.slotKey}
                  type="button"
                  onClick={() => toggleSlot(slot.slotKey)}
                  className={`rounded-lg border px-2 py-2 text-center text-xs transition-all ${getSlotHeatClasses(slot.tier, selected)}`}
                >
                  <div className="font-medium">{slot.label}</div>
                  <div className="mt-0.5 text-[10px] opacity-80">
                    {slot.availableCount}/{slot.totalMembers}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-slate-500">{enJa("Title", "タイトル")}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例: 運営MTG #2"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-500">{enJa("Assign as", "振り分け")}</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ScheduleCategory)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {SCHEDULE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-slate-500">{enJa("Created by", "作成者")}</span>
              <select
                value={person}
                onChange={(event) => setPerson(event.target.value as ScheduleMember)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {SCHEDULE_MEMBERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-[11px] text-slate-400">
            {category.startsWith("MTG")
              ? enJa(
                  "MTG: creates Schedule candidates + Meeting Minutes + Project task.",
                  "MTG：予定候補 ＋ 議事録空ページ ＋ Project課題を自動作成します。",
                )
              : enJa(
                  "Event/Other: creates Schedule candidates + Project task (no minutes).",
                  "Event/Other：予定候補 ＋ Project課題を作成します（議事録はなし）。",
                )}
          </p>

          <button
            type="button"
            disabled={busy || selectedSlotKeys.size === 0 || !title.trim()}
            onClick={() => void handleCreatePlan()}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy
              ? enJa("Creating…", "作成中…")
              : enJa("Create for Phase 3", "Phase 3用に作成")}
          </button>

          {message && (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {message}
            </p>
          )}

          {resultLinks && (
            <div className="flex flex-wrap gap-3 text-xs">
              <Link
                href={resultLinks.scheduleHref}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                {enJa("Open Phase 3 RSVP →", "Phase 3 出欠へ →")}
              </Link>
              {resultLinks.minutesUrl && (
                <a
                  href={resultLinks.minutesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-600 hover:text-slate-800"
                >
                  {enJa("Meeting minutes", "議事録")}
                </a>
              )}
              {resultLinks.taskUrl && (
                <a
                  href={resultLinks.taskUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-600 hover:text-slate-800"
                >
                  {enJa("Project task", "課題")}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-blue-300 bg-blue-50 shadow-[0_0_6px_rgba(147,197,253,0.4)]" />
          {enJa("All free", "全員空き")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-sky-200 bg-sky-50" />
          {enJa("Half+", "半数以上")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-500" />
          {enJa("Selected", "選択中")}
        </span>
      </div>
    </div>
  );
}

export function HubCalendar({
  initialConfirmed,
}: {
  initialConfirmed: HubConfirmedEvent[];
}) {
  const [mode, setMode] = useState<HubCalendarMode>("confirmed");
  const [month, setMonth] = useState(() => new Date());
  const [confirmedMonth, setConfirmedMonth] = useState(() => new Date());
  const [activeMember, setActiveMember] = useState<ScheduleMember | null>(null);
  const [hubFree, setHubFree] = useState<HubFreeSlot[]>([]);
  const [pendingSlotKeys, setPendingSlotKeys] = useState(() => new Set<string>());
  const [loadError, setLoadError] = useState<string | null>(null);

  const collectionId = useMemo(() => buildHubCollectionId(month), [month]);

  const fetchHubData = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as ScheduleApiResponse;
      setHubFree(data.hubFree ?? []);
      setLoadError(null);
    } catch {
      setLoadError(enJa("Could not load availability", "空き情報を読み込めませんでした"));
    }
  }, []);

  useEffect(() => {
    if (mode !== "confirmed") {
      void fetchHubData();
    }
  }, [mode, fetchHubData]);

  async function handleToggleSlot(start: string) {
    if (!activeMember) {
      setLoadError(
        enJa(
          "Select who you are answering as first.",
          "先に回答者を選択してください。",
        ),
      );
      return;
    }

    const slotKey = buildHubSlotKey(start);
    if (pendingSlotKeys.has(slotKey)) return;

    const existing = hubFree.find(
      (item) =>
        item.person === activeMember &&
        item.slotKey === slotKey &&
        item.collectionId === collectionId,
    );
    const alreadySelected = Boolean(existing);
    const intent = alreadySelected ? "remove" : "add";
    const draftId =
      existing && !existing.id.startsWith("optimistic:") ? existing.id : null;

    setPendingSlotKeys((current) => new Set(current).add(slotKey));

    // 楽観的更新: タップ直後に選択状態を反映（他枠はすぐ操作可能）
    setHubFree((current) => {
      if (alreadySelected) {
        return current.filter(
          (item) =>
            !(
              item.person === activeMember &&
              item.slotKey === slotKey &&
              item.collectionId === collectionId
            ),
        );
      }

      const optimistic: HubFreeSlot = {
        id: `optimistic:${slotKey}:${activeMember}`,
        person: activeMember,
        start,
        end: start,
        collectionId,
        slotKey,
        dateKey: start.slice(0, 10),
      };
      return [...current, optimistic];
    });

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hub-free",
          person: activeMember,
          start,
          collectionId,
          intent,
          draftId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Toggle failed");
      }

      const result = (await response.json()) as {
        action: "created" | "removed";
        slot: HubFreeSlot | null;
      };

      setHubFree((current) => {
        const withoutSlot = current.filter(
          (item) =>
            !(
              item.person === activeMember &&
              item.slotKey === slotKey &&
              item.collectionId === collectionId
            ),
        );

        if (result.action === "removed") {
          return withoutSlot;
        }

        if (result.slot) {
          return [...withoutSlot, result.slot];
        }

        return withoutSlot;
      });
      setLoadError(null);
    } catch (error) {
      await fetchHubData();
      setLoadError(
        error instanceof Error
          ? error.message
          : enJa("Update failed", "更新に失敗しました"),
      );
    } finally {
      setPendingSlotKeys((current) => {
        const next = new Set(current);
        next.delete(slotKey);
        return next;
      });
    }
  }

  return (
    <section className={`mb-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            {enJa("Team calendar", "チームカレンダー")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {mode === "confirmed"
              ? enJa("Confirmed events preview.", "確定済みイベントのプレビューです。")
              : mode === "input"
                ? enJa("Phase 1: mark your free slots.", "Phase 1：空き時間を入力します。")
                : enJa(
                    "Phase 2: assign glowing slots to MTG / Event / Other.",
                    "Phase 2：光る枠を MTG / イベント / その他に振り分けます。",
                  )}
          </p>
        </div>
        <Link
          href="/schedule"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {enJa("Open schedule", "予定調整を開く")} →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["confirmed", "input", "team"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === value
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>

      {loadError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError}
        </p>
      )}

      {mode === "input" && (
        <MemberPills activeMember={activeMember} onChange={setActiveMember} />
      )}

      <div className={mode === "input" ? "mt-4" : ""}>
        {mode === "confirmed" ? (
          initialConfirmed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              {enJa("No confirmed events yet", "確定済みのイベントはまだありません")}
            </p>
          ) : (
            <MonthCalendar
              month={confirmedMonth}
              events={initialConfirmed}
              onMonthChange={setConfirmedMonth}
            />
          )
        ) : mode === "input" ? (
          <HubPersonalFreeInput
            month={month}
            onMonthChange={setMonth}
            collectionId={collectionId}
            activeMember={activeMember}
            hubFree={hubFree}
            pendingSlotKeys={pendingSlotKeys}
            onToggleSlot={handleToggleSlot}
          />
        ) : (
          <HubTeamFreeHeatmap
            month={month}
            onMonthChange={setMonth}
            collectionId={collectionId}
            hubFree={hubFree}
          />
        )}
      </div>
    </section>
  );
}
