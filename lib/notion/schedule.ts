import {
  isFullPage,
  type PageObjectResponse,
} from "@notionhq/client";
import {
  getNotionClient,
  getCalendarDatabaseId,
  getScheduleDraftDatabaseId,
} from "./client";
import {
  buildNotionDateProperty,
  isAppConfirmedEvent,
  isDatetimeValue,
} from "./notion-datetime";
import { parseConfirmedEvent, parseScheduleDraft } from "./parse-schedule";
import {
  buildDeclineMemo,
  getDeclineGroupKey,
  isDeclineDraft,
  isSlotAvailabilityDraft,
} from "./schedule-rsvp";
import {
  CALENDAR_PROPERTIES,
  MEMBER_CALENDAR_TAGS,
  getScheduleDraftGroupKey,
  normalizeScheduleEventTitle,
  SCHEDULE_DRAFT_PROPERTIES,
  type ConfirmedEvent,
  type ScheduleApiResponse,
  type ScheduleCategory,
  type ScheduleDraft,
  type ScheduleMember,
} from "./schedule-schema";

const dataSourceIdCache = new Map<string, string>();

async function resolveDataSourceId(databaseId: string): Promise<string> {
  const cached = dataSourceIdCache.get(databaseId);
  if (cached) {
    return cached;
  }

  const notion = getNotionClient();
  const database = await notion.databases.retrieve({ database_id: databaseId });

  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  const dataSourceId = database.data_sources[0].id;
  dataSourceIdCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

type NotionQueryFilter = NonNullable<
  Parameters<ReturnType<typeof getNotionClient>["dataSources"]["query"]>[0]["filter"]
>;

async function queryAllPages(
  dataSourceId: string,
  filter?: NotionQueryFilter,
): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      ...(filter ? { filter } : {}),
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

function isActiveDraft(draft: ScheduleDraft): boolean {
  return draft.status !== "Cancelled / 取消" && draft.status !== "Confirmed / 確定";
}

const ACTIVE_DRAFT_STATUS_FILTER: NotionQueryFilter = {
  and: [
    {
      property: SCHEDULE_DRAFT_PROPERTIES.status,
      select: { does_not_equal: "Cancelled / 取消" },
    },
    {
      property: SCHEDULE_DRAFT_PROPERTIES.status,
      select: { does_not_equal: "Confirmed / 確定" },
    },
  ],
};

const APP_CONFIRMED_EVENT_FILTER: NotionQueryFilter = {
  or: [
    { property: CALENDAR_PROPERTIES.name, title: { contains: "[MTG]" } },
    { property: CALENDAR_PROPERTIES.name, title: { contains: "[Event]" } },
    { property: CALENDAR_PROPERTIES.name, title: { contains: "[Other]" } },
  ],
};

function combineFilters(
  base: NotionQueryFilter,
  extra?: NotionQueryFilter,
): NotionQueryFilter {
  if (!extra) {
    return base;
  }

  if ("and" in base && Array.isArray(base.and)) {
    return { and: [...base.and, extra] } as NotionQueryFilter;
  }

  return { and: [base, extra] } as NotionQueryFilter;
}

async function queryDraftPages(filter?: NotionQueryFilter): Promise<PageObjectResponse[]> {
  const draftDatabaseId = getScheduleDraftDatabaseId();
  return queryAllPages(
    await resolveDataSourceId(draftDatabaseId),
    combineFilters(ACTIVE_DRAFT_STATUS_FILTER, filter),
  );
}

async function queryCalendarPages(): Promise<PageObjectResponse[]> {
  const calendarDatabaseId = getCalendarDatabaseId();
  return queryAllPages(
    await resolveDataSourceId(calendarDatabaseId),
    APP_CONFIRMED_EVENT_FILTER,
  );
}

async function getPollDrafts(pollId: string): Promise<ScheduleDraft[]> {
  const pages = await queryDraftPages({
    property: SCHEDULE_DRAFT_PROPERTIES.poll,
    rich_text: { contains: pollId },
  });

  return pages.map(parseScheduleDraft).filter(isActiveDraft);
}

async function getAvailabilityForCandidateId(candidateId: string): Promise<ScheduleDraft[]> {
  const pages = await queryDraftPages({
    property: SCHEDULE_DRAFT_PROPERTIES.memo,
    rich_text: { contains: `candidate:${candidateId}` },
  });

  return pages.map(parseScheduleDraft).filter(isActiveDraft);
}

export async function fetchScheduleResponse(): Promise<ScheduleApiResponse> {
  const [draftPages, calendarPages] = await Promise.all([
    queryDraftPages(),
    queryCalendarPages(),
  ]);

  const drafts = draftPages
    .map(parseScheduleDraft)
    .filter(isActiveDraft)
    .sort((left, right) => left.start.localeCompare(right.start));

  const confirmed = calendarPages
    .map(parseConfirmedEvent)
    .filter((event) => isAppConfirmedEvent(event.name))
    .sort((left, right) => left.start.localeCompare(right.start));

  return {
    drafts,
    confirmed,
    meta: {
      fetchedAt: new Date().toISOString(),
      draftsCount: drafts.length,
      confirmedCount: confirmed.length,
      draftDatabaseId: getScheduleDraftDatabaseId(),
      calendarDatabaseId: getCalendarDatabaseId(),
    },
  };
}

export function createPollId(): string {
  return `poll-${Date.now()}`;
}

type CreateCandidateInput = {
  title: string;
  category: ScheduleCategory;
  person: ScheduleMember;
  start: string;
  end: string | null;
  pollId?: string;
  memo?: string;
};

export async function createCandidateSlot(
  input: CreateCandidateInput,
): Promise<ScheduleDraft> {
  const notion = getNotionClient();
  const pollId = input.pollId ?? createPollId();
  const isDatetime = isDatetimeValue(input.start);

  const page = await notion.pages.create({
    parent: { database_id: getScheduleDraftDatabaseId() },
    properties: {
      [SCHEDULE_DRAFT_PROPERTIES.title]: {
        title: [{ text: { content: input.title.slice(0, 2000) } }],
      },
      [SCHEDULE_DRAFT_PROPERTIES.category]: {
        select: { name: input.category },
      },
      [SCHEDULE_DRAFT_PROPERTIES.person]: {
        select: { name: input.person },
      },
      [SCHEDULE_DRAFT_PROPERTIES.creator]: {
        select: { name: input.person },
      },
      [SCHEDULE_DRAFT_PROPERTIES.type]: {
        select: { name: "Candidate / 候補" },
      },
      [SCHEDULE_DRAFT_PROPERTIES.status]: {
        select: { name: "Open / 調整中" },
      },
      [SCHEDULE_DRAFT_PROPERTIES.poll]: {
        rich_text: [{ text: { content: pollId } }],
      },
      ...buildNotionDateProperty(
        input.start,
        input.end,
        isDatetime,
        SCHEDULE_DRAFT_PROPERTIES.date,
      ),
      ...(input.memo
        ? {
            [SCHEDULE_DRAFT_PROPERTIES.memo]: {
              rich_text: [{ text: { content: input.memo.slice(0, 2000) } }],
            },
          }
        : {}),
    },
  });

  if (!isFullPage(page)) {
    throw new Error("Created draft page is not accessible");
  }

  return parseScheduleDraft(page);
}

type MarkAvailableInput = {
  candidateId: string;
  person: ScheduleMember;
};

export async function markAvailable(input: MarkAvailableInput): Promise<ScheduleDraft> {
  const notion = getNotionClient();
  const candidatePage = await notion.pages.retrieve({ page_id: input.candidateId });

  if (!isFullPage(candidatePage)) {
    throw new Error("Candidate page is not accessible");
  }

  const candidate = parseScheduleDraft(candidatePage);

  if (candidate.type !== "Candidate / 候補") {
    throw new Error("Only candidate slots can receive availability responses");
  }

  const groupKey = getScheduleDraftGroupKey(candidate);
  await clearMemberResponsesInGroup(candidate, input.person, groupKey);

  const eventTitle = normalizeScheduleEventTitle(candidate.title);
  const creator = candidate.creator ?? candidate.person;

  const properties: Record<string, unknown> = {
      [SCHEDULE_DRAFT_PROPERTIES.title]: {
        title: [{ text: { content: eventTitle.slice(0, 2000) } }],
      },
      [SCHEDULE_DRAFT_PROPERTIES.person]: {
        select: { name: input.person },
      },
      ...(creator
        ? {
            [SCHEDULE_DRAFT_PROPERTIES.creator]: {
              select: { name: creator },
            },
          }
        : {}),
      [SCHEDULE_DRAFT_PROPERTIES.type]: {
        select: { name: "Available / 参加可能" },
      },
      [SCHEDULE_DRAFT_PROPERTIES.status]: {
        select: { name: "Open / 調整中" },
      },
      [SCHEDULE_DRAFT_PROPERTIES.memo]: {
        rich_text: [{ text: { content: `candidate:${candidate.id}` } }],
      },
      ...buildNotionDateProperty(
        candidate.start,
        candidate.end,
        candidate.isDatetime,
        SCHEDULE_DRAFT_PROPERTIES.date,
      ),
    };

  if (candidate.category) {
    properties[SCHEDULE_DRAFT_PROPERTIES.category] = {
      select: { name: candidate.category },
    };
  }

  if (candidate.pollId) {
    properties[SCHEDULE_DRAFT_PROPERTIES.poll] = {
      rich_text: [{ text: { content: candidate.pollId } }],
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: getScheduleDraftDatabaseId() },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });

  if (!isFullPage(page)) {
    throw new Error("Created availability page is not accessible");
  }

  return parseScheduleDraft(page);
}

