import { NextResponse } from "next/server";
import { createProjectTask, fetchTasksResponse } from "@/lib/notion/project-tasks";
import type { ProjectTask, TasksApiResponse } from "@/lib/notion/project-schema";

type CreateTaskBody = {
  title?: string;
};

export async function GET(): Promise<NextResponse<TasksApiResponse | { error: string }>> {
  try {
    const response = await fetchTasksResponse();
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/tasks]", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch tasks from Notion";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<ProjectTask | { error: string }>> {
  try {
    const body = (await request.json()) as CreateTaskBody;
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await createProjectTask(title);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);

    const message =
      error instanceof Error ? error.message : "Failed to create task in Notion";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
