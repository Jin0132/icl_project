import type { PageObjectResponse } from "@notionhq/client";
import {
  PROJECT_NOTION_PROPERTIES,
  type PersonInCharge,
  type ProjectCategory,
  type ProjectTask,
} from "./project-schema";

function getTitle(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string {
  const property = properties[propertyName];

  if (property?.type === "title") {
    return property.title.map((item) => item.plain_text).join("");
  }

  return "";
}

function getRichText(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | null {
  const property = properties[propertyName];

  if (property?.type === "rich_text") {
    const text = property.rich_text.map((item) => item.plain_text).join("");
    return text || null;
  }

  return null;
}

function getDate(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): { start: string | null; end: string | null } {
  const property = properties[propertyName];

  if (property?.type === "date" && property.date) {
    return {
      start: property.date.start,
      end: property.date.end,
    };
  }

  return { start: null, end: null };
}

function getCheckbox(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): boolean {
  const property = properties[propertyName];

  if (property?.type === "checkbox") {
    return property.checkbox;
  }

  return false;
}

function getSelect(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | null {
  const property = properties[propertyName];

  if (property?.type === "select" && property.select) {
    return property.select.name;
  }

  return null;
}

export function parseProjectTask(page: PageObjectResponse): ProjectTask {
  const { properties } = page;
  const dueDate = getDate(properties, PROJECT_NOTION_PROPERTIES.dueDate);

  return {
    id: page.id,
    title: getTitle(properties, PROJECT_NOTION_PROPERTIES.title),
    dueDate: dueDate.start,
    dueDateEnd: dueDate.end,
    discussInMeeting: getCheckbox(
      properties,
      PROJECT_NOTION_PROPERTIES.discussInMeeting,
    ),
    done: getCheckbox(properties, PROJECT_NOTION_PROPERTIES.done),
    category: getSelect(
      properties,
      PROJECT_NOTION_PROPERTIES.category,
    ) as ProjectCategory | null,
    personInCharge: getSelect(
      properties,
      PROJECT_NOTION_PROPERTIES.personInCharge,
    ) as PersonInCharge | null,
    memo: getRichText(properties, PROJECT_NOTION_PROPERTIES.memo),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}
