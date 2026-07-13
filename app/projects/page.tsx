"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import type { ProjectTask, TasksApiResponse } from "@/lib/notion/project-schema";
import { normalizeTasksResponse, partitionTasks } from "@/lib/notion/task-filters";

type LoadState = "loading" | "success" | "error";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

const TASK_ACCENTS = [
  {
    border: "border-l-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    border: "border-l-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    border: "border-l-violet-500",
    pill: "bg-violet-50 text-violet-700 border-violet-100",
  },
] as const;

const AGENDA_ICONS = ["💡", "🚀", "💻", "🗣️", "📋"] as const;

function formatShortDueDate(date: string | null): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDueDate(date: string | null): string {
  if (!date) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getCategoryStyle(category: string | null, index: number) {
  const normalized = category?.toLowerCase() ?? "";

  if (normalized.includes("market")) {
    return TASK_ACCENTS[1];
  }
  if (normalized.includes("research") || normalized.includes("company")) {
    return TASK_ACCENTS[2];
  }
  if (normalized.includes("develop") || normalized.includes("define")) {
    return TASK_ACCENTS[0];
  }

  return TASK_ACCENTS[index % TASK_ACCENTS.length];
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

function formatErrorMessage(message: string): string {
  if (message.includes("shared with your integration")) {
    return "Notion の Project データベースが API 連携と共有されていません。Notion でデータベースを開き、「…」→「コネクト」から連携を追加してください。";
  }

  if (message.includes("NOTION_API_KEY")) {
    return ".env.local に NOTION_API_KEY が設定されていません。";
  }

  if (message.includes("NOTION_DATABASE_ID")) {
    return ".env.local に NOTION_DATABASE_ID が設定されていません。";
  }

  return message;
}

function buildTasksResponse(allTasks: ProjectTask[], meta: TasksApiResponse["meta"]): TasksApiResponse {
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
      ...meta,
      allTasksCount: activeTasks.length,
      thisWeekTasksCount: thisWeekTasks.length,
      meetingAgendaCount: meetingAgenda.length,
    },
  };
}

function mergeTaskLists(
  data: TasksApiResponse,
  updatedTask: ProjectTask,
): TasksApiResponse {
  const allTasks = (data.allTasks ?? []).map((task) =>
    task.id === updatedTask.id ? updatedTask : task,
  );

  return buildTasksResponse(allTasks, data.meta);
}

function appendTask(data: TasksApiResponse, newTask: ProjectTask): TasksApiResponse {
  const allTasks = [...(data.allTasks ?? []), newTask].sort((left, right) =>
    left.title.localeCompare(right.title, "en"),
  );

  return buildTasksResponse(allTasks, data.meta);
}

function StatusLabel({ state }: { state: LoadState }) {
  const label =
    state === "loading" ? "Syncing" : state === "error" ? "Offline" : "Active";

  const color =
    state === "loading"
      ? "text-amber-500"
      : state === "error"
        ? "text-red-500"
        : "text-teal-500";

  return (
    <p className="mt-2 text-sm text-slate-500">
      Current Status:{" "}
      <span className={`font-medium ${color}`}>{label}</span>
    </p>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4 px-6 py-3.5">
      <p className="pt-0.5 text-xs font-medium text-slate-400">{label}</p>
      <div className="min-w-0 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function CheckboxProperty({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
}) {
  return (
    <PropertyRow label={label}>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          void Promise.resolve(onChange(!checked)).catch((error) => {
            console.error("[TaskDetailModal] checkbox update failed", error);
          });
        }}
        className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        aria-pressed={checked}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
            checked
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-slate-300 bg-white text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="text-slate-700">{checked ? "Yes" : "No"}</span>
      </button>
    </PropertyRow>
  );
}

