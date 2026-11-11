"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { AVATAR_LIBRARY } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

// Who holds which avatar (other players only). users is readable by every
// signed-in player (rls.sql), so the grid can grey out taken avatars and
// show the owner's name under them.
export function useTakenAvatars(myId: string | null) {
  const [state, setState] = useState<{ taken: Map<string, string>; suggested: string | null; loaded: boolean }>({
    taken: new Map(),
    suggested: null,
    loaded: false,
  });

  const load = useCallback(async () => {
    if (!myId) return null;
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, avatar, nickname, full_name")
      .like("avatar", "avatar-%");
    const map = new Map<string, string>();
    (data ?? []).forEach((u) => {
      if (u.id !== myId && u.avatar) map.set(u.avatar, u.nickname ?? u.full_name);
    });
    // A random free avatar, pre-selected for players who don't have one yet.
    return { taken: map, suggested: randomFreeAvatar(map), loaded: true };
  }, [myId]);

  useEffect(() => {
    let active = true;
    load().then((next) => {
      if (active && next) setState(next);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const next = await load();
    if (next) setState(next);
  }, [load]);

  return { ...state, refresh };
}

export function randomFreeAvatar(taken: Map<string, string>) {
  const free = AVATAR_LIBRARY.filter((id) => !taken.has(id));
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

// Postgres unique violation on users_avatar_unique (add-unique-avatars.sql).
export const AVATAR_TAKEN_MESSAGE = "מישהו בדיוק תפס את האווטאר הזה, בחרו אחר";
export function isAvatarTakenError(err: { code?: string; message?: string } | null) {
  return !!err && (err.code === "23505" || /users_avatar_unique/.test(err.message ?? ""));
}

function Cell({
  id,
  index,
  selected,
  owner,
  size,
  onPick,
}: {
  id: string;
  index: number;
  selected: boolean;
  owner: string | undefined;
  size: number;
  onPick: (id: string) => void;
}) {
  const takenByOther = owner !== undefined;
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <button
        type="button"
        disabled={takenByOther}
        aria-pressed={selected}
        aria-label={
          takenByOther ? `אווטאר ${index + 1}, תפוס על ידי ${owner}` : selected ? `אווטאר ${index + 1}, הבחירה שלך` : `אווטאר ${index + 1}`
        }
        onClick={() => onPick(id)}
        style={{ width: size, height: size }}
        className={
          "flex items-center justify-center overflow-hidden rounded-full " +
          (selected
            ? "bg-green-50 shadow-[0_0_0_2.5px_#1B6B3C]"
            : takenByOther
            ? "cursor-not-allowed bg-[#F1F1EC] opacity-35 grayscale"
            : "bg-[#F1F1EC] hover:shadow-[0_0_0_2px_#B9C2BB]")
        }
      >
        <Avatar avatar={id} size={size} />
      </button>
      <span
        className={
          "h-[13px] max-w-[54px] truncate text-[10px] font-bold leading-[13px] " +
          (selected ? "text-[#14512D]" : "text-[#6B6F68]")
        }
      >
        {selected ? "אתה" : owner ?? ""}
      </span>
    </div>
  );
}

// Full 6×5 grid of all 30 avatars.
export function AvatarGrid({
  value,
  onChange,
  taken,
  size = 46,
}: {
  value: string | null;
  onChange: (id: string) => void;
  taken: Map<string, string>;
  size?: number;
}) {
  return (
    <div className="grid grid-cols-6 justify-items-center gap-x-1 gap-y-1.5">
      {AVATAR_LIBRARY.map((id, i) => (
        <Cell key={id} id={id} index={i} selected={value === id} owner={taken.get(id)} size={size} onPick={onChange} />
      ))}
    </div>
  );
}

// "{n} פנויים מתוך 30" + random-pick button.
export function AvatarGridHeader({
  taken,
  onShuffle,
  children,
}: {
  taken: Map<string, string>;
  onShuffle: () => void;
  children?: React.ReactNode;
}) {
  const free = AVATAR_LIBRARY.length - taken.size;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[13px] leading-normal text-muted">
        {children}
        <b className="text-[#14512D]">{free} פנויים</b> מתוך {AVATAR_LIBRARY.length}.
      </p>
      <button
        type="button"
        onClick={onShuffle}
        className="inline-flex min-h-[34px] shrink-0 items-center gap-[5px] rounded-full border-[1.5px] border-miss bg-white px-2.5 text-xs font-extrabold text-ink"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
        הגרלה
      </button>
    </div>
  );
}

// Compact strip for the profile sheet: the current pick first, then the
// rest in library order, scrolling sideways.
export function AvatarStrip({
  value,
  onChange,
  taken,
}: {
  value: string | null;
  onChange: (id: string) => void;
  taken: Map<string, string>;
}) {
  const ordered = value ? [value, ...AVATAR_LIBRARY.filter((id) => id !== value)] : AVATAR_LIBRARY;
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5">
      {ordered.map((id) => (
        <Cell
          key={id}
          id={id}
          index={AVATAR_LIBRARY.indexOf(id)}
          selected={value === id}
          owner={taken.get(id)}
          size={42}
          onPick={onChange}
        />
      ))}
    </div>
  );
}
