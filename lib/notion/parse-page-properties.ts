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

export function getNumber(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): number | null {
  const property = properties[propertyName];

  if (property?.type === "number" && typeof property.number === "number") {
    return property.number;
  }

  return null;
}

export function getUrl(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | null {
  const property = properties[propertyName];

  if (property?.type === "url" && property.url) {
    return property.url;
  }

  return null;
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

/** Notion Place プロパティを表示用文字列に変換 */
export function getPlaceLabel(
  properties: PageObjectResponse["properties"],
  propertyName: string,
): string | null {
  const property = properties[propertyName];

  if (property?.type !== "place" || !property.place) {
    return null;
  }

  const { name, address } = property.place;
  const parts = [name?.trim(), address?.trim()].filter(
    (part): part is string => Boolean(part),
  );

  if (parts.length === 0) {
    return null;
  }

  // name と address がほぼ同じなら重複を避ける
  if (parts.length === 2 && parts[0] === parts[1]) {
    return parts[0];
  }

  return parts.join(" · ");
}
