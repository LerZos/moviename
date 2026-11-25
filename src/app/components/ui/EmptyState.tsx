import Link from "next/link";
import type { ReactNode } from "react";

// Compact empty state: one row with an icon tile, a short title and line, and a link back to the catalog.
export default function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: { href: string; label: string } | ReactNode;
}) {
  return (
    <div className="kl-empty">
      <span className="kl-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="kl-empty-text">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      {action && typeof action === "object" && "href" in action ? (
        <Link href={action.href} className="kl-btn kl-btn--sm">
          {action.label}
        </Link>
      ) : (
        action
      )}
    </div>
  );
}
