import { NextResponse } from "next/server";
import {
  createPlannedEvent,
  fetchPlannedEvents,
  markMarketingSent,
  setMarketingDone,
  type CreatePlannedEventInput,
  type PlannedEvent,
} from "@/lib/notion/event-marketing";

export async function GET(
  request: Request,
): Promise<NextResponse<{ events: PlannedEvent[] } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "1";
    const events = await fetchPlannedEvents({ includeDone });
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
  action?: "complete" | "reopen";
};

export async function PATCH(
  request: Request,
): Promise<NextResponse<PlannedEvent | { error: string }>> {
  try {
    const body = (await request.json()) as MarkBody;
    if (!body.eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    if (body.action === "complete" || body.action === "reopen") {
      const event = await setMarketingDone({
        eventId: body.eventId,
        done: body.action === "complete",
      });
      return NextResponse.json(event);
    }

    if (body.channel !== "meetup" && body.channel !== "instagram") {
      return NextResponse.json(
        { error: "channel (meetup|instagram) or action (complete|reopen) is required" },
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

export async function POST(
  request: Request,
): Promise<NextResponse<PlannedEvent | { error: string }>> {
  try {
    const body = (await request.json()) as CreatePlannedEventInput;
    if (!body.title?.trim() || !body.date?.trim()) {
      return NextResponse.json(
        { error: "title and date are required" },
        { status: 400 },
      );
    }

    const event = await createPlannedEvent(body);
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create" },
      { status: 500 },
    );
  }
}
