"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import ProfileModal from "@/components/ProfileModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundIntroPopup from "@/components/RoundIntroPopup";
import TopBar from "@/components/TopBar";
import { getCurrentRound } from "@/lib/currentRound";
import { BIG_POT_THRESHOLD, jackpotSplit } from "@/lib/jackpot";
import { useScoringRules } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";

const ic = {
  "aria-hidden": true,
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons = {
  book: (
    <svg {...ic} width={16} height={16}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h7M9 8h4" />
    </svg>
  ),
  trophy: (
    <svg {...ic} width={16} height={16}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" />
    </svg>
  ),
  clock: (
    <svg {...ic}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5M9.5 2.5h5" />
    </svg>
  ),
  target: (
    <svg {...ic}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  alarm: (
    <svg {...ic}>
      <path d="M12 8v5l3 2" />
      <circle cx="12" cy="13" r="8" />
      <path d="M4 4l3 2M20 4l-3 2" />
    </svg>
  ),
  lock: (
    <svg {...ic} width={13} height={13} strokeWidth={2.6}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  pencil: (
    <svg {...ic} width={13} height={13} strokeWidth={2.6}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  ),
  crown: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
      <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
    </svg>
  ),
  trend: (
    <svg {...ic} width={16} height={16} strokeWidth={2.6}>
      <path d="M4 16l6-6 4 4 6-6" />
      <path d="M14 8h6v6" />
    </svg>
  ),
  x: (
    <svg {...ic} width={15} height={15} strokeWidth={2.6}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  info: (
    <svg {...ic} width={16} height={16} className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
};

function Card({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <section
      className={
        "flex flex-col gap-3 rounded-[20px] p-4 " + (gold ? "border-gold" : "border border-line bg-white")
      }
    >
      {children}
    </section>
  );
}

function CardHead({ icon, children, gold }: { icon: React.ReactNode; children: React.ReactNode; gold?: boolean }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold">
      <span
        className={
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
          (gold ? "bg-gold text-gold-ink" : "bg-green-50 text-pitch-600")
        }
      >
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Pair({ h, a, className = "" }: { h: number | string; a: number | string; className?: string }) {
  return (
    <span className={"inline-flex gap-[3px] font-display text-[13px] font-semibold text-ink " + className}>
      <span>{h}</span>
      <span>:</span>
      <span>{a}</span>
    </span>
  );
}

function ScoreRow({
  bg,
  iconClass,
  icon,
  nameClass,
  name,
  ex,
  points,
  pointsClass,
}: {
  bg: string;
  iconClass: string;
  icon: React.ReactNode;
  nameClass: string;
  name: string;
  ex: [number, number, number, number];
  points: number;
  pointsClass: string;
}) {
  return (
    <div className={"grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] px-3 py-2.5 " + bg}>
      <span className={"flex h-[30px] w-[30px] items-center justify-center rounded-full " + iconClass}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className={"text-sm font-extrabold " + nameClass}>{name}</span>
        <span className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
          ניחשת <Pair h={ex[0]} a={ex[1]} /> · נגמר <Pair h={ex[2]} a={ex[3]} />
        </span>
      </span>
      <span className={"font-display text-[26px] font-bold leading-none " + pointsClass}>{points}</span>
    </div>
  );
}

export default function RulesPage() {
  const [supabase] = useState(() => createClient());
  const rules = useScoringRules();
  const [tab, setTab] = useState<"game" | "win">("game");
  const [big, setBig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [matchCount, setMatchCount] = useState(11);
  const [defaultResult, setDefaultResult] = useState<{ h: number; a: number } | null>(null);

  useEffect(() => {
    (async () => {
      const round = await getCurrentRound(supabase);
      if (round) {
        // Real match count of the current round (it has changed before).
        const { count } = await supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id);
        if (count) setMatchCount(count);

        // The jackpot switch starts on the current pot's bracket.
        const { count: approved } = await supabase
          .from("round_participation")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id)
          .eq("payment_status", "approved");
        if (approved !== null) setBig(approved * ENTRY_FEE_ILS > BIG_POT_THRESHOLD);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("default_home_score, default_away_score")
        .eq("id", user.id)
        .single();
      if (data && data.default_home_score !== null && data.default_away_score !== null) {
        setDefaultResult({ h: data.default_home_score, a: data.default_away_score });
      }
    })();
  }, [supabase, showProfile]);

  const fee = ENTRY_FEE_ILS;
  const smallEx = jackpotSplit(8);
  const bigEx = jackpotSplit(15);

  const prizes = [
    {
      place: 1,
      title: "מקום ראשון",
      detail: "כל שאר הקופה",
      amount: "השאר",
      bg: "bg-gold-light",
      medal: "bg-gold text-gold-ink",
      amountFg: "text-[#6E5200]",
      dim: false,
    },
    {
      place: 2,
      title: "מקום שני",
      detail: big ? "2 סיבובים חינם" : "סיבוב חינם",
      amount: `₪${big ? 2 * fee : fee}`,
      bg: "bg-[#F7F7F4]",
      medal: "bg-[linear-gradient(160deg,#E9ECEF_0%,#FFFFFF_45%,#C9CDD2_100%)] text-[#2E3A44]",
      amountFg: "text-ink",
      dim: false,
    },
    {
      place: 3,
      title: "מקום שלישי",
      detail: big ? "סיבוב חינם" : "ללא פרס",
      amount: big ? `₪${fee}` : "—",
      bg: "bg-[#F7F7F4]",
      medal: "bg-[linear-gradient(160deg,#E7B48A_0%,#F6DCC4_45%,#B9774A_100%)] text-[#4A2810]",
      amountFg: big ? "text-ink" : "text-[#8E918A]",
      dim: !big,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-32 pt-[60px]">
      <TopBar />
      <RoundIntroPopup />

      <div className="flex w-full max-w-md flex-col gap-3.5 pt-[18px]">
        <RoundApprovalStatus />

        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-black leading-tight">החוקים</h1>
          <p className="text-sm text-muted">
            {tab === "game" ? "כל מה שצריך לדעת לפני שמנחשים" : "מי זוכה ואיך הקופה מתחלקת"}
          </p>
        </div>

        <div role="tablist" aria-label="סוג החוקים" className="flex gap-1 rounded-full bg-[#ECECE6] p-1">
          {(
            [
              ["game", "חוקי המשחק", icons.book],
              ["win", "חלוקת הקופה", icons.trophy],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-extrabold " +
                (tab === value ? "bg-pitch-800 text-chalk" : "text-muted")
              }
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {tab === "game" && (
          <>
            <Card>
              <CardHead icon={icons.clock}>עד שריקת הפתיחה</CardHead>
              <p className="text-sm leading-relaxed text-[#2E3A32]">
                מנחשים תוצאה מדויקת לכל <b>{matchCount} המשחקים</b> במחזור. אפשר לשנות ניחוש עד שהמשחק הראשון של אותו
                יום מתחיל.
              </p>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1 rounded-xl bg-[#F4F4F0] p-2.5">
                  <span className="inline-flex items-center gap-[5px] text-xs font-extrabold text-[#3F4440]">
                    {icons.lock}
                    שבת 20:30
                  </span>
                  <span className="text-xs leading-snug text-muted">כל משחקי שבת ננעלים</span>
                </div>
                <div className="flex flex-1 flex-col gap-1 rounded-xl bg-green-50 p-2.5">
                  <span className="inline-flex items-center gap-[5px] text-xs font-extrabold text-[#14512D]">
                    {icons.pencil}
                    ראשון ושני
                  </span>
                  <span className="text-xs leading-snug text-[#14512D]">עדיין פתוחים לעריכה</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead icon={icons.target}>ניקוד</CardHead>
              <ScoreRow
                bg="bg-gold-light"
                iconClass="bg-gold text-gold-ink"
                icon={icons.crown}
                nameClass="text-[#5C4400]"
                name="בול: תוצאה מדויקת"
                ex={[2, 1, 2, 1]}
                points={rules.winHit}
                pointsClass="text-[#6E5200]"
              />
              <ScoreRow
                bg="bg-green-50"
                iconClass="bg-pitch-600 text-white"
                icon={icons.trend}
                nameClass="text-[#14512D]"
                name="כיוון + הפרש שערים זהה"
                ex={[2, 0, 3, 1]}
                points={rules.winTowards + rules.sameDiffBonus}
                pointsClass="text-[#14512D]"
              />
              <ScoreRow
                bg="bg-green-50"
                iconClass="bg-pitch-600 text-white"
                icon={icons.trend}
                nameClass="text-[#14512D]"
                name="כיוון תיקו (לא מדויק)"
                ex={[1, 1, 0, 0]}
                points={rules.drawTowards}
                pointsClass="text-[#14512D]"
              />
              <ScoreRow
                bg="bg-[#EEF6F0]"
                iconClass="border-2 border-pitch-600 bg-white text-pitch-600"
                icon={icons.trend}
                nameClass="text-[#14512D]"
                name="כיוון בלבד"
                ex={[1, 0, 3, 1]}
                points={rules.winTowards}
                pointsClass="text-[#14512D]"
              />
              <ScoreRow
                bg="bg-[#F4F4F0]"
                iconClass="bg-miss text-[#3F4440]"
                icon={icons.x}
                nameClass="text-[#3F4440]"
                name="פספוס"
                ex={[2, 1, 1, 1]}
                points={0}
                pointsClass="text-[#6B6F68]"
              />
              {rules.drawHit !== rules.winHit && (
                <p className="text-xs text-muted">בול על תיקו שווה {rules.drawHit} נקודות.</p>
              )}
              <p className="text-xs text-muted">ערכי הניקוד נקבעים ע״י המנהל ועשויים להשתנות בין מחזורים.</p>
            </Card>

            <Card>
              <CardHead icon={icons.alarm}>פספסתם את המועד?</CardHead>
              <p className="text-sm leading-relaxed text-[#2E3A32]">
                תוצאת ברירת המחדל שלכם נכנסת אוטומטית לכל משחק שלא ניחשתם עד הפתיחה.
              </p>
              <div className="flex items-center justify-between rounded-[14px] bg-[#F4F4F0] px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[13px] font-bold">
                  ברירת המחדל שלך
                  {defaultResult ? (
                    <Pair h={defaultResult.h} a={defaultResult.a} className="rounded-md bg-white px-2 py-px text-base" />
                  ) : (
                    <span className="text-muted">לא נקבעה</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  className="inline-flex min-h-9 items-center text-[13px] font-extrabold text-pitch-600 underline-offset-2 hover:underline"
                >
                  שינוי בפרופיל
                </button>
              </div>
            </Card>
          </>
        )}

        {tab === "win" && (
          <Card gold>
            <CardHead icon={icons.crown} gold>
              מי זוכה בקופה
            </CardHead>
            <p className="text-sm leading-relaxed text-[#2E3A32]">
              מי שצובר הכי הרבה נקודות במחזור לוקח את הקופה. בשוויון, לפי הסדר:
            </p>
            <ol className="flex flex-col gap-2.5">
              {[
                "הכי הרבה נקודות",
                "הכי הרבה בולים",
                <span key="3">
                  יותר נקודות ב
                  <span className="bg-gold-light mx-[3px] inline-flex items-center rounded-full px-2 py-px text-xs font-extrabold text-[#5C4400]">
                    המשחק המרכזי
                  </span>
                  של המחזור
                </span>,
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-normal">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-pitch-800 font-display text-[13px] font-semibold text-chalk">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-3 border-t border-[#ECECE6] pt-3.5">
              <h3 className="text-[15px] font-black">חלוקת הקופה</h3>
              <div role="radiogroup" aria-label="גודל הקופה" className="flex gap-1 rounded-full bg-[#ECECE6] p-1">
                {[false, true].map((isBig) => (
                  <button
                    key={String(isBig)}
                    type="button"
                    role="radio"
                    aria-checked={big === isBig}
                    onClick={() => setBig(isBig)}
                    className={
                      "min-h-10 flex-1 rounded-full text-[13px] font-extrabold " +
                      (big === isBig ? "bg-pitch-800 text-chalk" : "text-muted")
                    }
                  >
                    {isBig ? `קופה מעל ₪${BIG_POT_THRESHOLD}` : `קופה עד ₪${BIG_POT_THRESHOLD}`}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {prizes.map((p) => (
                  <div
                    key={p.place}
                    className={"flex items-center gap-3 rounded-[14px] px-3 py-2.5 " + p.bg + (p.dim ? " opacity-55" : "")}
                  >
                    <span
                      className={
                        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold " +
                        p.medal
                      }
                    >
                      {p.place}
                    </span>
                    <span className="flex flex-1 flex-col gap-px">
                      <span className="text-sm font-extrabold">{p.title}</span>
                      <span className="text-xs text-muted">{p.detail}</span>
                    </span>
                    <span className={"font-display text-xl font-bold " + p.amountFg}>{p.amount}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#F4F4F0] px-3 py-[9px] text-xs leading-normal text-[#3F4B43]">
                {icons.info}
                <span>
                  {big
                    ? `לדוגמה: קופה של ₪${bigEx.pot} (15 משתתפים): ₪${bigEx.first} לראשון, ₪${bigEx.second} לשני, ₪${bigEx.third} לשלישי`
                    : `לדוגמה: קופה של ₪${smallEx.pot} (8 משתתפים): ₪${smallEx.first} לראשון, ₪${smallEx.second} לשני`}
                </span>
              </div>
              <span className="text-xs text-muted">
                ״סיבוב חינם״ = החזר של דמי השתתפות אחד, ‎{fee} ש״ח. קופה של בדיוק ₪{BIG_POT_THRESHOLD} נחשבת ״עד ₪
                {BIG_POT_THRESHOLD}״.
              </span>
            </div>
          </Card>
        )}

        <Link href="/privacy" className="mx-auto inline-flex min-h-9 items-center text-xs text-muted underline">
          מדיניות פרטיות
        </Link>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <BottomNav />
    </main>
  );
}
