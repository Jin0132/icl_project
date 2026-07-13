import { NextResponse } from "next/server";
import { cancelDraft, removeAvailability } from "@/lib/notion/schedule";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "available") {
      await removeAvailability(id);
    } else {
      await cancelDraft(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/schedule/[id]]", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete schedule entry";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
