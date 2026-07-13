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
import type { HubFreeSlot, ScheduleApiResponse, ScheduleMember } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import { enJa } from "@/lib/ui/bilingual";
import { MonthCalendar } from "./schedule/MonthCalendar";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const MODE_LABELS: Record<HubCalendarMode, string> = {
  confirmed: enJa("Confirmed", "確定済み"),
  input: enJa("Mark free", "空きを入力"),
  team: enJa("Team free", "チーム空き"),
};

function MemberPills({
  activeMember,
  onChange,
}: {
  activeMember: ScheduleMember;
  onChange: (member: ScheduleMember) => void;
}) {
  return (
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
  );
}

function HubPersonalFreeInput({
  month,
  onMonthChange,
  collectionId,
  activeMember,
  hubFree,
  busy,
  onToggleSlot,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  collectionId: string;
  activeMember: ScheduleMember;
  hubFree: HubFreeSlot[];
  busy: boolean;
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
        monthFree
          .filter((slot) => slot.person === activeMember)
          .map((slot) => slot.slotKey),
      ),
    [monthFree, activeMember],
  );

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
            const myCount = monthFree.filter(
              (slot) => slot.person === activeMember && slot.dateKey === cell.dateKey,
            ).length;

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
        <div className="mt-4 rounded-xl border border-slate-100 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">
            {selectedDateKey.replace(/-/g, "/")} · {enJa("30-min slots", "30分枠")}
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {daySlots.map((slot) => {
              const selected = memberSlotKeys.has(slot.slotKey);
              return (
                <button
                  key={slot.slotKey}
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleSlot(slot.start)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all disabled:opacity-60 ${
                    selected
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
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

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        {enJa(
          "Team availability heatmap. Brighter slots mean more members are free.",
          "チーム全体の空きヒートマップです。光るほど多くのメンバーが空いています。",
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
                onClick={() => setSelectedDateKey(cell.dateKey)}
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
        <div className="mt-4 rounded-xl border border-slate-100 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">
              {selectedDateKey.replace(/-/g, "/")}
            </p>
            <Link
              href="/schedule"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {enJa("Create candidates on schedule →", "予定調整で候補を作成 →")}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {selectedHeat.map((slot) => (
              <div
                key={slot.slotKey}
                className={`rounded-lg border px-2 py-2 text-center text-xs ${getSlotHeatClasses(slot.tier, false)}`}
              >
                <div className="font-medium">{slot.label}</div>
                <div className="mt-0.5 text-[10px] opacity-80">
                  {slot.availableCount}/{slot.totalMembers}
                </div>
              </div>
            ))}
          </div>
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
          <span className="h-3 w-3 rounded border border-slate-100 bg-white" />
          {enJa("No votes", "未入力")}
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
  const [activeMember, setActiveMember] = useState<ScheduleMember>("Theo");
  const [hubFree, setHubFree] = useState<HubFreeSlot[]>([]);
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hub-free",
          person: activeMember,
          start,
          collectionId,
        }),
      });

      if (!response.ok) throw new Error("Toggle failed");

      const result = (await response.json()) as {
        action: "created" | "removed";
        slot: HubFreeSlot | null;
      };

      setHubFree((current) => {
        if (result.action === "removed") {
          const slotKey = buildHubSlotKey(start);
          return current.filter(
            (item) => !(item.person === activeMember && item.slotKey === slotKey),
          );
        }

        if (result.slot) {
          return [...current.filter((item) => item.id !== result.slot!.id), result.slot];
        }

        return current;
      });
    } catch {
      setLoadError(enJa("Update failed", "更新に失敗しました"));
    } finally {
      setBusy(false);
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
                : enJa("Phase 2: team heatmap for planning.", "Phase 2：チーム空きの俯瞰です。")}
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
            busy={busy}
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
