"use client";

import { FormEvent, useEffect, useState } from "react";
import { createAdminNotice, fetchAdminNotices } from "../../../lib/admin/api";
import type { AdminNoticeRow } from "../../../lib/admin/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<AdminNoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [fetchError, setFetchError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    (async () => {
      const result = await fetchAdminNotices();

      if (!result.ok) {
        setFetchError(result.message);
        setLoading(false);
        return;
      }

      setNotices(result.data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setFormMessage("");

    const result = await createAdminNotice({ title, content });

    setSaving(false);
    setFormMessage(result.message);

    if (!result.ok || !result.data) return;

    setNotices((current) => [result.data as AdminNoticeRow, ...current]);
    setTitle("");
    setContent("");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">NOTICES</p>
        <h1 className="text-2xl font-black text-gray-900">공지사항 관리</h1>
        <p className="mt-2 text-sm text-gray-500">
          서비스 공지사항을 작성하고 목록을 확인합니다. (현재 mock 데이터)
        </p>
      </header>

      <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">새 공지사항 작성</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              제목
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="공지 제목을 입력하세요"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              내용
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              rows={5}
              placeholder="공지 내용을 입력하세요"
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {formMessage && (
            <p className="text-sm font-medium text-blue-700">{formMessage}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "등록 중..." : "공지사항 등록"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">등록된 공지사항</h2>

        {loading ? (
          <p className="p-8 text-center text-gray-500">불러오는 중...</p>
        ) : fetchError ? (
          <p className="p-8 text-center text-gray-500">{fetchError}</p>
        ) : notices.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            아직 등록된 공지사항이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h3 className="font-bold text-gray-900">{notice.title}</h3>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(notice.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-gray-600">
                  {notice.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
