"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import NewsTicker from "@/components/NewsTicker";
import ProfileModal from "@/components/ProfileModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";

export default function RulesPage() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <h1 className="text-lg font-medium text-ink">חוקים</h1>

      <ul className="w-full max-w-md space-y-3 text-sm text-ink">
        <li>נחשו את התוצאה של כל 7 המשחקים לפני הבעיטה הראשונה של המחזור.</li>
        <li>תוצאה מדויקת ← 10 נקודות (&quot;פגיעה&quot;).</li>
        <li>כיוון נכון, תוצאה לא מדויקת ← 5 נקודות (&quot;כיוון&quot;).</li>
        <li>כיוון לא נכון ← 0 נקודות.</li>
        <li>
          פספסתם את המועד?{" "}
          <button
            onClick={() => setShowProfile(true)}
            className="text-brand underline"
          >
            ניחוש ברירת המחדל
          </button>{" "}
          שלכם יוזן אוטומטית.
        </li>
        <li>מי שצובר הכי הרבה נקודות במחזור זוכה בקופה. שוויון נשבר לפי מספר הפגיעות המדויקות.</li>
      </ul>

      <p className="max-w-md text-center text-xs text-muted">
        ערכי הניקוד נקבעים ע&quot;י המנהל ועשויים להשתנות בין מחזורים.
      </p>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <BottomNav />
    </main>
  );
}
