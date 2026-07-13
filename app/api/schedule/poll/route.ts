import { NextResponse } from "next/server";
import { cancelPoll } from "@/lib/notion/schedule";

export async function DELETE(
  request: Request,
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  try {
    const pollId = new URL(request.url).searchParams.get("pollId")?.trim();

    if (!pollId) {
      return NextResponse.json({ error: "pollId is required" }, { status: 400 });
    }

    await cancelPoll(pollId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/schedule/poll]", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete schedule poll";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
