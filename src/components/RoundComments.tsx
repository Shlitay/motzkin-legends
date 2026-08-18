"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RawCommentRow = {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type Comment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  name: string;
  avatar: string;
};

const MAX_LENGTH = 280;

function toComment(row: RawCommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.comment,
    createdAt: row.created_at,
    name: row.users?.nickname ?? row.users?.full_name ?? "Unknown",
    avatar: row.users?.avatar ?? "🙂",
  };
}

export default function RoundComments({ roundId }: { roundId: string }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const [{ data: userData }, { data: rows, error: fetchError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("round_comments")
          .select("id, user_id, comment, created_at, users(full_name, nickname, avatar)")
          .eq("round_id", roundId)
          .order("created_at", { ascending: true })
          .overrideTypes<RawCommentRow[], { merge: false }>(),
      ]);

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setCurrentUserId(userData.user?.id ?? null);
      setComments((rows ?? []).map(toComment));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, roundId]);

  const alreadyCommented = comments.some((c) => c.userId === currentUserId);

  async function post() {
    const text = draft.trim();
    if (text === "" || !currentUserId) return;
    setPosting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("round_comments")
      .insert({ round_id: roundId, user_id: currentUserId, comment: text })
      .select("id, user_id, comment, created_at, users(full_name, nickname, avatar)")
      .single()
      .overrideTypes<RawCommentRow, { merge: false }>();

    if (insertError) {
      setError(insertError.message);
      setPosting(false);
      return;
    }

    setComments((prev) => [...prev, toComment(data)]);
    setDraft("");
    setPosting(false);
  }

  if (loading) return null;

  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <h2 className="px-5 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-muted">
        Round discussion
      </h2>

      <div className="divide-y divide-neutral-100">
        {comments.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted">No comments yet — be the first.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3 px-5 py-3">
            <span className="text-lg">{c.avatar}</span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-ink">{c.name}</p>
              <p className="text-sm text-ink/90 break-words">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {!alreadyCommented && currentUserId && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Say something about this round…"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted">
              {draft.length}/{MAX_LENGTH}
            </span>
            <button
              disabled={draft.trim() === "" || posting}
              onClick={post}
              className="rounded-full bg-brand px-5 py-1.5 text-sm font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="px-5 pb-4 text-xs text-danger">{error}</p>}
    </section>
  );
}
