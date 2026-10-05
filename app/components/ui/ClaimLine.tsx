import { Fragment } from "react";
import { cx } from "./cx";

/**
 * A " · "-separated claim line, e.g. trustLine()'s "Original · Directly imported · Invoice with GST".
 * Each claim keeps its trailing " ·" and is laid out as one inline-block, so a narrow phone wraps
 * between claims ("Original · Directly imported ·" / "Invoice with GST") instead of inside one or
 * with a separator starting the next line ("… imported" / "· Invoice with GST"). A claim wider than
 * the line still wraps inside its box (max-w-full), so nothing can overflow. Reads as plain text.
 */
export function ClaimLine({ text, className }: { text: string; className?: string }) {
  const claims = text.split(" · ").filter(Boolean);
  return (
    <span className={cx("min-w-0", className)}>
      {claims.map((claim, index) => (
        <Fragment key={`${index}-${claim}`}>
          {index > 0 ? " " : null}
          <span className="inline-block max-w-full">
            {claim}
            {index < claims.length - 1 ? " ·" : null}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
