import { fetchPlannedEvents } from "@/lib/notion/event-marketing";
import { formatEventFeeYen } from "@/lib/event-pricing";
import { enJa } from "@/lib/ui/bilingual";

export const dynamic = "force-dynamic";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

function formatDate(date: string | null): string {
  if (!date) return enJa("Date TBD", "日付未定");
  const dateKey = date.slice(0, 10);
  const parsed = new Date(`${dateKey}T12:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;

  const en = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
  const ja = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);

  return enJa(en, ja);
}

export default async function PublicEventsPage() {
  let events: Awaited<ReturnType<typeof fetchPlannedEvents>> = [];
  let error: string | null = null;

  try {
    events = await fetchPlannedEvents();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load events";
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
            International Community Lab
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800 sm:text-3xl">
            {enJa("Upcoming events", "開催予定")}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
            {enJa(
              "Cultural exchange meetups in Tokyo. RSVP on Meetup — capacity is managed on each platform.",
              "東京での文化交流ミートアップ。申込・定員は Meetup などで管理しています。",
            )}
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!error && events.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500">
            {enJa(
              "No upcoming events scheduled yet. Check back soon.",
              "現在、公開中の予定はありません。しばらくしてから再度ご確認ください。",
            )}
          </p>
        )}

        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className={`rounded-2xl border border-slate-200 bg-white p-6 ${CARD_SHADOW}`}
            >
              <h2 className="text-lg font-semibold text-slate-800">
                {event.title || enJa("ICL Meetup", "ICL ミートアップ")}
              </h2>
              {event.summary && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{event.summary}</p>
              )}
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-500">
                    {enJa("When", "日時")}
                  </dt>
                  <dd>
                    {formatDate(event.date)}
                    {event.time ? ` · ${event.time}` : ""}
                  </dd>
                </div>
                {event.cafe && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("Where", "場所")}
                    </dt>
                    <dd>
                      {event.cafe}
                      {event.venueNote ? (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {event.venueNote}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-slate-500">
                    {enJa("Fee", "参加費")}
                  </dt>
                  <dd>
                    {formatEventFeeYen(event.feeYen)}
                    {enJa(" + 1 drink", "（＋ドリンク1杯）")}
                  </dd>
                </div>
                {event.language && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("Language", "言語")}
                    </dt>
                    <dd>{event.language}</dd>
                  </div>
                )}
                {event.audience && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("For", "対象")}
                    </dt>
                    <dd>{event.audience}</dd>
                  </div>
                )}
                {event.capacity != null && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("Capacity", "定員")}
                    </dt>
                    <dd>
                      {enJa(`About ${event.capacity}`, `約 ${event.capacity} 名`)}
                    </dd>
                  </div>
                )}
                {event.flow && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("Flow", "流れ")}
                    </dt>
                    <dd>{event.flow}</dd>
                  </div>
                )}
                {event.notesForGuests && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 font-medium text-slate-500">
                      {enJa("Notes", "注意")}
                    </dt>
                    <dd>{event.notesForGuests}</dd>
                  </div>
                )}
              </dl>
              {event.meetupUrl && (
                <a
                  href={event.meetupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  {enJa("RSVP on Meetup", "Meetupで申し込む")} →
                </a>
              )}
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          {enJa(
            "Hosted by International Community Lab · Tokyo",
            "International Community Lab · Tokyo",
          )}
        </p>
      </div>
    </main>
  );
}
