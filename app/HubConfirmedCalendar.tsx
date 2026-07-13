"use client";

import Link from "next/link";
import { useState } from "react";
import type { HubConfirmedEvent } from "@/lib/hub-confirmed-events";
import { enJa } from "@/lib/ui/bilingual";
import { MonthCalendar } from "./schedule/MonthCalendar";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

export function HubConfirmedCalendar({ events }: { events: HubConfirmedEvent[] }) {
  const [month, setMonth] = useState(() => new Date());

  return (
    <section className={`mb-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            {enJa("Confirmed events", "確定済みイベント")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {enJa("Read-only preview from Calendar of availability.", "Calendar of availability の閲覧用プレビューです。")}
          </p>
        </div>
        <Link
          href="/schedule"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {enJa("Open schedule", "予定調整を開く")} →
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          {enJa("No confirmed events yet", "確定済みのイベントはまだありません")}
        </p>
      ) : (
        <MonthCalendar month={month} events={events} onMonthChange={setMonth} />
      )}
    </section>
  );
}
