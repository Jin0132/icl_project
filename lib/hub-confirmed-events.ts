import {
  parseAppEventCategory,
  stripAppEventPrefix,
  type AppEventCategory,
} from "@/lib/notion/notion-datetime";
import type { ConfirmedEvent } from "@/lib/notion/schedule-schema";

export type HubConfirmedEvent = ConfirmedEvent & {
  category: AppEventCategory | null;
  displayTitle: string;
};

export function serializeHubConfirmedEvents(
  confirmed: ConfirmedEvent[],
): HubConfirmedEvent[] {
  return confirmed.map((event) => ({
    ...event,
    category: parseAppEventCategory(event.name),
    displayTitle: stripAppEventPrefix(event.name),
  }));
}
