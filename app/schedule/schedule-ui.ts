/** スケジュール画面共通のデザイントークン（白基調・柔らかい影・パステル縁取り） */
export const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

export const CATEGORY_STYLES: Record<string, { border: string; pill: string }> = {
  "MTG / 定例MTG": {
    border: "border-l-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
  },
  "Event / イベント": {
    border: "border-l-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-100",
  },
  "Other / その他": {
    border: "border-l-slate-400",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export type CoordinationMode = "finalize" | "wide";
