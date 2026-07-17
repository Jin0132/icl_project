"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PlannedEvent } from "@/lib/notion/event-marketing";
import { enJa } from "@/lib/ui/bilingual";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

function formatDate(date: string | null): string {
  if (!date) return enJa("Date TBD", "日付未定");
  return date.slice(0, 10).replace(/-/g, "/");
}

export default function MarketPage() {
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market", { cache: "no-store" });
      const body = (await response.json()) as {
        events?: PlannedEvent[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to load");
      setEvents(body.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setMessage(enJa(`Copied: ${label}`, `コピーしました: ${label}`));
    window.setTimeout(() => setMessage(null), 2500);
  }

  async function copyAndMark(
    event: PlannedEvent,
    channel: "meetup" | "instagram",
  ) {
    const text = channel === "meetup" ? event.meetupCopy : event.instagramCopy;
    const label = channel === "meetup" ? "Meetup" : "Instagram";
    setBusyId(`${event.id}:${channel}`);
    try {
      await navigator.clipboard.writeText(text);
      const response = await fetch("/api/market", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, channel }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to mark as sent");
      }
      const updated = (await response.json()) as PlannedEvent;
      setEvents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(
        enJa(
          `Copied ${label} copy and marked as sent`,
          `${label}文をコピーし、送付済みにしました`,
        ),
      );
      window.setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Marketing Assist
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-800 sm:text-3xl">
              {enJa("Posting helper", "投稿ヘルパー")}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              {enJa(
                "Generate Meetup / Instagram copy from Notion event schedule. One tap to copy and mark as sent.",
                "Notionのイベント日程から Meetup / Instagram 文案を生成。コピーと送付済みマークをワンタップで。",
              )}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Hub
          </Link>
        </header>

        <div className={`mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 ${CARD_SHADOW}`}>
          <p className="font-medium">
            {enJa("What this solves", "これで楽になること")}
          </p>
          <p className="mt-1 text-amber-900/90">
            {enJa(
              "Not full auto-posting to Meetup/IG (their APIs are limited). It removes the writing + checklist work so you can post every event in under a minute.",
              "Meetup/IGへの完全自動投稿ではありません（API制限あり）。文案作成とチェック作業をなくし、1イベント1分以内で投稿できるようにします。",
            )}
          </p>
        </div>

        {message && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <p className="text-sm text-slate-500">{enJa("Loading…", "読み込み中…")}</p>
        )}

        {!loading && events.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            {enJa(
              "No upcoming events in Notion schedule.",
              "Notionのイベント日程に今後の予定がありません。",
            )}
          </p>
        )}

        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className={`rounded-2xl border border-slate-200 bg-white p-5 ${CARD_SHADOW}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    {event.title || enJa("(Untitled)", "（無題）")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(event.date)}
                    {event.time ? ` · ${event.time}` : ""}
                    {event.cafe ? ` · ${event.cafe}` : ""}
                  </p>
                </div>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Notion →
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    event.meetupSent
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  Meetup {event.meetupSent ? "✓" : "—"}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    event.instagramSent
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  Instagram {event.instagramSent ? "✓" : "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold text-slate-600">Meetup</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {event.meetupCopy}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText(event.meetupCopy, "Meetup")}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {enJa("Copy only", "コピーのみ")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `${event.id}:meetup`}
                      onClick={() => void copyAndMark(event, "meetup")}
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {enJa("Copy + mark sent", "コピー＋送付済み")}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold text-slate-600">Instagram</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {event.instagramCopy}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText(event.instagramCopy, "Instagram")}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {enJa("Copy only", "コピーのみ")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `${event.id}:instagram`}
                      onClick={() => void copyAndMark(event, "instagram")}
                      className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {enJa("Copy + mark sent", "コピー＋送付済み")}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