type MarkEventDeclineInput = {
  candidateId: string;
  person: ScheduleMember;
};

async function getGroupDraftsForCandidate(candidate: ScheduleDraft): Promise<ScheduleDraft[]> {
  if (!candidate.pollId) {
    return [candidate];
  }

  const pollDrafts = await getPollDrafts(candidate.pollId);
  const groupTitle = normalizeScheduleEventTitle(candidate.title);
  return pollDrafts.filter(
    (draft) => normalizeScheduleEventTitle(draft.title) === groupTitle,
  );
}

async function clearMemberResponsesInGroup(
  candidate: ScheduleDraft,
  person: ScheduleMember,
  groupKey: string,
): Promise<void> {
  const groupDrafts = await getGroupDraftsForCandidate(candidate);
  const candidateIds = new Set(
    groupDrafts.filter((draft) => draft.type === "Candidate / 候補").map((draft) => draft.id),
  );

  const idsToCancel = groupDrafts
    .filter((draft) => {
      if (draft.person !== person) {
        return false;
      }

      if (isDeclineDraft(draft) && getDeclineGroupKey(draft) === groupKey) {
        return true;
      }

      if (!isSlotAvailabilityDraft(draft)) {
        return false;
      }

      const candidateId = draft.memo?.match(/candidate:([^\s]+)/)?.[1];
      return candidateId ? candidateIds.has(candidateId) : false;
    })
    .map((draft) => draft.id);

  await Promise.all(idsToCancel.map((id) => cancelDraft(id)));
}

