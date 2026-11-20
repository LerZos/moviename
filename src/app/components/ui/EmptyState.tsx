import Link from "next/link";
import type { ReactNode } from "react";

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
      <h3>{title}</h3>
      <p>{text}</p>
      {action && typeof action === "object" && "href" in action ? (
        <Link href={action.href} className="kl-btn kl-btn--primary">
          {action.label}
        </Link>
      ) : (
        action
      )}
    </div>
  );
}
