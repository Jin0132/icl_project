import {
  isFullPage,
  type PageObjectResponse,
} from "@notionhq/client";
import { getNotionClient, getProjectDatabaseId, getProjectDataSourceId } from "./client";
import { parseProjectTask } from "./parse-project-task";
import { partitionTasks } from "./task-filters";
import {
  PROJECT_NOTION_PROPERTIES,
  type PersonInCharge,
  type ProjectCategory,
  type ProjectTask,
  type TasksApiResponse,
} from "./project-schema";

export async function resolveProjectDataSourceId(): Promise<string> {
  const configuredDataSourceId = getProjectDataSourceId();
  if (configuredDataSourceId) {
    return configuredDataSourceId;
  }

  const notion = getNotionClient();
  const databaseId = getProjectDatabaseId();
  const database = await notion.databases.retrieve({ database_id: databaseId });

  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  return database.data_sources[0].id;
}

async function queryAllProjectPages(dataSourceId: string): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [
        {
          property: PROJECT_NOTION_PROPERTIES.title,
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

export async function fetchTasksResponse(): Promise<TasksApiResponse> {
  const databaseId = getProjectDatabaseId();
  const dataSourceId = await resolveProjectDataSourceId();
  const pages = await queryAllProjectPages(dataSourceId);
  const allTasks = pages.map(parseProjectTask);
  const { allTasks: activeTasks, thisWeekTasks, meetingAgenda } =
    partitionTasks(allTasks);

  return {
    allTasks: activeTasks,
    thisWeekTasks,
    meetingAgenda,
    meta: {
      fetchedAt: new Date().toISOString(),
      allTasksCount: activeTasks.length,
      thisWeekTasksCount: thisWeekTasks.length,
      meetingAgendaCount: meetingAgenda.length,
      databaseId,
      dataSourceId,
    },
  };
}

export type CreateProjectTaskInput = {
  title: string;
  category?: ProjectCategory | null;
  personInCharge?: PersonInCharge | null;
  dueDate?: string | null;
  memo?: string | null;
  discussInMeeting?: boolean;
};

export async function createProjectTask(
  titleOrInput: string | CreateProjectTaskInput,
): Promise<ProjectTask> {
  const input =
    typeof titleOrInput === "string"
      ? { title: titleOrInput }
      : titleOrInput;
  const trimmedTitle = input.title.trim();

  if (!trimmedTitle) {
    throw new Error("Title is required");
  }

  const notion = getNotionClient();
  const databaseId = getProjectDatabaseId();

  const properties: Record<string, unknown> = {
    [PROJECT_NOTION_PROPERTIES.title]: {
      title: [{ text: { content: trimmedTitle.slice(0, 2000) } }],
    },
    [PROJECT_NOTION_PROPERTIES.done]: { checkbox: false },
    [PROJECT_NOTION_PROPERTIES.discussInMeeting]: {
      checkbox: Boolean(input.discussInMeeting),
    },
  };

  if (input.category) {
    properties[PROJECT_NOTION_PROPERTIES.category] = {
      select: { name: input.category },
    };
  }

  if (input.personInCharge) {
    properties[PROJECT_NOTION_PROPERTIES.personInCharge] = {
      select: { name: input.personInCharge },
    };
  }

  if (input.dueDate) {
    properties[PROJECT_NOTION_PROPERTIES.dueDate] = {
      date: { start: input.dueDate },
    };
  }

  if (input.memo?.trim()) {
    properties[PROJECT_NOTION_PROPERTIES.memo] = {
      rich_text: [{ text: { content: input.memo.trim().slice(0, 2000) } }],
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });

  if (!isFullPage(page)) {
    throw new Error("Created page is not accessible");
  }

  return parseProjectTask(page);
}