export async function markEventDecline(input: MarkEventDeclineInput): Promise<ScheduleDraft> {
  const notion = getNotionClient();
  const candidatePage = await notion.pages.retrieve({ page_id: input.candidateId });

  if (!isFullPage(candidatePage)) {
    throw new Error("Candidate page is not accessible");
  }

  const candidate = parseScheduleDraft(candidatePage);

  if (candidate.type !== "Candidate / 候補") {
    throw new Error("Only candidate slots can be declined");
  }

  const groupKey = getScheduleDraftGroupKey(candidate);
  await clearMemberResponsesInGroup(candidate, input.person, groupKey);

  const eventTitle = normalizeScheduleEventTitle(candidate.title);
  const creator = candidate.creator ?? candidate.person;

  const properties: Record<string, unknown> = {
    [SCHEDULE_DRAFT_PROPERTIES.title]: {
      title: [{ text: { content: eventTitle.slice(0, 2000) } }],
    },
    [SCHEDULE_DRAFT_PROPERTIES.person]: {
      select: { name: input.person },
    },
    ...(creator
      ? {
          [SCHEDULE_DRAFT_PROPERTIES.creator]: {
            select: { name: creator },
          },
        }
      : {}),
    [SCHEDULE_DRAFT_PROPERTIES.type]: {
      select: { name: "Available / 参加可能" },
    },
    [SCHEDULE_DRAFT_PROPERTIES.status]: {
      select: { name: "Open / 調整中" },
    },
    [SCHEDULE_DRAFT_PROPERTIES.memo]: {
      rich_text: [{ text: { content: buildDeclineMemo(groupKey) } }],
    },
    ...buildNotionDateProperty(
      candidate.start,
      candidate.end,
      candidate.isDatetime,
      SCHEDULE_DRAFT_PROPERTIES.date,
    ),
  };

  if (candidate.category) {
    properties[SCHEDULE_DRAFT_PROPERTIES.category] = {
      select: { name: candidate.category },
    };
  }

  if (candidate.pollId) {
    properties[SCHEDULE_DRAFT_PROPERTIES.poll] = {
      rich_text: [{ text: { content: candidate.pollId } }],
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: getScheduleDraftDatabaseId() },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });

  if (!isFullPage(page)) {
    throw new Error("Created decline page is not accessible");
  }

  return parseScheduleDraft(page);
}

