// A player's avatar: either a library id ("avatar-07", the SVG set in
// public/avatars) or a legacy emoji from before the redesign.
export default function Avatar({
  avatar,
  size = 26,
  className = "",
}: {
  avatar: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (avatar?.startsWith("avatar-")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/avatars/${avatar}.svg`} alt="" style={style} className={"shrink-0 rounded-full object-cover " + className} />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.6) }}
      className={"flex shrink-0 items-center justify-center rounded-full leading-none " + className}
    >
      {avatar ?? "🙂"}
    </span>
  );
}
