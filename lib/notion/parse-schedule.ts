import type { PageObjectResponse } from "@notionhq/client";
import {
  getDate,
  getMultiSelect,
  getRichText,
  getSelect,
  getTitle,
} from "./parse-page-properties";
import {
  CALENDAR_PROPERTIES,
  SCHEDULE_DRAFT_PROPERTIES,
  type ConfirmedEvent,
  type ScheduleDraft,
  type ScheduleDraftStatus,
  type ScheduleDraftType,
  type ScheduleCategory,
  type ScheduleMember,
} from "./schedule-schema";

export function parseScheduleDraft(page: PageObjectResponse): ScheduleDraft {
  const { properties } = page;
  const date = getDate(properties, SCHEDULE_DRAFT_PROPERTIES.date);

  return {
    id: page.id,
    title: getTitle(properties, SCHEDULE_DRAFT_PROPERTIES.title),
    category: getSelect(properties, SCHEDULE_DRAFT_PROPERTIES.category) as
      | ScheduleCategory
      | null,
    person: getSelect(properties, SCHEDULE_DRAFT_PROPERTIES.person) as
      | ScheduleMember
      | null,
    start: date.start ?? "",
    end: date.end,
    isDatetime: date.isDatetime,
    type: getSelect(properties, SCHEDULE_DRAFT_PROPERTIES.type) as
      | ScheduleDraftType
      | null,
    status: getSelect(properties, SCHEDULE_DRAFT_PROPERTIES.status) as
      | ScheduleDraftStatus
      | null,
    pollId: getRichText(properties, SCHEDULE_DRAFT_PROPERTIES.poll),
    memo: getRichText(properties, SCHEDULE_DRAFT_PROPERTIES.memo),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}

export function parseConfirmedEvent(page: PageObjectResponse): ConfirmedEvent {
  const { properties } = page;
  const date = getDate(properties, CALENDAR_PROPERTIES.date);

  return {
    id: page.id,
    name: getTitle(properties, CALENDAR_PROPERTIES.name),
    start: date.start ?? "",
    end: date.end,
    isDatetime: date.isDatetime,
    tags: getMultiSelect(properties, CALENDAR_PROPERTIES.tags),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}
