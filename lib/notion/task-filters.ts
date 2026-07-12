import type { ProjectTask, TasksApiResponse } from "./project-schema";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDueDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function isDueInSevenDays(task: ProjectTask, now = new Date()): boolean {
  if (task.done || !task.dueDate) {
    return false;
  }

  const today = startOfDay(now);
  const due = parseDueDate(task.dueDate);
  const end = new Date(today);
  end.setDate(end.getDate() + 7);

  return due >= today && due <= end;
}

export function isMeetingAgenda(task: ProjectTask): boolean {
  return task.discussInMeeting;
}

export function partitionTasks(allTasks: ProjectTask[]) {
  return {
    thisWeekTasks: allTasks.filter((task) => isDueInSevenDays(task)),
    meetingAgenda: allTasks.filter(isMeetingAgenda),
  };
}

export function normalizeTasksResponse(
  json: Partial<TasksApiResponse> &
    Pick<TasksApiResponse, "thisWeekTasks" | "meetingAgenda" | "meta">,
): TasksApiResponse {
  if (Array.isArray(json.allTasks)) {
    return json as TasksApiResponse;
  }

  const byId = new Map<string, ProjectTask>();
  for (const task of [...json.thisWeekTasks, ...json.meetingAgenda]) {
    byId.set(task.id, task);
  }

  const allTasks = [...byId.values()].sort((left, right) =>
    left.title.localeCompare(right.title, "en"),
  );

  return {
    allTasks,
    thisWeekTasks: json.thisWeekTasks,
    meetingAgenda: json.meetingAgenda,
    meta: {
      ...json.meta,
      allTasksCount: allTasks.length,
      thisWeekTasksCount: json.thisWeekTasks.length,
      meetingAgendaCount: json.meetingAgenda.length,
    },
  };
}
