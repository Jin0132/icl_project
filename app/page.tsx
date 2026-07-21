import Link from "next/link";
import { serializeHubConfirmedEvents } from "@/lib/hub-confirmed-events";
import { fetchScheduleResponse } from "@/lib/notion/schedule";
import { enJa } from "@/lib/ui/bilingual";
import { HubCalendar } from "./HubCalendar";

export const dynamic = "force-dynamic";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

type HubDestination = {
  href: string;
  icon: string;
  title: string;
  descriptionEn: string;
  descriptionJa: string;
  available: boolean;
  accent: string;
};

const DESTINATIONS: HubDestination[] = [
  {
    href: "/projects",
    icon: "📊",
    title: enJa("Project Hub", "課題・プロジェクト"),
    descriptionEn: "Add tasks (bottom Add button), weekly due list, meeting agenda",
    descriptionJa: "タスク追加（下の「追加」）、今週期限、議題",
    available: true,
    accent: "border-l-blue-500 hover:border-blue-200",
  },
  {
    href: "/market",
    icon: "📣",
    title: enJa("Market", "マーケティング"),
    descriptionEn: "Create events, copy Meetup / IG text, mark complete when done",
    descriptionJa: "イベント作成、文案コピー、投稿後「完了」",
    available: true,
    accent: "border-l-orange-500 hover:border-orange-200",
  },
  {
    href: "/schedule",
    icon: "📅",
    title: enJa("Team Schedule", "予定調整"),
    descriptionEn: "Poll candidate dates, mark availability (ops team only)",
    descriptionJa: "候補日の出欠回答（運営メンバー向け）",
    available: true,
    accent: "border-l-emerald-500 hover:border-emerald-200",
  },
  {
    href: "/ops",
    icon: "👥",
    title: enJa("Team & Operations", "メンバー・運営"),
    descriptionEn: "Use Notion Team & Ops for now",
    descriptionJa: "当面は Notion の Team & Ops を利用",
    available: false,
    accent: "border-l-violet-500",
  },
];

const QUICK_GUIDE = [
  {
    wantEn: "Add a task",
    wantJa: "タスクを追加",
    whereEn: "Projects → Add button at bottom",
    whereJa: "Projects → 下の「追加」",
  },
  {
    wantEn: "Post next event",
    wantJa: "イベント告知",
    whereEn: "Market → create or open event → copy text → Complete",
    whereJa: "Market → 作成 or 開く → 文案コピー → 完了",
  },
  {
    wantEn: "Team MTG & free slots",
    wantJa: "運営MTG・空き",
    whereEn: "Calendar above (Phase 1–3)",
    whereJa: "上のカレンダー（Phase 1–3）",
  },
  {
    wantEn: "After event — numbers",
    wantJa: "開催後の数字",
    whereEn: "Notion → Event Log",
    whereJa: "Notion → Event Log",
  },
] as const;

function HubCard({ destination }: { destination: HubDestination }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {destination.icon}
        </span>
        {!destination.available && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {enJa("Coming soon", "準備中")}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-semibold text-slate-800">{destination.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{destination.descriptionEn}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{destination.descriptionJa}</p>
      </div>
      {destination.available && (
        <p className="mt-4 text-sm font-medium text-blue-600">{enJa("Open", "開く")} →</p>
      )}
    </>
  );

  const className = `block rounded-2xl border border-slate-200 border-l-4 bg-white p-6 text-left transition-all ${CARD_SHADOW} ${
    destination.available
      ? `${destination.accent} hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]`
      : `${destination.accent} cursor-not-allowed opacity-60`
  }`;

  if (!destination.available) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={destination.href} className={className}>
      {content}
    </Link>
  );
}

export default async function HubPage() {
  let confirmedEvents = serializeHubConfirmedEvents([]);

  try {
    const data = await fetchScheduleResponse();
    confirmedEvents = serializeHubConfirmedEvents(data.confirmed);
  } catch {
    confirmedEvents = [];
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center sm:mb-10">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
            ICL Internal Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[0.14em] text-slate-800 uppercase sm:text-3xl">
            ICL Hub
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Daily ops start here. Notion = records & playbooks (see guide below).
          </p>
          <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">
            日常作業はここから。記録・手順は Notion（下の早見表参照）。
          </p>

          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-0">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-300/70" />
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-300/70" />
          </div>
        </header>

        <HubCalendar initialConfirmed={confirmedEvents} />

        <section
          className={`mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}
          aria-label={enJa("Where to look", "何を見るか")}
        >
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
            {enJa("Where to look", "何を見るか")}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {enJa("Quick map — full guide in Notion ICL Master", "早見表 — 詳細は Notion ICL Master")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-2 pr-4 font-medium">{enJa("I want to…", "やりたいこと")}</th>
                  <th className="pb-2 font-medium">{enJa("Open", "開く場所")}</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {QUICK_GUIDE.map((row) => (
                  <tr key={row.wantEn} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 align-top">
                      <span className="block">{row.wantEn}</span>
                      <span className="block text-xs text-slate-400">{row.wantJa}</span>
                    </td>
                    <td className="py-2.5 align-top">
                      <span className="block">{row.whereEn}</span>
                      <span className="block text-xs text-slate-400">{row.whereJa}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {DESTINATIONS.map((destination) => (
            <HubCard key={destination.href} destination={destination} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          {enJa("Department pages will be added over time.", "部署ごとの専用ページは順次追加予定です。")}
        </p>
      </div>
    </main>
  );
}
