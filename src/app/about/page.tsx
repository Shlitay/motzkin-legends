import type { Metadata } from "next";
import Link from "next/link";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import PublicHeader from "@/components/PublicHeader";
import { BIG_POT_THRESHOLD } from "@/lib/jackpot";
import { DEFAULT_RULES as R } from "@/lib/scoringDefaults";

export const metadata: Metadata = {
  title: "איך זה עובד | Prediction Legends",
  description:
    "מה זה Prediction Legends, איך עובד מחזור ניחושים, איך מחושב הניקוד, איך מתחלקת הקופה, וטיפים לניחוש תוצאות כדורגל.",
};

// Public, server-rendered explainer: the page Google reads when it reviews
// the site, and a link players can send to friends before they sign up.

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-4">
      <h2 className="flex items-center gap-2.5 text-[17px] font-extrabold">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-pitch-600">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-[#2E3A32]">{children}</div>
    </section>
  );
}

const tips: { title: string; body: string }[] = [
  {
    title: "תתחילו מהתוצאות הנפוצות",
    body: "בכדורגל רוב המשחקים נגמרים בהפרש של שער אחד או בתיקו. 1:0, 2:1, 1:1 ו־0:0 הן התוצאות הכי שכיחות, ולכן בול עליהן קורה הרבה יותר מבול על 4:2.",
  },
  {
    title: "בית זה לא רק מילה",
    body: "קבוצה ביתית מנצחת לאורך עונה יותר משהיא מפסידה, במיוחד מול קבוצות מהחצי התחתון. כשאין סיבה ברורה לחשוב אחרת, יתרון ביתיות קטן הוא נקודת פתיחה טובה.",
  },
  {
    title: "ההפרש שווה נקודה",
    body: `גם כשלא פוגעים בתוצאה המדויקת, ניחוש עם הפרש השערים הנכון שווה ${R.winTowards + R.sameDiffBonus} נקודות במקום ${R.winTowards}. מי שחושב שהפייבוריטית תנצח בשני שערים, עדיף שינחש 2:0 או 3:1 ולא 1:0.`,
  },
  {
    title: "אל תפחדו מתיקו",
    body: `כיוון תיקו שווה ${R.drawTowards} נקודות, יותר מכיוון רגיל. במשחקים צמודים בין קבוצות קרובות בטבלה, תיקו הוא הימור לגיטימי ולא ״בריחה״.`,
  },
  {
    title: "תסתכלו על הכושר, לא רק על השם",
    body: "קבוצה גדולה בתקופה רעה, פציעות של שחקני מפתח, או משחק אירופי באמצע השבוע — כל אלה משנים את התמונה. כמה דקות על הטבלה ועל חמשת המשחקים האחרונים שוות הרבה נקודות.",
  },
  {
    title: "תשאירו ברירת מחדל חכמה",
    body: "תוצאת ברירת המחדל נכנסת לכל משחק ששכחתם. 1:1 או 1:0 לבית הן בחירות שמביאות נקודות לא מעט פעמים, הרבה יותר מ־0:0 שנבחר סתם.",
  },
];

const faq: { q: string; a: string }[] = [
  {
    q: "צריך להירשם?",
    a: "מתחברים עם חשבון Google בלחיצה אחת, בוחרים כינוי ואווטאר, וזהו. אין סיסמה נוספת לזכור.",
  },
  {
    q: "איך מתעדכנות התוצאות?",
    a: "התוצאות נכנסות אוטומטית כמה דקות אחרי כל עדכון במגרש, והטבלה מתעדכנת איתן — אפשר לעקוב בזמן אמת במהלך המשחקים.",
  },
  {
    q: "מתי רואים מה החברים ניחשו?",
    a: "הניחושים של כולם נחשפים רק אחרי שהמשחק ננעל, כך שאף אחד לא יכול להעתיק.",
  },
];

