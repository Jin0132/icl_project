import type { AppEventCategory } from "@/lib/notion/notion-datetime";
import type { ConfirmedEvent } from "@/lib/notion/schedule-schema";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const CATEGORY_DOT: Record<AppEventCategory, string> = {
  MTG: "bg-blue-500",
  Event: "bg-orange-500",
  Other: "bg-slate-400",
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

export function MonthCalendar({
  month,
  events,
  onMonthChange,
}: {
  month: Date;
  events: Array<ConfirmedEvent & { category: AppEventCategory | null }>;
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

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-20 rounded-lg bg-transparent" />;
          }

          const dayEvents = eventsByDay.get(cell.dateKey) ?? [];

          return (
            <div
              key={cell.dateKey}
              className="min-h-20 rounded-lg border border-slate-100 bg-slate-50/60 p-1.5"
            >
              <p className="text-xs font-medium text-slate-600">{cell.dayNumber}</p>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] leading-tight text-slate-700"
                    title={event.name}
                  >
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                        CATEGORY_DOT[event.category ?? "Other"]
                      }`}
                    />
                    {event.name.replace(/^\[(MTG|Event|Other)\]\s/, "")}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">閲覧専用。編集は Notion で行ってください。</p>
    </div>
  );
}
