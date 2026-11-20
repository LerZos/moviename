import Link from "next/link";
import type { ReactNode } from "react";

import { getHomeCatalogPathWithType } from "../../lib/home/homeCatalogRoutes";

export type SiteHeaderSection = "home" | "films" | "series" | "anime" | "cartoons" | "collections" | "profile";

// Links follow the Genre Navigation contract: catalog types live on "/" as query parameters.
const navItems: Array<{ key: SiteHeaderSection; label: string; href: string }> = [
  { key: "home", label: "Главная", href: "/" },
  { key: "films", label: "Фильмы", href: getHomeCatalogPathWithType("Все", 1, "Фильм") },
  { key: "series", label: "Сериалы", href: getHomeCatalogPathWithType("Все", 1, "Сериал") },
  { key: "anime", label: "Аниме", href: getHomeCatalogPathWithType("Все", 1, "Аниме") },
  { key: "cartoons", label: "Мультфильмы", href: getHomeCatalogPathWithType("Все", 1, "Мультфильм") },
  { key: "collections", label: "Подборки", href: "/collections" },
];

export default function SiteHeader({
  section,
  sectionLabel,
  actions,
}: {
  section?: SiteHeaderSection;
  sectionLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="kl-header">
      <div className="kl-container kl-header-inner">
        <Link href="/" className="kl-brand" aria-label="KinoLuma — на главную">
          {/* Static brand mark from /public; next/image adds nothing for a 34px icon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kinoluma-icon.png" alt="" width={34} height={34} className="kl-brand-mark" />
          <span className="kl-brand-text">
            <span className="kl-brand-name">KinoLuma</span>
            {sectionLabel ? <span className="kl-brand-section">{sectionLabel}</span> : null}
          </span>
        </Link>

        <nav className="kl-header-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Link key={item.key} href={item.href} aria-current={section === item.key ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        {actions ? <div className="kl-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
