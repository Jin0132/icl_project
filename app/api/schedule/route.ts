import { NextResponse } from "next/server";
import {
  createCandidateSlot,
  fetchScheduleResponse,
  markAvailable,
  markEventDecline,
  toggleHubFreeSlot,
} from "@/lib/notion/schedule";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_MEMBERS,
  type ScheduleApiResponse,
  type ScheduleCategory,
  type ScheduleDraft,
  type ScheduleMember,
} from "@/lib/notion/schedule-schema";

type CreateScheduleBody = {
  action?: "candidate" | "available" | "decline" | "hub-free";
  title?: string;
  category?: ScheduleCategory;
  person?: ScheduleMember;
  start?: string;
  end?: string | null;
  pollId?: string;
  memo?: string;
  candidateId?: string;
  collectionId?: string;
};

function isScheduleCategory(value: string): value is ScheduleCategory {
  return SCHEDULE_CATEGORIES.includes(value as ScheduleCategory);
}

function isScheduleMember(value: string): value is ScheduleMember {
  return SCHEDULE_MEMBERS.includes(value as ScheduleMember);
}

export async function GET(): Promise<
  NextResponse<ScheduleApiResponse | { error: string }>
> {
  try {
    const response = await fetchScheduleResponse();
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/schedule]", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch schedule data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
): Promise<
  NextResponse<
    | ScheduleDraft
    | { action: "created" | "removed"; slot: import("@/lib/notion/schedule-schema").HubFreeSlot | null }
    | { error: string }
  >
> {
  try {
    const body = (await request.json()) as CreateScheduleBody;
    const action = body.action ?? "candidate";

    if (action === "available") {
      if (!body.candidateId || !body.person || !isScheduleMember(body.person)) {
        return NextResponse.json(
          { error: "candidateId and person are required" },
          { status: 400 },
        );
      }

      const draft = await markAvailable({
        candidateId: body.candidateId,
        person: body.person,
      });

      return NextResponse.json(draft, { status: 201 });
    }

    if (action === "decline") {
      if (!body.candidateId || !body.person || !isScheduleMember(body.person)) {
        return NextResponse.json(
          { error: "candidateId and person are required" },
          { status: 400 },
        );
      }

      const draft = await markEventDecline({
        candidateId: body.candidateId,
        person: body.person,
      });

      return NextResponse.json(draft, { status: 201 });
    }

    if (action === "hub-free") {
      const start = body.start?.trim();
      const collectionId = body.collectionId?.trim();

      if (!start || !collectionId || !body.person || !isScheduleMember(body.person)) {
        return NextResponse.json(
          { error: "start, collectionId, and person are required" },
          { status: 400 },
        );
      }

      const result = await toggleHubFreeSlot({
        person: body.person,
        start,
        collectionId,
      });

      return NextResponse.json(result, { status: result.action === "created" ? 201 : 200 });
    }

    const title = body.title?.trim();
    const start = body.start?.trim();

    if (!title || !start || !body.category || !body.person) {
      return NextResponse.json(
        { error: "title, category, person, and start are required" },
        { status: 400 },
      );
    }

    if (!isScheduleCategory(body.category) || !isScheduleMember(body.person)) {
      return NextResponse.json({ error: "Invalid category or person" }, { status: 400 });
    }

    const draft = await createCandidateSlot({
      title,
      category: body.category,
      person: body.person,
      start,
      end: body.end ?? null,
      pollId: body.pollId,
      memo: body.memo,
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("[POST /api/schedule]", error);

    const message =
      error instanceof Error ? error.message : "Failed to create schedule entry";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
