"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { CheckCircleIcon, ClockIcon, TargetIcon, WinnerIcon } from "@/components/icons";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import NewsTicker from "@/components/NewsTicker";
import ProfileModal from "@/components/ProfileModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";

export default function RulesPage() {
  const [supabase] = useState(() => createClient());
  const [showProfile, setShowProfile] = useState(false);
  const [exactPoints, setExactPoints] = useState(10);
  const [correctPoints, setCorrectPoints] = useState(5);

  // Scoring values are manager-configurable (see /manager's "כללי ניקוד"),
  // so this page reads the live rule instead of hardcoding a number that
  // could silently drift out of date.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scoring_rules")
        .select("exact_score_points, correct_result_points")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExactPoints(data.exact_score_points);
        setCorrectPoints(data.correct_result_points);
      }
    })();
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />

      <div className="text-center">
        <h1 className="text-lg font-medium text-ink">חוקי המשחק</h1>
        <p className="mt-1 text-sm text-muted">כל מה שצריך לדעת לפני שמנחשים</p>
      </div>

      <RuleCard icon={<ClockIcon size={22} />} title="לפני הבעיטה הראשונה">
        נחשו את התוצאה המדויקת של כל 7 המשחקים במחזור — הניחושים ננעלים ברגע שהמחזור נסגר ולא ניתן לשנות אותם יותר.
      </RuleCard>

      <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
        <CardHeader icon={<TargetIcon size={22} />} title="ניקוד" />
        <div className="mt-4 flex flex-col gap-2.5">
          <ScoreRow dotClass="bg-brand" bgClass="bg-brand/10" textClass="text-brand" label="פגיעה — תוצאה מדויקת" points={exactPoints} />
          <ScoreRow dotClass="bg-draw" bgClass="bg-draw/10" textClass="text-draw" label="כיוון — כיוון נכון, תוצאה לא מדויקת" points={correctPoints} />
          <ScoreRow dotClass="bg-neutral-400" bgClass="bg-neutral-100" textClass="text-neutral-500" label="כיוון לא נכון" points={0} />
        </div>
      </section>

      <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
        <CardHeader icon={<WinnerIcon size={22} />} title="מי זוכה בקופה" />
        <p className="mt-3 text-sm text-ink">
          מי שצובר הכי הרבה נקודות במחזור זוכה. שוויון נשבר לפי הסדר הבא:
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          <TiebreakStep n={1}>הכי הרבה נקודות</TiebreakStep>
          <TiebreakStep n={2}>אם עדיין שוויון — הכי הרבה פגיעות מדויקות</TiebreakStep>
          <TiebreakStep n={3}>
            אם עדיין שוויון — מי שהגיש את הניחושים ראשון (זמן ההגשה הראשונה, עדכון ניחוש מאוחר יותר לא משנה את הזמן הזה)
          </TiebreakStep>
        </ol>
        <p className="mt-4 text-sm text-ink">
          המקום השני מקבל בחזרה את דמי ההשתתפות שלו ({ENTRY_FEE_ILS} ₪).
        </p>
      </section>

      <RuleCard icon={<CheckCircleIcon size={22} />} title="פספסתם את המועד?">
        <>
          הניחוש שהגדרתם כ
          <button onClick={() => setShowProfile(true)} className="mx-1 text-brand underline">
            ברירת מחדל בפרופיל
          </button>
          יוזן אוטומטית לכל משחק שלא ניחשתם עד סגירת המחזור.
        </>
      </RuleCard>

      <p className="max-w-md text-center text-xs text-muted">
        ערכי הניקוד נקבעים ע&quot;י המנהל ועשויים להשתנות בין מחזורים.
      </p>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <BottomNav />
    </main>
  );
}

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        {icon}
      </span>
      <h2 className="text-base font-bold text-ink">{title}</h2>
    </div>
  );
}

function RuleCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <CardHeader icon={icon} title={title} />
      <p className="mt-3 text-sm leading-relaxed text-ink">{children}</p>
    </section>
  );
}

function ScoreRow({
  dotClass,
  bgClass,
  textClass,
  label,
  points,
}: {
  dotClass: string;
  bgClass: string;
  textClass: string;
  label: string;
  points: number;
}) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${bgClass}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        {label}
      </span>
      <span className={`font-display text-lg font-bold tabular-nums ${textClass}`}>{points}</span>
    </div>
  );
}

function TiebreakStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-ink">{children}</span>
    </li>
  );
}