export async function confirmCandidate(candidateId: string): Promise<{
  confirmedEvent: ConfirmedEvent;
  candidate: ScheduleDraft;
}> {
  const notion = getNotionClient();
  const candidatePage = await notion.pages.retrieve({ page_id: candidateId });

  if (!isFullPage(candidatePage)) {
    throw new Error("Candidate page is not accessible");
  }

  const candidate = parseScheduleDraft(candidatePage);

  if (candidate.type !== "Candidate / 候補") {
    throw new Error("Only candidate slots can be confirmed");
  }

  if (!candidate.pollId) {
    throw new Error("Candidate is missing poll ID");
  }

  const pollDrafts = await getPollDrafts(candidate.pollId);
  const groupTitle = normalizeScheduleEventTitle(candidate.title);
  const groupDrafts = pollDrafts.filter(
    (draft) => normalizeScheduleEventTitle(draft.title) === groupTitle,
  );
  const availablePeople = groupDrafts
    .filter(
      (draft) =>
        draft.type === "Available / 参加可能" &&
        draft.start === candidate.start &&
        draft.memo?.includes(`candidate:${candidate.id}`),
    )
    .map((draft) => draft.person)
    .filter((person): person is ScheduleMember => Boolean(person));

  const participants = Array.from(
    new Set<ScheduleMember>(
      [candidate.person, ...availablePeople].filter(
        (person): person is ScheduleMember => Boolean(person),
      ),
    ),
  );

  const categoryLabel = candidate.category?.split(" / ")[0] ?? "Schedule";
  const eventName = `[${categoryLabel}] ${candidate.title}`;

  const calendarPage = await notion.pages.create({
    parent: { database_id: getCalendarDatabaseId() },
    properties: {
      [CALENDAR_PROPERTIES.name]: {
        title: [{ text: { content: eventName.slice(0, 2000) } }],
      },
      [CALENDAR_PROPERTIES.tags]: {
        multi_select: participants.map((person) => ({
          name: MEMBER_CALENDAR_TAGS[person],
        })),
      },
      ...buildNotionDateProperty(
        candidate.start,
        candidate.end,
        candidate.isDatetime,
        CALENDAR_PROPERTIES.date,
      ),
    },
  });

  if (!isFullPage(calendarPage)) {
    throw new Error("Created calendar page is not accessible");
  }

  await notion.pages.update({
    page_id: candidate.id,
    properties: {
      [SCHEDULE_DRAFT_PROPERTIES.status]: {
        select: { name: "Confirmed / 確定" },
      },
    },
  });

  await Promise.all(
    groupDrafts
      .filter((draft) => draft.id !== candidate.id && isActiveDraft(draft))
      .map((draft) =>
        notion.pages.update({
          page_id: draft.id,
          properties: {
            [SCHEDULE_DRAFT_PROPERTIES.status]: {
              select: {
                name:
                  draft.type === "Available / 参加可能" &&
                  draft.memo?.includes(`candidate:${candidate.id}`)
                    ? "Confirmed / 確定"
                    : "Cancelled / 取消",
              },
            },
          },
        }),
      ),
  );

  const updatedCandidatePage = await notion.pages.retrieve({ page_id: candidate.id });
  if (!isFullPage(updatedCandidatePage)) {
    throw new Error("Updated candidate page is not accessible");
  }

  return {
    confirmedEvent: parseConfirmedEvent(calendarPage),
    candidate: parseScheduleDraft(updatedCandidatePage),
  };
}

export async function cancelDraft(draftId: string): Promise<void> {
  const notion = getNotionClient();
  const page = await notion.pages.retrieve({ page_id: draftId });

  if (!isFullPage(page)) {
    throw new Error("Draft page is not accessible");
  }

  const draft = parseScheduleDraft(page);
  const idsToCancel = new Set<string>([draftId]);

  if (draft.type === "Candidate / 候補") {
    for (const item of await getAvailabilityForCandidateId(draftId)) {
      idsToCancel.add(item.id);
    }
  }

  await Promise.all(
    [...idsToCancel].map((id) =>
      notion.pages.update({
        page_id: id,
        properties: {
          [SCHEDULE_DRAFT_PROPERTIES.status]: {
            select: { name: "Cancelled / 取消" },
          },
        },
      }),
    ),
  );
}

export async function cancelPoll(pollId: string): Promise<void> {
  const notion = getNotionClient();
  const drafts = await getPollDrafts(pollId);

  await Promise.all(
    drafts.map((draft) =>
      notion.pages.update({
        page_id: draft.id,
        properties: {
          [SCHEDULE_DRAFT_PROPERTIES.status]: {
            select: { name: "Cancelled / 取消" },
          },
        },
      }),
    ),
  );
}

export async function removeAvailability(draftId: string): Promise<void> {
  await cancelDraft(draftId);
}
