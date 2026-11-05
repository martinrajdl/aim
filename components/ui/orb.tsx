import type { CSSProperties } from "react";
export function Orb({ size = 32 }: { size?: number }) {
  return (
    <span
      className="aim-loader"
      style={{ "--aim-loader-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    />
  );
}
