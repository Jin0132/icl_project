import { NextResponse } from "next/server";
import { confirmCandidate } from "@/lib/notion/schedule";
import type { ConfirmedEvent, ScheduleDraft } from "@/lib/notion/schedule-schema";

type ConfirmBody = {
  candidateId?: string;
};

export async function POST(
  request: Request,
): Promise<
  NextResponse<
    | { confirmedEvent: ConfirmedEvent; candidate: ScheduleDraft }
    | { error: string }
  >
> {
  try {
    const body = (await request.json()) as ConfirmBody;
    const candidateId = body.candidateId?.trim();

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    const result = await confirmCandidate(candidateId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/schedule/confirm]", error);

    const message =
      error instanceof Error ? error.message : "Failed to confirm schedule";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