export default function AboutPage() {
  const fee = ENTRY_FEE_ILS;
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-12 pt-[60px]">
      <PublicHeader />

      <div className="flex w-full max-w-md flex-col gap-3.5 pt-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-black leading-tight">איך זה עובד</h1>
          <p className="text-sm text-muted">
            Prediction Legends היא ליגת ניחושים לכדורגל בין חברים. בכל מחזור מנחשים תוצאות מדויקות, צוברים נקודות,
            ומתחרים על המקום הראשון בטבלה.
          </p>
        </div>

        <Section title="מה זה בכלל" icon={<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v.01M11 12h1v5h1" />}>
          <p>
            הרעיון פשוט: לפני כל מחזור, כל משתתף מנחש את התוצאה של כל אחד ממשחקי המחזור — לא רק מי ינצח, אלא
            בכמה. רוב המשחקים הם מליגת העל, ולפעמים מצטרף גם משחק גדול מחו״ל. כשהמשחקים נגמרים, כל ניחוש מקבל ניקוד לפי כמה הוא היה קרוב למציאות.
          </p>
          <p>
            במקום ויכוחים בקבוצת הוואטסאפ על מי ״ידע״ את התוצאה מראש, יש טבלה מסודרת, ניקוד שקוף, ותוצאות שמתעדכנות לבד.
          </p>
        </Section>

        <Section title="מחזור אחד, צעד אחר צעד" icon={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />}>
          <ol className="flex list-decimal flex-col gap-1.5 ps-5">
            <li>
              <b>המחזור נפתח.</b> המנהל מפרסם את משחקי המחזור, בדרך כלל 11 משחקים, עם ימים ושעות.
            </li>
            <li>
              <b>מנחשים.</b> לכל משחק בוחרים תוצאה מדויקת, למשל 2:1. אפשר לחזור ולשנות כמה פעמים שרוצים.
            </li>
            <li>
              <b>ננעל לפי ימים.</b> ניחושים של יום מסוים ננעלים כשהמשחק הראשון באותו יום מתחיל. משחקים של הימים הבאים
              נשארים פתוחים לעריכה.
            </li>
            <li>
              <b>עוקבים בלייב.</b> במהלך המשחקים התוצאות והטבלה מתעדכנות אוטומטית, ורואים מי עולה ומי נופל.
            </li>
            <li>
              <b>מכריזים על אלוף.</b> בסוף המחזור מי שצבר הכי הרבה נקודות זוכה, ומתחיל מחזור חדש.
            </li>
          </ol>
        </Section>

        <Section title="איך מחושב הניקוד" icon={<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></>}>
          <p>כל ניחוש מקבל ניקוד לפי הקטגוריה הכי טובה שהוא עומד בה:</p>
          <ul className="flex flex-col gap-1.5">
            <li>
              <b>בול — {R.winHit} נקודות.</b> ניחשתם 2:1 והמשחק נגמר 2:1.
            </li>
            <li>
              <b>כיוון + הפרש — {R.winTowards + R.sameDiffBonus} נקודות.</b> ניחשתם 2:0 ונגמר 3:1: המנצחת נכונה וגם
              ההפרש.
            </li>
            <li>
              <b>כיוון תיקו — {R.drawTowards} נקודות.</b> ניחשתם 1:1 ונגמר 0:0.
            </li>
            <li>
              <b>כיוון — {R.winTowards} נקודות.</b> ניחשתם 1:0 ונגמר 3:1: המנצחת נכונה, ההפרש לא.
            </li>
            <li>
              <b>פספוס — 0.</b> ניחשתם ניצחון ונגמר תיקו או הפסד.
            </li>
          </ul>
          <p className="text-xs text-muted">
            אלה ערכי ברירת המחדל. המנהל יכול לעדכן אותם, והערכים העדכניים תמיד מופיעים ב
            <Link href="/rules" className="font-bold text-pitch-600 underline">
              עמוד החוקים
            </Link>
            .
          </p>
        </Section>

        <Section title="שוויון בנקודות" icon={<path d="M5 9h14M5 15h14" />}>
          <p>
            כשכמה משתתפים מסיימים עם אותו מספר נקודות, מכריעים לפי הסדר: מי שיש לו יותר בולים, ואם עדיין יש שוויון — מי
            שצבר יותר נקודות ב״משחק המרכזי״ של המחזור, משחק אחד שהמנהל מסמן מראש.
          </p>
        </Section>

        <Section title="השתתפות והקופה" icon={<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>}>
          <p>
            דמי ההשתתפות הם ‎{fee} ש״ח למחזור, ומשלמים אותם ישירות למנהל דרך Paybox או PayPal. אחרי שהמנהל מאשר את
            התשלום, ההשתתפות במחזור מסומנת כמאושרת. האתר עצמו לא גובה כסף ולא שומר פרטי תשלום.
          </p>
          <p>
            כל דמי ההשתתפות של המחזור נכנסים לקופה אחת. המקום השני מקבל החזר של דמי השתתפות אחד (״סיבוב חינם״), וכל השאר
            הולך למקום הראשון. כשהקופה גדולה מ־₪{BIG_POT_THRESHOLD}, המקום השני מקבל שני סיבובים חינם והמקום השלישי
            סיבוב אחד. בעמוד החוקים יש מחשבון שמראה את החלוקה לכל מספר משתתפים.
          </p>
        </Section>

        <Section title="שכחתם לנחש?" icon={<><path d="M12 8v5l3 2" /><circle cx="12" cy="13" r="8" /></>}>
          <p>
            לכל משתתף יש ״תוצאת ברירת מחדל״ שבוחרים בפרופיל. אם משחק ננעל ולא ניחשתם אותו, התוצאה הזו נכנסת אוטומטית —
            כך שגם בשבוע עמוס לא מפסידים מחזור שלם.
          </p>
        </Section>

        <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4">
          <h2 className="text-[17px] font-extrabold">טיפים לניחוש טוב יותר</h2>
          {tips.map((t) => (
            <div key={t.title} className="flex flex-col gap-0.5">
              <h3 className="text-sm font-extrabold">{t.title}</h3>
              <p className="text-sm leading-relaxed text-[#2E3A32]">{t.body}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4">
          <h2 className="text-[17px] font-extrabold">שאלות נפוצות</h2>
          {faq.map((f) => (
            <div key={f.q} className="flex flex-col gap-0.5">
              <h3 className="text-sm font-extrabold">{f.q}</h3>
              <p className="text-sm leading-relaxed text-[#2E3A32]">{f.a}</p>
            </div>
          ))}
        </section>

        <Link
          href="/"
          className="mt-2 flex min-h-[50px] items-center justify-center rounded-[14px] bg-pitch-800 text-[15px] font-extrabold text-chalk hover:bg-pitch-900"
        >
          מצטרפים לליגה
        </Link>
        <div className="flex justify-center gap-[18px] text-xs">
          <Link href="/rules" className="inline-flex min-h-8 items-center text-muted underline">
            החוקים המלאים
          </Link>
          <Link href="/privacy" className="inline-flex min-h-8 items-center text-muted underline">
            מדיניות פרטיות
          </Link>
        </div>
      </div>
    </main>
  );
}
