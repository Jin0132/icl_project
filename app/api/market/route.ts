import { NextResponse } from "next/server";
import {
  fetchPlannedEvents,
  markMarketingSent,
  type PlannedEvent,
} from "@/lib/notion/event-marketing";

export async function GET(): Promise<
  NextResponse<{ events: PlannedEvent[] } | { error: string }>
> {
  try {
    const events = await fetchPlannedEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load events" },
      { status: 500 },
    );
  }
}

type MarkBody = {
  eventId?: string;
  channel?: "meetup" | "instagram";
};

export async function PATCH(
  request: Request,
): Promise<NextResponse<PlannedEvent | { error: string }>> {
  try {
    const body = (await request.json()) as MarkBody;
    if (!body.eventId || (body.channel !== "meetup" && body.channel !== "instagram")) {
      return NextResponse.json(
        { error: "eventId and channel (meetup|instagram) are required" },
        { status: 400 },
      );
    }

    const event = await markMarketingSent({
      eventId: body.eventId,
      channel: body.channel,
    });
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 },
    );
  }
}
