import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | Prediction Legends",
};

const sections = [
  {
    title: "המידע שנשמר עליכם",
    body: "בעת ההתחברות עם Google נשמרים השם וכתובת האימייל שלכם. בנוסף נשמרים הכינוי והאווטאר שבחרתם, הניחושים, התגובות, הניקוד וסטטוס ההשתתפות שלכם בכל מחזור.",
  },
  {
    title: "למה המידע משמש",
    body: "המידע משמש להפעלת המשחק: התחברות, שמירת ניחושים, חישוב ניקוד והצגת טבלת הליגה. שם התצוגה, האווטאר והניקוד שלכם גלויים למשתתפים אחרים, וכך גם ניחושים לאחר נעילתם.",
  },
  {
    title: "ניתוח שימוש",
    body: "האתר משתמש ב-Google Analytics כדי להבין איך משתמשים בו. השירות עשוי להשתמש בקובצי Cookie ובמזהים דומים.",
  },
  {
    title: "פרסומות",
    body: "האתר עשוי להציג פרסומות של Google AdSense. Google ושותפיה עשויים להשתמש בקובצי Cookie כדי להציג פרסומות על סמך ביקורים קודמים שלכם באתר זה ובאתרים אחרים.",
  },
  {
    title: "השליטה שלכם",
    body: "אפשר לכבות פרסום מותאם אישית בהגדרות המודעות של Google. לבקשה לעיין במידע שלכם או למחוק אותו, פנו למנהל/ת המשחק.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-center text-2xl font-bold text-brand">מדיניות פרטיות</h1>

      {sections.map(({ title, body }) => (
        <section key={title}>
          <h2 className="mb-1 font-semibold text-ink">{title}</h2>
          <p className="text-sm leading-relaxed text-muted">{body}</p>
        </section>
      ))}

      <p className="text-sm text-muted">
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          הגדרות המודעות של Google
        </a>
        {" · "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          איך Google משתמשת במידע
        </a>
      </p>

      <Link href="/" className="text-center text-sm text-muted underline">
        חזרה לדף הראשי
      </Link>
    </main>
  );
}
