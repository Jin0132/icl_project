"use client";

import { useMemo, useState } from "react";
import {
  buildMockWideAreaMatrix,
  createInitialMockWideAreaState,
  getCellStatusClasses,
  getColumnHeatClasses,
  mockVoteKey,
  toggleMockVote,
  type MockWideAreaState,
} from "@/lib/schedule/wide-area";
import { SCHEDULE_MEMBERS, type ScheduleMember } from "@/lib/notion/schedule-schema";
import { CARD_SHADOW } from "./schedule-ui";
import { enJa } from "@/lib/ui/bilingual";

/** Notion 未接続時も広域調整 UI を試せるサンプルカード */
export function WideAreaMockDemo() {
  const [state, setState] = useState<MockWideAreaState>(createInitialMockWideAreaState);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedSlotId, setConfirmedSlotId] = useState<string | null>(null);

  const model = useMemo(() => buildMockWideAreaMatrix(state), [state]);

  function handleCellClick(slotId: string, member: ScheduleMember) {
    setState((current) => toggleMockVote(current, slotId, member));
  }

  function handleConfirm(slotId: string) {
    setConfirmedSlotId(slotId);
    setConfirmingId(null);
  }

  if (confirmedSlotId) {
    const slot = state.slots.find((item) => item.id === confirmedSlotId);

    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/60 px-6 py-8 text-center ${CARD_SHADOW}`}>
        <p className="text-sm font-medium text-emerald-800">
          {enJa("Demo: slot confirmed", "デモ：以下の日時で確定しました")}
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-800">
          {slot?.dateLabel} {slot?.timeLabel}
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmedSlotId(null);
            setState(createInitialMockWideAreaState());
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
            "Mock data — try clicking cells. Top attendance columns glow blue.",
            "モックデータです。マスをクリックして動作を確認できます。出席率が高い列は青く光ります。",
          )}
        </p>
      </div>

      <div className="overflow-x-auto px-4 py-4 sm:px-5">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[88px] border-b border-r border-slate-100 bg-slate-50 px-3 py-3 text-left text-xs font-medium text-slate-500">
                {enJa("Member", "メンバー")}
              </th>
              {model.slots.map((slot) => {
                const heat = model.columnHeat.find((column) => column.slotId === slot.id);
                const isTop = model.topSlotIds.includes(slot.id);

                return (
                  <th
                    key={slot.id}
                    className={`min-w-[108px] border-b border-slate-100 px-2 py-2 text-center ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                  >
                    <div className="text-[11px] font-semibold text-slate-700">{slot.dateLabel}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{slot.timeLabel}</div>
                    <div
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isTop ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {heat?.availableCount ?? 0}/{SCHEDULE_MEMBERS.length}
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
                  const cell = model.cells.find(
                    (item) => item.slotId === slot.id && item.member === member,
                  );
                  const status = cell?.status ?? "pending";
                  const isTop = model.topSlotIds.includes(slot.id);
                  const heat = model.columnHeat.find((column) => column.slotId === slot.id);
                  const active = state.votes.has(mockVoteKey(slot.id, member));

                  return (
                    <td
                      key={`${slot.id}-${member}`}
                      className={`border-b border-slate-100 px-2 py-2 text-center ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCellClick(slot.id, member)}
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold transition-all ${getCellStatusClasses(status, isTop)}`}
                      >
                        {active ? "✓" : ""}
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
                const heat = model.columnHeat.find((column) => column.slotId === slot.id);
                const isTop = model.topSlotIds.includes(slot.id);
                const isConfirming = confirmingId === slot.id;

                return (
                  <td
                    key={`confirm-${slot.id}`}
                    className={`px-2 py-3 text-center ${getColumnHeatClasses(heat?.tier ?? "none")}`}
                  >
                    {isConfirming ? (
                      <div className="mx-auto max-w-[120px] rounded-xl border border-amber-200 bg-amber-50 p-2">
                        <div className="mt-1.5 flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600"
                          >
                            {enJa("Back", "戻る")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirm(slot.id)}
                            className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white"
                          >
                            {enJa("OK", "確定")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={(heat?.availableCount ?? 0) === 0}
                        onClick={() => setConfirmingId(slot.id)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-40 ${
                          isTop
                            ? "bg-emerald-600 text-white shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                            : "border border-slate-200 bg-white text-slate-600"
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
