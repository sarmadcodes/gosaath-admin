import mark from "../brand-mark.png";

/**
 * The GoSaath mark.
 *
 * The actual asset from the mobile app (GoSaath/assets/icon.png), copied in
 * rather than redrawn. An admin console that carries a hand-made
 * approximation of the logo is the clearest possible signal that it is a
 * different product built by a different team, which is exactly what this is
 * not: the console is another surface of GoSaath.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <img
      src={mark}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: size * 0.28, display: "block", flexShrink: 0 }}
    />
  );
}

/**
 * The mark with the product name.
 *
 * One name, always: "GoSaath". What follows it is the surface you are on and
 * the scope you hold, not a second product name.
 */
export function BrandLock({
  scope,
  size = 26,
}: {
  scope?: string;
  size?: number;
}) {
  return (
    <span className="row gap-3" style={{ minWidth: 0 }}>
      <BrandMark size={size} />
      <span className="stack" style={{ gap: 0, minWidth: 0 }}>
        <span className="h2" style={{ fontSize: 15, lineHeight: "20px" }}>
          GoSaath
        </span>
        {scope ? (
          <span className="caption t-3 truncate" style={{ lineHeight: "14px" }}>
            {scope}
          </span>
        ) : null}
      </span>
    </span>
  );
}
