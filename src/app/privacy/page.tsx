import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | Prediction Legends",
  description: "איזה מידע Prediction Legends שומר, למה, ואיך שולטים בו — כולל פרסומות Google AdSense וקובצי Cookie.",
};

const UPDATED = "11.11.2026";

const ext = { target: "_blank", rel: "noopener noreferrer", className: "font-bold text-pitch-600 underline" } as const;

const sections: { title: string; icon: React.ReactNode; body: React.ReactNode }[] = [
  {
    title: "המידע שנשמר עליכם",
    icon: <path d="M4 20a8 8 0 0 1 16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    body: (
      <>
        בעת ההתחברות עם Google נשמרים השם וכתובת האימייל שלכם. בנוסף נשמרים הכינוי והאווטאר שבחרתם, תוצאת ברירת המחדל,
        הניחושים, הניקוד וסטטוס ההשתתפות שלכם בכל מחזור. איננו שומרים פרטי תשלום — התשלום עצמו מתבצע מחוץ לאתר
        (Paybox / PayPal).
      </>
    ),
  },
  {
    title: "למה המידע משמש",
    icon: <path d="M4 12h16M4 6h16M4 18h10" />,
    body: (
      <>
        המידע משמש להפעלת המשחק: התחברות, שמירת ניחושים, חישוב ניקוד והצגת טבלת הליגה. שם התצוגה, האווטאר והניקוד שלכם
        גלויים למשתתפים אחרים, וכך גם הניחושים שלכם אחרי שהמשחקים ננעלים. איננו מוכרים את המידע לאף אחד.
      </>
    ),
  },
  {
    title: "קובצי Cookie",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h.01M14 8h.01M15 14h.01M9.5 15h.01M12 12h.01" />
      </>
    ),
    body: (
      <>
        האתר משתמש בקובצי Cookie הכרחיים כדי לשמור אתכם מחוברים, ובאחסון מקומי בדפדפן להעדפות קטנות (למשל ״לא להציג את
        ההודעה שוב״). Google Analytics ו־Google AdSense משתמשים גם הם בקובצי Cookie, כמפורט למטה. אפשר לחסום או למחוק
        קובצי Cookie בהגדרות הדפדפן, אבל בלי קובץ ההתחברות לא תוכלו להישאר מחוברים.
      </>
    ),
  },
  {
    title: "ניתוח שימוש",
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    body: (
      <>
        האתר משתמש ב־Google Analytics כדי להבין איך משתמשים בו (למשל אילו עמודים נצפים). השירות אוסף מידע סטטיסטי ועשוי
        להשתמש בקובצי Cookie ובמזהים דומים. אפשר להתקין את{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" {...ext}>
          תוסף החסימה של Google Analytics
        </a>
        .
      </>
    ),
  },
  {
    title: "פרסומות",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 15l2.5-6L12 15M8 13h3M15 9v6h1.5a2 2 0 0 0 0-6z" />
      </>
    ),
    body: (
      <>
        האתר מציג פרסומות של Google AdSense. ספקים חיצוניים, כולל Google, משתמשים בקובצי Cookie כדי להציג פרסומות על סמך
        הביקורים הקודמים שלכם באתר זה ובאתרים אחרים. השימוש של Google בקובצי Cookie לפרסום מאפשר לה ולשותפיה להציג לכם
        פרסומות על סמך הביקורים שלכם באתר זה ו/או באתרים אחרים ברשת. אפשר לבטל פרסום מותאם אישית ב
        <a href="https://www.google.com/settings/ads" {...ext}>
          הגדרות המודעות של Google
        </a>
        , ולבטל את השימוש בקובצי Cookie של ספקים חיצוניים לפרסום מותאם אישית ב־
        <a href="https://www.aboutads.info/choices/" {...ext}>
          aboutads.info
        </a>
        . מידע נוסף:{" "}
        <a href="https://policies.google.com/technologies/partner-sites" {...ext}>
          איך Google משתמשת במידע מאתרים שמשתמשים בשירותים שלה
        </a>
        .
      </>
    ),
  },
  {
    title: "השליטה שלכם",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
    body: (
      <>
        את הכינוי, האווטאר ותוצאת ברירת המחדל אפשר לשנות בכל רגע מהפרופיל. לבקשה לעיין במידע שלכם, לתקן אותו או למחוק את
        החשבון, פנו למנהל/ת המשחק.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center pb-10">
      <header className="flex h-[60px] w-full shrink-0 items-center justify-center bg-pitch-800">
        <Link href="/" aria-label="Prediction Legends – לדף הראשי">
          <Logo />
        </Link>
      </header>

      <div className="flex w-full max-w-md flex-col gap-3.5 px-4 pt-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-black leading-tight">מדיניות פרטיות</h1>
          <p className="text-sm text-muted">איזה מידע נשמר, למה, ואיך שולטים בו. עודכן לאחרונה: {UPDATED}</p>
        </div>

        {sections.map(({ title, icon, body }) => (
          <section key={title} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-4">
            <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-pitch-600">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
              </span>
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-[#2E3A32]">{body}</p>
          </section>
        ))}

        <section className="flex flex-col gap-2 rounded-[20px] border border-line bg-[#FAFAF7] p-4">
          <h2 className="text-[15px] font-extrabold">קרדיטים</h2>
          <p dir="ltr" className="text-left text-[13px] leading-relaxed text-muted">
            Avatars: remix of{" "}
            <a href="https://www.figma.com/community/file/966199982810283152" target="_blank" rel="noopener noreferrer" className="underline">
              “Croodles – Doodle your face”
            </a>{" "}
            by vijay verma, licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">
              CC BY 4.0
            </a>
            , via{" "}
            <a href="https://www.dicebear.com" target="_blank" rel="noopener noreferrer" className="underline">
              DiceBear
            </a>
            .
          </p>
        </section>

        <Link
          href="/"
          className="mt-2 flex min-h-[50px] items-center justify-center rounded-[14px] bg-pitch-800 text-[15px] font-extrabold text-chalk hover:bg-pitch-900"
        >
          חזרה לדף הראשי
        </Link>
      </div>
    </main>
  );
}
