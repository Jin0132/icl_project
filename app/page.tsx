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
    descriptionEn: "Weekly tasks, meeting agenda, and project tracker",
    descriptionJa: "今週のタスク、議題、プロジェクト一覧の管理",
    available: true,
    accent: "border-l-blue-500 hover:border-blue-200",
  },
  {
    href: "/schedule",
    icon: "📅",
    title: enJa("Team Schedule", "予定調整"),
    descriptionEn: "Poll candidate dates, mark availability, view confirmed events",
    descriptionJa: "候補日の調整、参加可能の回答、確定カレンダー",
    available: true,
    accent: "border-l-emerald-500 hover:border-emerald-200",
  },
  {
    href: "/ops",
    icon: "👥",
    title: enJa("Team & Operations", "メンバー・運営"),
    descriptionEn: "Member and operations management",
    descriptionJa: "メンバー管理・運営",
    available: false,
    accent: "border-l-violet-500",
  },
  {
    href: "/market",
    icon: "📣",
    title: enJa("Market", "マーケティング"),
    descriptionEn: "Generate Meetup / Instagram copy and mark posts as sent",
    descriptionJa: "Meetup / Instagram 文案の生成と送付済み管理",
    available: true,
    accent: "border-l-orange-500 hover:border-orange-200",
  },
];

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
            Choose a workspace to open. Project tasks and team scheduling live on separate pages.
          </p>
          <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">
            見たい情報を選んでください。課題管理と予定調整はそれぞれ専用ページで操作できます。
          </p>

          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-0">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-300/70" />
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-300/70" />
          </div>
        </header>

        <HubCalendar initialConfirmed={confirmedEvents} />

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
