"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_EVENT_FEE_YEN } from "@/lib/event-pricing";
import type { PlannedEvent } from "@/lib/notion/event-marketing";
import { enJa } from "@/lib/ui/bilingual";

const CARD_SHADOW = "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

function formatDate(date: string | null): string {
  if (!date) return enJa("Date TBD", "日付未定");
  return date.slice(0, 10).replace(/-/g, "/");
}

type CreateForm = {
  title: string;
  date: string;
  time: string;
  cafe: string;
  summary: string;
  feeYen: string;
  capacity: string;
  language: string;
};

const EMPTY_FORM: CreateForm = {
  title: "",
  date: "",
  time: "",
  cafe: "",
  summary: "",
  feeYen: String(DEFAULT_EVENT_FEE_YEN),
  capacity: "",
  language: "バイリンガル",
};

export default function MarketPage() {
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const load = useCallback(async (includeDone: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const query = includeDone ? "?includeDone=1" : "";
      const response = await fetch(`/api/market${query}`, { cache: "no-store" });
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
    void load(showDone);
  }, [load, showDone]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3000);
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    flash(enJa(`Copied: ${label}`, `コピーしました: ${label}`));
  }

  async function markComplete(event: PlannedEvent) {
    setBusyId(`${event.id}:complete`);
    try {
      const response = await fetch("/api/market", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action: "complete" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to complete");
      }
      if (showDone) {
        const updated = (await response.json()) as PlannedEvent;
        setEvents((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        setEvents((current) => current.filter((item) => item.id !== event.id));
      }
      flash(enJa("Hidden as completed", "完了にして一覧から非表示にしました"));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reopen(event: PlannedEvent) {
    setBusyId(`${event.id}:reopen`);
    try {
      const response = await fetch("/api/market", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action: "reopen" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to reopen");
      }
      const updated = (await response.json()) as PlannedEvent;
      setEvents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      flash(enJa("Reopened in active list", "未完了に戻しました"));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.date.trim()) {
      flash(enJa("Title and date are required", "イベント名と日付は必須です"));
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          date: form.date.trim(),
          time: form.time.trim() || null,
          cafe: form.cafe.trim() || null,
          summary: form.summary.trim() || null,
          feeYen: Number(form.feeYen) || DEFAULT_EVENT_FEE_YEN,
          capacity: form.capacity.trim() ? Number(form.capacity) : null,
          language: form.language || null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create");
      }
      const created = (await response.json()) as PlannedEvent;
      setForm(EMPTY_FORM);
      setShowCreate(false);
      setEvents((current) =>
        [...current, created].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
      );
      flash(enJa("Event created. Copy is ready below.", "イベントを作成しました。下に文案が出ます。"));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
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
                "Create events, copy Meetup / Instagram text, then press Complete when posted.",
                "イベント作成 → 文案コピー → 投稿後「完了」で非表示。",
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

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {showCreate
              ? enJa("Close form", "作成フォームを閉じる")
              : enJa("+ New event", "+ 新しいイベント")}
          </button>
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className={`rounded-full border px-4 py-2 text-sm ${
              showDone
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {showDone
              ? enJa("Showing completed", "完了済みも表示中")
              : enJa("Show completed", "完了済みを表示")}
          </button>
          <button
            type="button"
            onClick={() => void load(showDone)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {enJa("Refresh", "再読み込み")}
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className={`mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 ${CARD_SHADOW}`}
          >
            <h2 className="text-sm font-semibold text-slate-800">
              {enJa("Create latest event", "最新イベントを作成")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs text-slate-500">{enJa("Title", "イベント名")} *</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Tuesday LANGUAGE HANGOUT"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Date", "日付")} *</span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Time", "時間")}</span>
                <input
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="19:00-20:30"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Cafe", "カフェ")}</span>
                <input
                  value={form.cafe}
                  onChange={(e) => setForm((f) => ({ ...f, cafe: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Fee (yen)", "参加費（円）")}</span>
                <input
                  type="number"
                  min={0}
                  value={form.feeYen}
                  onChange={(e) => setForm((f) => ({ ...f, feeYen: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Capacity", "定員")}</span>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{enJa("Language", "言語")}</span>
                <select
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="バイリンガル">バイリンガル</option>
                  <option value="英語メイン">英語メイン</option>
                  <option value="日本語メイン">日本語メイン</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-slate-500">{enJa("Summary", "企画概要")}</span>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating
                ? enJa("Creating…", "作成中…")
                : enJa("Create & generate copy", "作成して文案を出す")}
            </button>
          </form>
        )}

        <div className={`mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 ${CARD_SHADOW}`}>
          <p className="font-medium">
            {enJa("Flow", "使い方")}
          </p>
          <p className="mt-1 text-amber-900/90">
            {enJa(
              "1) Create or open event  2) Copy Meetup / IG text  3) Post on each channel  4) Complete to hide.",
              "1) イベント作成 or 開く  2) 文案コピー  3) 各チャネルに投稿  4) 「完了」で非表示。",
            )}
          </p>
          <p className="mt-2 text-xs text-amber-800/80">
            {enJa(
              "Per-channel sent checks are optional — Complete is enough.",
              "チャネル別の送付チェックは任意。「完了」だけでOK。",
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
            {showDone
              ? enJa("No completed upcoming events.", "完了済みの今後予定はありません。")
              : enJa(
                  "No active upcoming events. Create one above, or show completed.",
                  "未完了の今後予定がありません。上で作成するか、完了済みを表示してください。",
                )}
          </p>
        )}

        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className={`rounded-2xl border bg-white p-5 ${CARD_SHADOW} ${
                event.marketingDone
                  ? "border-emerald-200 opacity-80"
                  : "border-slate-200"
              }`}
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
                    {` · ¥${event.feeYen.toLocaleString("en-US")}`}
                    {event.capacity != null
                      ? ` · ${enJa(`cap ${event.capacity}`, `定員${event.capacity}`)}`
                      : ""}
                  </p>
                  {event.summary && (
                    <p className="mt-2 text-sm text-slate-600">{event.summary}</p>
                  )}
                  {event.meetupUrl && (
                    <a
                      href={event.meetupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-700"
                    >
                      Meetup URL →
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Notion →
                  </a>
                  {event.marketingDone ? (
                    <button
                      type="button"
                      disabled={busyId === `${event.id}:reopen`}
                      onClick={() => void reopen(event)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {enJa("Reopen", "未完了に戻す")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === `${event.id}:complete`}
                      onClick={() => void markComplete(event)}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {enJa("Complete / Hide", "完了して非表示")}
                    </button>
                  )}
                </div>
              </div>

              {event.marketingDone && (
                <p className="mt-3 text-[11px] font-medium text-emerald-700">
                  {enJa("Marketing complete", "マーケ完了")}
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold text-slate-600">Meetup</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {event.meetupCopy}
                  </pre>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void copyText(event.meetupCopy, "Meetup")}
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      {enJa("Copy", "コピー")}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold text-slate-600">Instagram</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {event.instagramCopy}
                  </pre>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void copyText(event.instagramCopy, "Instagram")}
                      className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                    >
                      {enJa("Copy", "コピー")}
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
