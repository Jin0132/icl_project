"use client";

import { useMemo, useRef, type MouseEvent } from "react";
import {
  buildWideAreaMatrix,
  getCellStatusClasses,
  getColumnHeatClasses,
  type WideAreaMatrixModel,
  type WideAreaSlot,
} from "@/lib/schedule/wide-area";
import type { ScheduleDraft, ScheduleMember } from "@/lib/notion/schedule-schema";
import { SCHEDULE_MEMBERS } from "@/lib/notion/schedule-schema";
import type { MemberRsvpStatus } from "@/lib/notion/schedule-rsvp";
import { enJa } from "@/lib/ui/bilingual";

type WideAreaMatrixProps = {
  candidates: ScheduleDraft[];
  groupDrafts: ScheduleDraft[];
  groupKey: string;
  availabilityByCandidate: Map<string, ScheduleDraft[]>;
  busy: boolean;
  confirmingId: string | null;
  onToggleAvailability: (candidate: ScheduleDraft, member: ScheduleMember) => void;
  onEventDecline: (member: ScheduleMember) => void;
  onUndoDecline: (member: ScheduleMember) => void;
  onRequestConfirm: (candidateId: string) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidateId: string) => void;
};

function getCell(
  model: WideAreaMatrixModel,
  slotId: string,
  member: ScheduleMember,
) {
  return model.cells.find((cell) => cell.slotId === slotId && cell.member === member);
}

function getColumnHeat(model: WideAreaMatrixModel, slotId: string) {
  return model.columnHeat.find((column) => column.slotId === slotId);
}

export function WideAreaMatrix({
  candidates,
  groupDrafts,
  groupKey,
  availabilityByCandidate,
  busy,
  confirmingId,
  onToggleAvailability,
  onEventDecline,
  onUndoDecline,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
}: WideAreaMatrixProps) {
  const slotClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const model = useMemo(
    () =>
      buildWideAreaMatrix({
        candidates,
        groupDrafts,
        groupKey,
        availabilityByCandidate,
      }),
    [candidates, groupDrafts, groupKey, availabilityByCandidate],
  );

  function handleCellClick(
    event: MouseEvent<HTMLButtonElement>,
    slot: WideAreaSlot,
    member: ScheduleMember,
    status: MemberRsvpStatus,
  ) {
    if (event.detail >= 2) {
      if (slotClickTimerRef.current) {
        clearTimeout(slotClickTimerRef.current);
        slotClickTimerRef.current = null;
      }

      if (status !== "declined") {
        onEventDecline(member);
      }

      return;
    }

    if (slotClickTimerRef.current) {
      clearTimeout(slotClickTimerRef.current);
    }

    slotClickTimerRef.current = setTimeout(() => {
      slotClickTimerRef.current = null;

      if (status === "declined") {
        onUndoDecline(member);
        return;
      }

      onToggleAvailability(slot.candidate, member);
    }, 250);
  }

  if (model.slots.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-slate-400">
        {enJa("No candidate slots yet", "候補日時がまだありません")}
      </p>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="mb-3 text-xs text-slate-400">
        {enJa(
          "Click a cell to mark available. Double-click to decline the whole event. Top slots glow automatically.",
          "マスをクリックで参加可能。ダブルクリックでイベント全体を不参加。出席率が高い列は自動でハイライトされます。",
        )}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[88px] border-b border-r border-slate-100 bg-slate-50 px-3 py-3 text-left text-xs font-medium text-slate-500">
                {enJa("Member", "メンバー")}
              </th>
              {model.slots.map((slot) => {
                const heat = getColumnHeat(model, slot.id);
                const isTop = model.topSlotIds.includes(slot.id);

                return (
                  <th
                    key={slot.id}
                    className={`min-w-[108px] border-b border-slate-100 px-2 py-2 text-center transition-all ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                  >
                    <div className="text-[11px] font-semibold text-slate-700">{slot.dateLabel}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{slot.timeLabel}</div>
                    <div
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isTop
                          ? "bg-blue-100 text-blue-700"
                          : (heat?.availableCount ?? 0) > 0
                            ? "bg-slate-100 text-slate-600"
                            : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {heat?.availableCount ?? 0}/{heat?.eligibleCount ?? SCHEDULE_MEMBERS.length}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SCHEDULE_MEMBERS.map((member) => (
              <tr key={member}>
                <td className="sticky left-0 z-10 border-r border-b border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                  {member}
                </td>
                {model.slots.map((slot) => {
                  const cell = getCell(model, slot.id, member);
                  const status = cell?.status ?? "pending";
                  const isTop = model.topSlotIds.includes(slot.id);
                  const heat = getColumnHeat(model, slot.id);

                  return (
                    <td
                      key={`${slot.id}-${member}`}
                      className={`border-b border-slate-100 px-2 py-2 text-center ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => handleCellClick(event, slot, member, status)}
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold transition-all disabled:opacity-60 ${getCellStatusClasses(status, isTop)}`}
                        title={
                          status === "available"
                            ? enJa("Available — click to unmark", "参加可能 — クリックで解除")
                            : status === "declined"
                              ? enJa("Can't attend — click to undo", "不参加 — クリックで取り消し")
                              : enJa("Click to mark available", "クリックで参加可能")
                        }
                      >
                        {status === "available" ? "✓" : status === "declined" ? "✗" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 border-r border-slate-100 bg-slate-50 px-3 py-3 text-[11px] font-medium text-slate-500">
                {enJa("Confirm", "確定")}
              </td>
              {model.slots.map((slot) => {
                const heat = getColumnHeat(model, slot.id);
                const isTop = model.topSlotIds.includes(slot.id);
                const isConfirming = confirmingId === slot.id;

                return (
                  <td
                    key={`confirm-${slot.id}`}
                    className={`px-2 py-3 text-center ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                  >
                    {isConfirming ? (
                      <div className="mx-auto max-w-[120px] rounded-xl border border-amber-200 bg-amber-50 p-2">
                        <p className="text-[10px] text-amber-900">
                          {enJa("Confirm?", "確定しますか？")}
                        </p>
                        <div className="mt-1.5 flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={onCancelConfirm}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600"
                          >
                            {enJa("Back", "戻る")}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onConfirm(slot.id)}
                            className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white"
                          >
                            {enJa("OK", "確定")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || (heat?.availableCount ?? 0) === 0}
                        onClick={() => onRequestConfirm(slot.id)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isTop
                            ? "bg-emerald-600 text-white shadow-[0_0_16px_rgba(52,211,153,0.35)] hover:bg-emerald-700"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {enJa("Confirm", "確定")}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
