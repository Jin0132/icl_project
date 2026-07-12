import {
  isFullPage,
  type PageObjectResponse,
} from "@notionhq/client";
import { getNotionClient, getProjectDatabaseId, getProjectDataSourceId } from "./client";
import { parseProjectTask } from "./parse-project-task";
import { partitionTasks } from "./task-filters";
import {
  PROJECT_NOTION_PROPERTIES,
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

export async function createProjectTask(title: string): Promise<ProjectTask> {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("Title is required");
  }

  const notion = getNotionClient();
  const databaseId = getProjectDatabaseId();

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [PROJECT_NOTION_PROPERTIES.title]: {
        title: [{ text: { content: trimmedTitle.slice(0, 2000) } }],
      },
      [PROJECT_NOTION_PROPERTIES.done]: { checkbox: false },
      [PROJECT_NOTION_PROPERTIES.discussInMeeting]: { checkbox: false },
    },
  });

  if (!isFullPage(page)) {
    throw new Error("Created page is not accessible");
  }

  return parseProjectTask(page);
}
