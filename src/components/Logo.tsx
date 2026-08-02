import { caveat } from "@/lib/fonts";
import { OneXTwoIcon } from "@/components/icons";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={"flex flex-col items-center gap-1 " + (className ?? "")}>
      <OneXTwoIcon size={40} />
      <span className={caveat.className + " text-3xl leading-none"}>
        Motzkin Legends
      </span>
    </div>
  );
}
