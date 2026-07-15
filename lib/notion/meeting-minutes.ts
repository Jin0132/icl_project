import { isFullPage } from "@notionhq/client";
import { getMeetingMinutesParentId, getNotionClient } from "./client";

export type CreateMeetingMinutesInput = {
  title: string;
  dateKey: string;
  typeLabel: string;
  timeLabel: string;
  pollId?: string;
  scheduleUrl?: string;
};

export type CreatedMeetingMinutes = {
  id: string;
  url: string;
  title: string;
};

function rich(content: string) {
  return [{ type: "text" as const, text: { content } }];
}

/** Meeting Minutes 親ページ下に空の議事録テンプレを作成 */
export async function createMeetingMinutesDraft(
  input: CreateMeetingMinutesInput,
): Promise<CreatedMeetingMinutes> {
  const notion = getNotionClient();
  const title = input.title.slice(0, 2000);
  const parentId = getMeetingMinutesParentId();

  const page = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: "📅" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: title } }],
      },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: rich(`Date / 日付: ${input.dateKey}`),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: rich(`Type / 種別: ${input.typeLabel}`),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: rich(`Time / 時間: ${input.timeLabel}`),
        },
      },
      ...(input.pollId
        ? [
            {
              object: "block" as const,
              type: "paragraph" as const,
              paragraph: {
                rich_text: rich(`Poll ID: ${input.pollId}`),
              },
            },
          ]
        : []),
      ...(input.scheduleUrl
        ? [
            {
              object: "block" as const,
              type: "paragraph" as const,
              paragraph: {
                rich_text: [
                  {
                    type: "text" as const,
                    text: {
                      content: "Schedule / 予定調整: ",
                    },
                  },
                  {
                    type: "text" as const,
                    text: {
                      content: input.scheduleUrl,
                      link: { url: input.scheduleUrl },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: rich("Executive Summary / 要約"),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [] },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: rich("Agenda / 議題"),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [] },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: rich("Decisions & Progress / 決定・進捗"),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [] },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: rich("Action Items / アクション"),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: rich("→ Project Tracker に反映する"),
        },
      },
    ],
  });

  if (!isFullPage(page)) {
    throw new Error("Created meeting minutes page is not accessible");
  }

  return {
    id: page.id,
    url: page.url,
    title,
  };
}
