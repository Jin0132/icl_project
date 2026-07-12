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

export function isActiveTask(task: ProjectTask): boolean {
  return !task.done;
}

export function isMeetingAgenda(task: ProjectTask): boolean {
  return task.discussInMeeting && isActiveTask(task);
}

export function partitionTasks(allTasks: ProjectTask[]) {
  const activeTasks = allTasks.filter(isActiveTask);

  return {
    allTasks: activeTasks,
    thisWeekTasks: activeTasks.filter((task) => isDueInSevenDays(task)),
    meetingAgenda: activeTasks.filter(isMeetingAgenda),
  };
}

export function normalizeTasksResponse(
  json: Partial<TasksApiResponse> &
    Pick<TasksApiResponse, "thisWeekTasks" | "meetingAgenda" | "meta">,
): TasksApiResponse {
  if (Array.isArray(json.allTasks)) {
    return buildTasksResponseFromPartitions(json.allTasks, json);
  }

  const byId = new Map<string, ProjectTask>();
  for (const task of [...json.thisWeekTasks, ...json.meetingAgenda]) {
    byId.set(task.id, task);
  }

  const allTasks = [...byId.values()].sort((left, right) =>
    left.title.localeCompare(right.title, "en"),
  );

  return buildTasksResponseFromPartitions(allTasks, json);
}

function buildTasksResponseFromPartitions(
  allTasks: ProjectTask[],
  json: Pick<TasksApiResponse, "meta">,
): TasksApiResponse {
  const {
    allTasks: activeTasks,
    thisWeekTasks,
    meetingAgenda,
  } = partitionTasks(allTasks);

  return {
    allTasks: activeTasks,
    thisWeekTasks,
    meetingAgenda,
    meta: {
      ...json.meta,
      allTasksCount: activeTasks.length,
      thisWeekTasksCount: thisWeekTasks.length,
      meetingAgendaCount: meetingAgenda.length,
    },
  };
}
