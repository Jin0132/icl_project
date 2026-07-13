import type { PageObjectResponse } from "@notionhq/client";

export function getTitle(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string {
  const property = properties[propertyName];

  if (property?.type === "title") {
    return property.title.map((item) => item.plain_text).join("");
  }

  return "";
}

export function getRichText(
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

export function getDate(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): { start: string | null; end: string | null; isDatetime: boolean } {
  const property = properties[propertyName];

  if (property?.type === "date" && property.date) {
    return {
      start: property.date.start,
      end: property.date.end,
      isDatetime: Boolean(property.date.start?.includes("T")),
    };
  }

  return { start: null, end: null, isDatetime: false };
}

export function getCheckbox(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): boolean {
  const property = properties[propertyName];

  if (property?.type === "checkbox") {
    return property.checkbox;
  }

  return false;
}

export function getSelect(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | null {
  const property = properties[propertyName];

  if (property?.type === "select" && property.select) {
    return property.select.name;
  }

  return null;
}

export function getMultiSelect(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string[] {
  const property = properties[propertyName];

  if (property?.type === "multi_select") {
    return property.multi_select.map((item) => item.name);
  }

  return [];
}
