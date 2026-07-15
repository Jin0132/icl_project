import {
  formatScheduleDateLabel,
  formatScheduleTimeRange,
  type AppEventCategory,
} from "@/lib/notion/notion-datetime";
import { APP_CONFIRMED_CALENDAR_TAG, type ConfirmedEvent } from "@/lib/notion/schedule-schema";
import { enJa } from "@/lib/ui/bilingual";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const CATEGORY_DOT: Record<AppEventCategory, string> = {
  MTG: "bg-blue-500",
  Event: "bg-orange-500",
  Other: "bg-slate-400",
};

const CATEGORY_LABEL: Record<AppEventCategory, string> = {
  MTG: enJa("MTG", "会議"),
  Event: enJa("Event", "イベント"),
  Other: enJa("Other", "その他"),
};

function toJapanDateKey(value: string): string {
  const datePart = value.slice(0, 10);
  if (!value.includes("T") && !value.includes(" ")) {
    return datePart;
  }

  const normalized = value.trim().replace(" ", "T");
  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(normalized);
  const date = new Date(hasOffset ? normalized : `${normalized}+09:00`);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function buildMonthGrid(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
      return null;
    }

    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    return { dateKey, dayNumber };
  });
}

function participantTags(tags: string[]): string[] {
  return tags.filter((tag) => tag !== APP_CONFIRMED_CALENDAR_TAG);
}

function EventChip({
  event,
}: {
  event: ConfirmedEvent & { category: AppEventCategory | null; displayTitle?: string };
}) {
  const displayTitle =
    event.displayTitle ?? event.name.replace(/^\[(MTG|Event|Other)\]\s/, "");
  const category = event.category ?? "Other";
  const participants = participantTags(event.tags);
  const dateLabel = formatScheduleDateLabel(event.start, event.isDatetime);
  const timeRange = formatScheduleTimeRange(event.start, event.end, event.isDatetime);
  const location = event.location?.trim() || null;

  return (
    <div className="group/event relative">
      <div className="cursor-default truncate rounded px-1 py-0.5 text-[10px] leading-tight text-slate-700 transition-colors group-hover/event:bg-white group-hover/event:shadow-sm">
        <span
          className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[category]}`}
        />
        {displayTitle}
      </div>

      <div
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-56 -translate-y-0.5 scale-95 rounded-xl border border-slate-200 bg-white p-2.5 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-150 group-hover/event:translate-y-0 group-hover/event:scale-100 group-hover/event:opacity-100"
        role="tooltip"
      >
        <p className="text-xs font-semibold text-slate-800">{displayTitle}</p>
        <p className="mt-1 text-[10px] text-slate-500">{CATEGORY_LABEL[category]}</p>

        <dl className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[10px]">
          <div>
            <dt className="text-slate-400">{enJa("Date", "日付")}</dt>
            <dd className="mt-0.5 font-medium text-slate-700">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{enJa("Time", "実施時間")}</dt>
            <dd className="mt-0.5 font-medium text-slate-700">{timeRange}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{enJa("Location", "場所")}</dt>
            <dd className={`mt-0.5 font-medium ${location ? "text-slate-700" : "text-slate-400"}`}>
              {location ?? enJa("Not set", "未設定")}
            </dd>
          </div>
        </dl>

        {participants.length > 0 && (
          <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-600">
            {participants.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function MonthCalendar({
  month,
  events,
  onMonthChange,
}: {
  month: Date;
  events: Array<ConfirmedEvent & { category: AppEventCategory | null; displayTitle?: string }>;
  onMonthChange: (next: Date) => void;
}) {
  const cells = buildMonthGrid(month);
  const eventsByDay = new Map<string, typeof events>();

  for (const event of events) {
    const key = toJapanDateKey(event.start);
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
  }).format(month);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ←
        </button>
        <h3 className="text-sm font-semibold text-slate-800">{monthLabel}</h3>
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

      <div className="mt-1 grid grid-cols-7 gap-1 overflow-visible">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-20 rounded-lg bg-transparent" />;
          }

          const dayEvents = eventsByDay.get(cell.dateKey) ?? [];

          return (
            <div
              key={cell.dateKey}
              className="min-h-20 overflow-visible rounded-lg border border-slate-100 bg-slate-50/60 p-1.5"
            >
              <p className="text-xs font-medium text-slate-600">{cell.dayNumber}</p>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {enJa(
          "Read-only. Hover an event for details. Edit in Notion.",
          "閲覧専用。イベントにホバーで詳細表示。編集は Notion で行ってください。",
        )}
      </p>
    </div>
  );
}