function DoneConfirmDialog({
  taskTitle,
  saving,
  onCancel,
  onConfirm,
}: {
  taskTitle: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 p-6 backdrop-blur-[1px]">
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-900">Doneにしますか？</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
          今後この課題はここでは表示されません。復元には Notion から直接チェックを外してください。
        </p>
        <p className="mt-3 truncate text-xs text-amber-800/70">{taskTitle}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void Promise.resolve(onConfirm()).catch((error) => {
                console.error("[DoneConfirmDialog] confirm failed", error);
              });
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "処理中…" : "Doneにする"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({
  task,
  saving,
  saveError,
  onClose,
  onUpdate,
}: {
  task: ProjectTask;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onUpdate: (changes: UpdateTaskBody) => Promise<boolean>;
}) {
  const [showDoneConfirm, setShowDoneConfirm] = useState(false);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close task details"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        className={`relative flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${CARD_SHADOW}`}
      >
        {showDoneConfirm && (
          <DoneConfirmDialog
            taskTitle={task.title || "Untitled"}
            saving={saving}
            onCancel={() => setShowDoneConfirm(false)}
            onConfirm={async () => {
              const closed = await onUpdate({ done: true });
              if (closed) {
                setShowDoneConfirm(false);
              }
            }}
          />
        )}

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Project Task
            </p>
            <h2
              id="task-detail-title"
              className="mt-1 text-xl font-semibold leading-snug text-slate-900"
            >
              {task.title || "Untitled"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
          <PropertyRow label="Category">
            {task.category ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {task.category}
              </span>
            ) : (
              <span className="text-slate-400">Empty</span>
            )}
          </PropertyRow>

          <PropertyRow label="Due Date">
            <span className="font-medium">{formatDueDate(task.dueDate)}</span>
          </PropertyRow>

          <CheckboxProperty
            label="Next Meeting Agenda"
            checked={task.discussInMeeting}
            disabled={saving}
            onChange={(checked) => {
              void onUpdate({ discussInMeeting: checked });
            }}
          />

          <CheckboxProperty
            label="Done"
            checked={task.done}
            disabled={saving || showDoneConfirm}
            onChange={(checked) => {
              if (checked) {
                setShowDoneConfirm(true);
              }
            }}
          />

          <PropertyRow label="Person in charge">
            {task.personInCharge ?? <span className="text-slate-400">Empty</span>}
          </PropertyRow>

          <PropertyRow label="Memo">
            {task.memo ? (
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{task.memo}</p>
            ) : (
              <span className="text-slate-400">Empty</span>
            )}
          </PropertyRow>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-3">
          {saveError ? (
            <p className="text-xs text-red-500">{saveError}</p>
          ) : saving ? (
            <p className="text-xs text-slate-400">Saving changes…</p>
          ) : (
            <p className="text-xs text-slate-400">
              Changes sync to Notion automatically. No login required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type UpdateTaskBody = {
  done?: boolean;
  discussInMeeting?: boolean;
};

function TaskCard({
  task,
  index,
  onOpen,
}: {
  task: ProjectTask;
  index: number;
  onOpen: (task: ProjectTask) => void;
}) {
  const accent = getCategoryStyle(task.category, index);

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={`group relative block w-full rounded-xl border border-slate-100 border-l-4 bg-white px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] ${CARD_SHADOW} ${accent.border}`}
    >
      <div
        className={`absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded border text-[10px] ${
          task.done
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-slate-200 bg-white text-slate-300"
        }`}
      >
        {task.done ? "✓" : "☐"}
      </div>

      <h3 className="pr-8 text-[15px] font-semibold leading-snug text-slate-800 group-hover:text-slate-900">
        {task.title || "Untitled"}
      </h3>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        {task.category && (
          <span
            className={`rounded-full border px-2.5 py-1 font-medium ${accent.pill}`}
          >
            {task.category}
          </span>
        )}
        <span className="text-slate-500">
          Due:{" "}
          <span className="font-medium text-slate-700">
            {formatDueDate(task.dueDate)}
          </span>
        </span>
      </div>
    </button>
  );
}

function AgendaCard({
  task,
  index,
  onOpen,
}: {
  task: ProjectTask;
  index: number;
  onOpen: (task: ProjectTask) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={`group relative block w-full rounded-xl border border-red-200/80 bg-white px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-[0_8px_28px_rgba(239,68,68,0.08)] ${CARD_SHADOW}`}
    >
      <span className="absolute top-4 right-4 text-lg opacity-80">
        {AGENDA_ICONS[index % AGENDA_ICONS.length]}
      </span>

      <p className="pr-10 text-[15px] font-medium leading-snug text-slate-800 group-hover:text-slate-900">
        {task.title || "Untitled"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {task.personInCharge && <span>Owner: {task.personInCharge}</span>}
        {task.dueDate && (
          <span>Due: {formatDueDate(task.dueDate)}</span>
        )}
      </div>
    </button>
  );
}

function PanelSkeleton({ variant }: { variant: "task" | "agenda" }) {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-[88px] animate-pulse rounded-xl bg-white/80 ${
            variant === "agenda" ? "border border-red-100" : "border-l-4 border-l-slate-200"
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-slate-700 uppercase">
      <span className="text-base">{icon}</span>
      {title}
    </h2>
  );
}

function AllTasksTable({
  tasks,
  onOpen,
}: {
  tasks: ProjectTask[];
  onOpen: (task: ProjectTask) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] tracking-[0.12em] text-slate-400 uppercase">
            <th className="px-4 py-3 font-medium">Task</th>
            <th className="px-3 py-3 font-medium">Due</th>
            <th className="px-3 py-3 font-medium text-center">Done</th>
            <th className="px-4 py-3 font-medium text-center">Agenda</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpen(task)}
                  className="max-w-[28rem] truncate text-left font-medium text-slate-800 transition-colors hover:text-blue-600"
                >
                  {task.title || "Untitled"}
                </button>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-slate-500">
                {formatShortDueDate(task.dueDate)}
              </td>
              <td className="px-3 py-3 text-center text-slate-500">
                {task.done ? "✓" : "—"}
              </td>
              <td className="px-4 py-3 text-center text-slate-500">
                {task.discussInMeeting ? "✓" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<TasksApiResponse | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/tasks");

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      const json = normalizeTasksResponse((await response.json()) as TasksApiResponse);
      setData(json);
      setLoadState("success");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        formatErrorMessage(
          toErrorMessage(error, "Failed to load tasks"),
        ),
      );
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleTaskUpdate(changes: UpdateTaskBody): Promise<boolean> {
    if (!selectedTask || !data) return false;

    setSavingTask(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Update failed (${response.status})`);
      }

      const updatedTask = (await response.json()) as ProjectTask;
      const nextData = mergeTaskLists(data, updatedTask);

      setData(nextData);

      if (changes.done) {
        setSelectedTask(null);
        setSaveError(null);
        return true;
      }

      setSelectedTask(updatedTask);
      return false;
    } catch (error) {
      setSaveError(toErrorMessage(error, "Failed to update task"));
      return false;
    } finally {
      setSavingTask(false);
    }
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draftTitle.trim();
    if (!title || !data || isAddingTask) return;

    setIsAddingTask(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Create failed (${response.status})`);
      }

      const createdTask = (await response.json()) as ProjectTask;
      setData(appendTask(data, createdTask));
      setDraftTitle("");
      setFormMessage(`「${title}」を Notion に追加しました`);
    } catch (error) {
      setFormMessage(
        formatErrorMessage(toErrorMessage(error, "Failed to add task")),
      );
    } finally {
      setIsAddingTask(false);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center sm:mb-12">
          <div className="mb-4 flex justify-center">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              ← Hub
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-[0.18em] text-slate-800 uppercase sm:text-3xl">
            ICL PROJECT HUB
          </h1>
          <StatusLabel state={loadState} />

          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-0">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-300/70" />
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-300/70" />
          </div>
        </header>

        {loadState === "error" && (
          <div className="mb-8 rounded-xl border border-red-200 bg-white px-5 py-4 text-sm text-red-600 shadow-sm">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <section>
            <SectionHeader icon="📊" title="Immediate Tasks (Due in 7 Days)" />

            {loadState === "loading" ? (
              <PanelSkeleton variant="task" />
            ) : data && data.thisWeekTasks.length > 0 ? (
              <div className="space-y-4">
                {data.thisWeekTasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onOpen={setSelectedTask}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No tasks due in the next 7 days" />
            )}
          </section>

          <section>
            <SectionHeader icon="🗣️" title="Next Meeting Agenda" />

            {loadState === "loading" ? (
              <PanelSkeleton variant="agenda" />
            ) : data && data.meetingAgenda.length > 0 ? (
              <div className="space-y-4">
                {data.meetingAgenda.map((task, index) => (
                  <AgendaCard
                    key={task.id}
                    task={task}
                    index={index}
                    onOpen={setSelectedTask}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No agenda items yet" />
            )}
          </section>
        </div>

        <section className="mt-12 sm:mt-16">
          <h2 className="mb-6 text-center text-sm font-semibold tracking-[0.18em] text-slate-600 uppercase">
            Quick Task Add
          </h2>

          <div className="relative mx-auto max-w-2xl">
            <div className="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 items-center gap-3 text-lg opacity-25 sm:flex">
              <span>📊</span>
              <span>💡</span>
            </div>
            <div className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 items-center gap-3 text-lg opacity-25 sm:flex">
              <span>🚀</span>
              <span>📊</span>
            </div>

            <form onSubmit={handleAddTask} className="relative">
              <div className="rounded-full bg-gradient-to-r from-blue-300/40 via-white to-red-300/40 p-[2px] shadow-[0_0_24px_rgba(59,130,246,0.12),0_0_24px_rgba(248,113,113,0.12)]">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Quickly add a task..."
                  disabled={isAddingTask || loadState !== "success"}
                  className="w-full rounded-full border-0 bg-white px-6 py-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100/80 disabled:cursor-wait disabled:opacity-60"
                />
              </div>
            </form>

            {formMessage && (
              <p
                className={`mt-4 text-center text-xs ${
                  formMessage.includes("追加しました") ? "text-teal-600" : "text-slate-400"
                }`}
              >
                {formMessage}
              </p>
            )}
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <SectionHeader icon="📋" title="All Projects" />

          {loadState === "loading" ? (
            <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white/80" />
          ) : data && (data.allTasks?.length ?? 0) > 0 ? (
            <AllTasksTable tasks={data.allTasks ?? []} onOpen={setSelectedTask} />
          ) : (
            <EmptyState message="No project tasks yet" />
          )}
        </section>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          saving={savingTask}
          saveError={saveError}
          onClose={() => {
            setSelectedTask(null);
            setSaveError(null);
          }}
          onUpdate={handleTaskUpdate}
        />
      )}
    </main>
  );
}
