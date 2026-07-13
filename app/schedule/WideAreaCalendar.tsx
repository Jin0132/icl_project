"use client";

import { useMemo, useState } from "react";
import {
  WEEKDAY_LABELS,
  buildWideAreaCalendarModel,
  getCalendarDayHeatClasses,
  getDefaultCalendarMonth,
  memberVotedOnDate,
  type CalendarDayHeat,
  type WideAreaCalendarModel,
} from "@/lib/schedule/wide-area";
import type { ScheduleDraft, ScheduleMember } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import { enJa } from "@/lib/ui/bilingual";

type WideAreaCalendarProps = {
  candidates: ScheduleDraft[];
  groupDrafts: ScheduleDraft[];
  groupKey: string;
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  busy: boolean;
  confirmingId: string | null;
  onToggleAvailability: (candidate: ScheduleDraft, member: ScheduleMember) => void;
  onRequestConfirm: (candidateId: string) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidateId: string) => void;
};

function MemberSelector({
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
              ? "border-blue-400 bg-blue-600 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {member}
        </button>
      ))}
    </div>
  );
}

function CalendarDayCell({
  day,
  model,
  activeMember,
  isTop,
  busy,
  confirmingId,
  onVote,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
}: {
  day: CalendarDayHeat;
  model: WideAreaCalendarModel;
  activeMember: ScheduleMember;
  isTop: boolean;
  busy: boolean;
  confirmingId: string | null;
  onVote: (day: CalendarDayHeat) => void;
  onRequestConfirm: (candidateId: string) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidateId: string) => void;
}) {
  if (!day.inMonth) {
    return <div className="min-h-[88px] rounded-xl" />;
  }

  const hasSlots = day.slots.length > 0;
  const voted = memberVotedOnDate(model, day.dateKey, activeMember);
  const isConfirming = day.bestSlotId !== null && confirmingId === day.bestSlotId;

  return (
    <div
      className={`relative flex min-h-[88px] flex-col rounded-xl border p-2 transition-all ${getCalendarDayHeatClasses(day.tier, isTop, voted)}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-sm font-semibold ${
            hasSlots ? "text-slate-800" : "text-slate-300"
          }`}
        >
          {day.dayNumber}
        </span>
        {hasSlots && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              day.tier === "full"
                ? "bg-blue-100 text-blue-700"
                : day.tier === "high"
                  ? "bg-sky-100 text-sky-700"
                  : day.availableCount > 0
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-50 text-slate-400"
            }`}
          >
            {day.availableCount}/{day.eligibleCount}
          </span>
        )}
      </div>

      {hasSlots ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onVote(day)}
            className="mt-1 flex-1 rounded-lg text-left transition-colors hover:bg-white/50 disabled:opacity-60"
          >
            <div className="space-y-0.5">
              {day.slots.map((slot) => (
                <p key={slot.id} className="text-[10px] leading-tight text-slate-600">
                  {slot.timeLabel}
                </p>
              ))}
            </div>
            {voted && (
              <p className="mt-1 text-[10px] font-medium text-emerald-600">
                {enJa("You: available", "あなた: 参加可能")}
              </p>
            )}
          </button>

          {isTop && day.bestSlotId && (
            <div className="mt-1.5">
              {isConfirming ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-1.5">
                  <p className="text-[9px] text-amber-900">
                    {enJa("Confirm this day?", "この日で確定？")}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={onCancelConfirm}
                      className="flex-1 rounded border border-slate-200 bg-white py-0.5 text-[9px] text-slate-600"
                    >
                      {enJa("Back", "戻る")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onConfirm(day.bestSlotId!)}
                      className="flex-1 rounded bg-emerald-600 py-0.5 text-[9px] font-medium text-white"
                    >
                      {enJa("OK", "確定")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRequestConfirm(day.bestSlotId!)}
                  className="w-full rounded-lg bg-emerald-600 py-1 text-[10px] font-medium text-white shadow-[0_0_12px_rgba(52,211,153,0.35)] hover:bg-emerald-700 disabled:opacity-60"
                >
                  {enJa("Confirm", "確定")}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

export function WideAreaCalendar({
  candidates,
  groupDrafts,
  groupKey,
  availabilityByCandidate,
  busy,
  confirmingId,
  onToggleAvailability,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
}: WideAreaCalendarProps) {
  const [month, setMonth] = useState(() => getDefaultCalendarMonth(candidates));
  const [activeMember, setActiveMember] = useState<ScheduleMember>("Theo");

  const model = useMemo(
    () =>
      buildWideAreaCalendarModel({
        month,
        candidates,
        groupDrafts,
        groupKey,
        availabilityByCandidate,
      }),
    [month, candidates, groupDrafts, groupKey, availabilityByCandidate],
  );

  function handleVote(day: CalendarDayHeat) {
    const allVoted = day.slots.every((slot) =>
      availabilityByCandidate.get(slot.id)?.some((draft) => draft.person === activeMember),
    );

    for (const slot of day.slots) {
      const voted = availabilityByCandidate
        .get(slot.id)
        ?.some((draft) => draft.person === activeMember);

      if (allVoted && voted) {
        onToggleAvailability(slot.candidate, activeMember);
      } else if (!allVoted && !voted) {
        onToggleAvailability(slot.candidate, activeMember);
      }
    }
  }

  if (candidates.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-slate-400">
        {enJa("No candidate slots yet", "候補日時がまだありません")}
      </p>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <MemberSelector activeMember={activeMember} onChange={setActiveMember} />

      <p className="mt-3 text-xs text-slate-400">
        {enJa(
          "Select your name, then click a highlighted date to mark available. Top dates glow blue — use Confirm to finalize.",
          "名前を選び、候補日をクリックして参加可能を入力。最も光る日がベスト候補です。",
        )}
      </p>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ←
          </button>
          <h4 className="text-sm font-semibold text-slate-800">{model.monthLabel}</h4>
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1 font-medium">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {model.days.map((day) => (
            <CalendarDayCell
              key={day.dateKey || `pad-${day.dayNumber}`}
              day={day}
              model={model}
              activeMember={activeMember}
              isTop={model.topDateKeys.includes(day.dateKey)}
              busy={busy}
              confirmingId={confirmingId}
              onVote={handleVote}
              onRequestConfirm={onRequestConfirm}
              onCancelConfirm={onCancelConfirm}
              onConfirm={onConfirm}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-blue-300 bg-blue-50 shadow-[0_0_8px_rgba(147,197,253,0.4)]" />
            {enJa("All available", "全員参加可能")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-sky-200 bg-sky-50" />
            {enJa("Half+", "半数以上")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-100 bg-white" />
            {enJa("No votes", "未回答")}
          </span>
        </div>
      </div>
    </div>
  );
}
