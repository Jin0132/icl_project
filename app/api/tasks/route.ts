import {
  isFullPage,
  type FullDataSourceQueryFilter,
  type PageObjectResponse,
} from "@notionhq/client";
import { NextResponse } from "next/server";
import { getNotionClient, getProjectDatabaseId, getProjectDataSourceId } from "@/lib/notion/client";
import { parseProjectTask } from "@/lib/notion/parse-project-task";
import {
  PROJECT_NOTION_PROPERTIES,
  type TasksApiResponse,
} from "@/lib/notion/project-schema";

async function resolveProjectDataSourceId(): Promise<string> {
  const configuredDataSourceId = getProjectDataSourceId();
  if (configuredDataSourceId) {
    return configuredDataSourceId;
  }

  const notion = getNotionClient();
  const databaseId = getProjectDatabaseId();

  const database = await notion.databases.retrieve({
    database_id: databaseId,
  });

  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  return database.data_sources[0].id;
}

async function queryProjectPages(
  dataSourceId: string,
  filter: FullDataSourceQueryFilter,
): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter,
      sorts: [
        {
          property: PROJECT_NOTION_PROPERTIES.dueDate,
          direction: "ascending",
        },
      ],
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if (isFullPage(page)) {
        results.push(page);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

export async function GET(): Promise<NextResponse<TasksApiResponse | { error: string }>> {
  try {
    const databaseId = getProjectDatabaseId();
    const dataSourceId = await resolveProjectDataSourceId();

    const [thisWeekPages, meetingAgendaPages] = await Promise.all([
      queryProjectPages(dataSourceId, {
        and: [
          {
            property: PROJECT_NOTION_PROPERTIES.dueDate,
            date: { on_or_after: "today" },
          },
          {
            property: PROJECT_NOTION_PROPERTIES.dueDate,
            date: { on_or_before: "one_week_from_now" },
          },
          {
            property: PROJECT_NOTION_PROPERTIES.done,
            checkbox: { equals: false },
          },
        ],
      }),
      queryProjectPages(dataSourceId, {
        property: PROJECT_NOTION_PROPERTIES.discussInMeeting,
        checkbox: { equals: true },
      }),
    ]);

    const thisWeekTasks = thisWeekPages.map(parseProjectTask);
    const meetingAgenda = meetingAgendaPages.map(parseProjectTask);

    const response: TasksApiResponse = {
      thisWeekTasks,
      meetingAgenda,
      meta: {
        fetchedAt: new Date().toISOString(),
        thisWeekTasksCount: thisWeekTasks.length,
        meetingAgendaCount: meetingAgenda.length,
        databaseId,
        dataSourceId,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/tasks]", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch tasks from Notion";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
