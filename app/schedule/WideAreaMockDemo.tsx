"use client";

import { useMemo, useState } from "react";
import {
  WEEKDAY_LABELS,
  buildMockCalendarModel,
  createInitialMockCalendarState,
  getCalendarDayHeatClasses,
  memberVotedOnDate,
  toggleMockCalendarVote,
  type CalendarDayHeat,
  type MockWideAreaCalendarState,
} from "@/lib/schedule/wide-area";
import { SCHEDULE_MEMBERS, type ScheduleMember } from "@/lib/notion/schedule-schema";
import { CARD_SHADOW } from "./schedule-ui";
import { enJa } from "@/lib/ui/bilingual";

function MockDayCell({
  day,
  model,
  activeMember,
  isTop,
  onVote,
  onConfirm,
}: {
  day: CalendarDayHeat;
  model: ReturnType<typeof buildMockCalendarModel>;
  activeMember: ScheduleMember;
  isTop: boolean;
  onVote: (day: CalendarDayHeat) => void;
  onConfirm: (day: CalendarDayHeat) => void;
}) {
  if (!day.inMonth) {
    return <div className="min-h-[88px] rounded-xl" />;
  }

  const hasSlots = day.slots.length > 0;
  const voted = memberVotedOnDate(model, day.dateKey, activeMember);

  return (
    <div
      className={`relative flex min-h-[88px] flex-col rounded-xl border p-2 transition-all ${getCalendarDayHeatClasses(day.tier, isTop, voted)}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`text-sm font-semibold ${hasSlots ? "text-slate-800" : "text-slate-300"}`}>
          {day.dayNumber}
        </span>
        {hasSlots && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              day.tier === "full"
                ? "bg-blue-100 text-blue-700"
                : day.tier === "high"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-100 text-slate-600"
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
            onClick={() => onVote(day)}
            className="mt-1 flex-1 rounded-lg text-left hover:bg-white/50"
          >
            {day.slots.map((slot) => (
              <p key={slot.id} className="text-[10px] text-slate-600">
                {slot.timeLabel}
              </p>
            ))}
            {voted && (
              <p className="mt-1 text-[10px] font-medium text-emerald-600">
                {enJa("You: available", "あなた: 参加可能")}
              </p>
            )}
          </button>
          {isTop && (
            <button
              type="button"
              onClick={() => onConfirm(day)}
              className="mt-1.5 w-full rounded-lg bg-emerald-600 py-1 text-[10px] font-medium text-white shadow-[0_0_12px_rgba(52,211,153,0.35)]"
            >
              {enJa("Confirm", "確定")}
            </button>
          )}
        </>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

/** Notion 未接続時のカレンダーヒートマップ・デモ */
export function WideAreaMockDemo() {
  const [state, setState] = useState<MockWideAreaCalendarState>(createInitialMockCalendarState);
  const [activeMember, setActiveMember] = useState<ScheduleMember>("Theo");
  const [confirmedDay, setConfirmedDay] = useState<CalendarDayHeat | null>(null);

  const model = useMemo(() => buildMockCalendarModel(state), [state]);

  if (confirmedDay) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/60 px-6 py-8 text-center ${CARD_SHADOW}`}>
        <p className="text-sm font-medium text-emerald-800">
          {enJa("Demo: meeting confirmed", "デモ：以下の日時で確定しました")}
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-800">
          {confirmedDay.dateKey.replace(/-/g, "/")}
        </p>
        <p className="text-sm text-slate-600">{confirmedDay.slots[0]?.timeLabel}</p>
        <button
          type="button"
          onClick={() => {
            setConfirmedDay(null);
            setState(createInitialMockCalendarState());
          }}
          className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          {enJa("Reset demo", "デモをリセット")}
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-dashed border-blue-200 bg-white ${CARD_SHADOW}`}>
      <div className="border-b border-blue-100 px-5 py-4">
        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {enJa("Sample", "サンプル")}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-slate-800">{state.pollTitle}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {enJa(
            "Calendar heatmap demo — select your name and click dates.",
            "カレンダーヒートマップのデモです。名前を選んで日付をクリックしてください。",
          )}
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{enJa("Answering as", "回答者")}</span>
          {SCHEDULE_MEMBERS.map((member) => (
            <button
              key={member}
              type="button"
              onClick={() => setActiveMember(member)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeMember === member
                  ? "border-blue-400 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {member}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setState((current) => ({
                  ...current,
                  month: new Date(
                    current.month.getFullYear(),
                    current.month.getMonth() - 1,
                    1,
                  ),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <h4 className="text-sm font-semibold text-slate-800">{model.monthLabel}</h4>
            <button
              type="button"
              onClick={() =>
                setState((current) => ({
                  ...current,
                  month: new Date(
                    current.month.getFullYear(),
                    current.month.getMonth() + 1,
                    1,
                  ),
                }))
              }
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
              <MockDayCell
                key={day.dateKey || `pad-${day.dayNumber}`}
                day={day}
                model={model}
                activeMember={activeMember}
                isTop={model.topDateKeys.includes(day.dateKey)}
                onVote={(target) =>
                  setState((current) => toggleMockCalendarVote(current, target.dateKey, activeMember))
                }
                onConfirm={setConfirmedDay}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
