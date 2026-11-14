import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "החוקים | Prediction Legends",
  description:
    "חוקי ליגת הניחושים: עד מתי מנחשים, איך מחושב הניקוד (בול, כיוון, הפרש), מי זוכה בקופה ואיך היא מתחלקת.",
};

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
