/**
 * Project database schema (Notion: Project Tracker > Project)
 * @see icl_doc/notion_schema.md
 */

/** Notion property names as defined in the database schema */
export const PROJECT_NOTION_PROPERTIES = {
  title: "Title / 名前",
  category: "Category",
  personInCharge: "Person in charge",
  /** User-facing label: "Due Date" */
  dueDate: "Date / 日付",
  /** User-facing label: "Next Meeting Agenda" */
  discussInMeeting: "Next Meeting Agenda / 次回議題",
  /** User-facing label: "Done" */
  done: "Done / 完了",
  memo: "Memo",
} as const;

export type ProjectNotionPropertyName =
  (typeof PROJECT_NOTION_PROPERTIES)[keyof typeof PROJECT_NOTION_PROPERTIES];

export type PersonInCharge = "Asaka" | "Makiko" | "Theo" | "All";

export type ProjectCategory = "Define Company";

/** Clean JSON shape returned to the frontend */
export interface ProjectTask {
  id: string;
  title: string;
  dueDate: string | null;
  dueDateEnd: string | null;
  discussInMeeting: boolean;
  done: boolean;
  category: ProjectCategory | null;
  personInCharge: PersonInCharge | null;
  memo: string | null;
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface TasksApiResponse {
  thisWeekTasks: ProjectTask[];
  meetingAgenda: ProjectTask[];
  meta: {
    fetchedAt: string;
    thisWeekTasksCount: number;
    meetingAgendaCount: number;
    databaseId: string;
    dataSourceId: string;
  };
}
