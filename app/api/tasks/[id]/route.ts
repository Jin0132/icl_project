import { isFullPage } from "@notionhq/client";
import { NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion/client";
import { parseProjectTask } from "@/lib/notion/parse-project-task";
import {
  PROJECT_NOTION_PROPERTIES,
  type ProjectTask,
} from "@/lib/notion/project-schema";

type UpdateTaskBody = {
  done?: boolean;
  discussInMeeting?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ProjectTask | { error: string }>> {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateTaskBody;

    if (typeof body.done !== "boolean" && typeof body.discussInMeeting !== "boolean") {
      return NextResponse.json(
        { error: "At least one of done or discussInMeeting must be provided" },
        { status: 400 },
      );
    }

    const properties: Record<string, { checkbox: boolean }> = {};

    if (typeof body.done === "boolean") {
      properties[PROJECT_NOTION_PROPERTIES.done] = { checkbox: body.done };
    }

    if (typeof body.discussInMeeting === "boolean") {
      properties[PROJECT_NOTION_PROPERTIES.discussInMeeting] = {
        checkbox: body.discussInMeeting,
      };
    }

    const notion = getNotionClient();
    const page = await notion.pages.update({
      page_id: id,
      properties,
    });

    if (!isFullPage(page)) {
      return NextResponse.json({ error: "Updated page is not accessible" }, { status: 500 });
    }

    return NextResponse.json(parseProjectTask(page));
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]]", error);

    const message =
      error instanceof Error ? error.message : "Failed to update task in Notion";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
