/** Default participation fee (yen). Floor for all events unless a concept warrants more. */
export const DEFAULT_EVENT_FEE_YEN = 1000;

export function formatEventFeeYen(feeYen: number = DEFAULT_EVENT_FEE_YEN): string {
  return `¥${feeYen.toLocaleString("en-US")}`;
}

export function formatEventFeeLineEn(feeYen: number = DEFAULT_EVENT_FEE_YEN): string {
  return `Fee: ${formatEventFeeYen(feeYen)} + 1 drink`;
}

export function formatEventFeeLineJa(feeYen: number = DEFAULT_EVENT_FEE_YEN): string {
  return `参加費 ${formatEventFeeYen(feeYen)}（＋ドリンク1杯）`;
}
