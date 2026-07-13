import Link from "next/link";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

type HubDestination = {
  href: string;
  icon: string;
  title: string;
  titleJa: string;
  description: string;
  available: boolean;
  accent: string;
};

const DESTINATIONS: HubDestination[] = [
  {
    href: "/projects",
    icon: "📊",
    title: "Project Hub",
    titleJa: "課題・プロジェクト",
    description: "今週のタスク、議題、プロジェクト一覧の管理",
    available: true,
    accent: "border-l-blue-500 hover:border-blue-200",
  },
  {
    href: "/schedule",
    icon: "📅",
    title: "Team Schedule",
    titleJa: "予定調整",
    description: "候補日の調整、参加可能の回答、確定カレンダー",
    available: true,
    accent: "border-l-emerald-500 hover:border-emerald-200",
  },
  {
    href: "/ops",
    icon: "👥",
    title: "Team & Operations",
    titleJa: "メンバー・運営",
    description: "メンバー管理・運営（準備中）",
    available: false,
    accent: "border-l-violet-500",
  },
  {
    href: "/market",
    icon: "📣",
    title: "Market",
    titleJa: "マーケティング",
    description: "マーケ施策・広報（準備中）",
    available: false,
    accent: "border-l-orange-500",
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
            準備中
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          {destination.title}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-800">{destination.titleJa}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{destination.description}</p>
      </div>
      {destination.available && (
        <p className="mt-4 text-sm font-medium text-blue-600">開く →</p>
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

export default function HubPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center sm:mb-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
            ICL Internal Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[0.14em] text-slate-800 uppercase sm:text-3xl">
            ICL Hub
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
            見たい情報を選んでください。課題管理と予定調整はそれぞれ専用ページで操作できます。
          </p>

          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-0">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-300/70" />
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-300/70" />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {DESTINATIONS.map((destination) => (
            <HubCard key={destination.href} destination={destination} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          部署ごとの専用ページは順次追加予定です。
        </p>
      </div>
    </main>
  );
}
