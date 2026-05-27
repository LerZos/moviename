export const collectionStyles = `
  .kinoluma-collections {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    color: #ffffff;
    color-scheme: dark;
    background:
      radial-gradient(circle at 18% -6%, rgba(255, 255, 255, 0.07), transparent 28%),
      radial-gradient(circle at 90% 8%, rgba(255, 255, 255, 0.045), transparent 24%),
      linear-gradient(180deg, #020202 0%, #000000 48%, #030303 100%);
  }

  .kinoluma-collections::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(circle at 50% 0%, black 0%, transparent 62%);
    opacity: 0.32;
  }

  .collections-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .collections-bg span {
    position: absolute;
    display: block;
    border-radius: 999px;
  }

  .collections-bg span:nth-child(1) {
    width: 520px;
    height: 520px;
    left: -230px;
    top: 130px;
    border: 1px solid rgba(255, 255, 255, 0.055);
    box-shadow: inset 0 0 60px rgba(255, 255, 255, 0.016);
  }

  .collections-bg span:nth-child(2) {
    width: 650px;
    height: 650px;
    right: -290px;
    top: 210px;
    border: 1px solid rgba(255, 255, 255, 0.045);
  }

  .collections-bg span:nth-child(3) {
    width: 7px;
    height: 7px;
    left: 18%;
    top: 310px;
    background: rgba(255, 255, 255, 0.24);
    box-shadow: 0 0 28px rgba(255, 255, 255, 0.18);
  }

  .collections-shell,
  .collections-header {
    position: relative;
    z-index: 2;
  }

  .collections-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    min-height: 78px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 clamp(18px, 4vw, 42px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .collections-brand,
  .collections-header-actions,
  .collection-back-link,
  .collection-card,
  .collection-movie-card,
  .collection-related-card,
  .collection-chip,
  .collection-cta,
  .collection-home-link {
    color: inherit;
    text-decoration: none;
  }

  .collections-brand {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 13px;
    font-weight: 1000;
  }

  .collections-brand img {
    width: 46px;
    height: 46px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 13px;
    background: #050505;
    object-fit: cover;
  }

  .collections-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .collections-header-actions a,
  .collection-back-link,
  .collection-home-link {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.055);
    padding: 0 16px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 12px;
    font-weight: 1000;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .collections-header-actions a:hover,
  .collection-back-link:hover,
  .collection-home-link:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.24);
    background: #ffffff;
    color: #000000;
  }

  .collections-shell {
    width: min(100%, 1480px);
    margin: 0 auto;
    padding: clamp(42px, 6vw, 76px) clamp(18px, 4vw, 42px) 90px;
  }

  .collections-hero,
  .collection-detail-hero,
  .collection-seo-box,
  .collection-faq-card {
    border: 1px solid rgba(255, 255, 255, 0.085);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.024)),
      rgba(5, 5, 5, 0.72);
    box-shadow:
      0 28px 100px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .collections-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 28px;
    align-items: end;
    border-radius: 34px;
    padding: clamp(26px, 4vw, 46px);
  }

  .collection-detail-hero {
    overflow: hidden;
    border-radius: 34px;
  }

  .collection-detail-hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 390px);
    gap: 28px;
    align-items: stretch;
    padding: clamp(26px, 4vw, 46px);
  }

  .collection-kicker,
  .collection-stat-label,
  .collection-section-kicker {
    margin: 0;
    color: #737373;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }

  .collections-hero h1,
  .collection-detail-hero h1 {
    max-width: 980px;
    margin: 14px 0 0;
    color: #ffffff;
    font-size: clamp(42px, 6.4vw, 86px);
    font-weight: 1000;
    letter-spacing: -0.07em;
    line-height: 0.94;
  }

  .collection-detail-hero h1 {
    font-size: clamp(36px, 5.6vw, 76px);
  }

  .collections-hero h2,
  .collection-detail-hero h2 {
    margin: 14px 0 0;
    color: rgba(255, 255, 255, 0.86);
    font-size: clamp(19px, 2.4vw, 30px);
    font-weight: 1000;
    letter-spacing: -0.045em;
  }

  .collections-hero p:not(.collection-kicker),
  .collection-detail-hero p:not(.collection-kicker):not(.collection-stat-label) {
    max-width: 820px;
    margin: 16px 0 0;
    color: #9a9a9a;
    font-size: clamp(14px, 1.45vw, 17px);
    line-height: 1.72;
  }

  .collections-stat-panel,
  .collection-stat-panel {
    min-width: 200px;
    border: 1px solid rgba(255, 255, 255, 0.095);
    border-radius: 28px;
    background: rgba(0, 0, 0, 0.52);
    padding: 22px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .collections-stat-panel strong,
  .collection-stat-panel strong {
    display: block;
    margin-top: 8px;
    color: #ffffff;
    font-size: 56px;
    font-weight: 1000;
    letter-spacing: -0.08em;
    line-height: 0.95;
  }

  .collection-stat-panel p {
    margin-top: 10px !important;
    font-size: 13px !important;
  }

  .collection-top-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .collection-chip {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
    padding: 0 13px;
    color: #d4d4d4;
    font-size: 12px;
    font-weight: 900;
  }

  .collection-section {
    margin-top: 42px;
  }

  .collection-section-topline {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
  }

  .collection-section-topline h2 {
    margin: 6px 0 0;
    color: #ffffff;
    font-size: 26px;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .collection-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .collection-card,
  .collection-related-card {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.085);
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.046), rgba(255, 255, 255, 0.02)),
      rgba(6, 6, 6, 0.82);
    padding: 20px;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }

  .collection-card:hover,
  .collection-related-card:hover,
  .collection-movie-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.028)),
      rgba(10, 10, 10, 0.92);
    box-shadow:
      0 34px 105px rgba(0, 0, 0, 0.64),
      0 0 38px rgba(255, 255, 255, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.11);
  }

  .collection-card h3,
  .collection-related-card h3 {
    margin: 12px 0 0;
    color: #ffffff;
    font-size: 22px;
    font-weight: 1000;
    letter-spacing: -0.04em;
    line-height: 1.12;
  }

  .collection-card p,
  .collection-related-card p {
    margin: 12px 0 0;
    color: #9d9d9d;
    font-size: 14px;
    line-height: 1.65;
  }

  .collection-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 22px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 1000;
  }

  .collection-card-bottom span:last-child {
    color: #a3a3a3;
  }

  .collection-movies-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 20px;
  }

  .collection-movie-card {
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.042), rgba(255, 255, 255, 0.018)),
      #050505;
    box-shadow:
      0 28px 90px rgba(0, 0, 0, 0.46),
      inset 0 1px 0 rgba(255, 255, 255, 0.065);
    transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease, background 220ms ease;
  }

  .collection-movie-poster {
    position: relative;
    display: block;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: #0f0f0f;
  }

  .collection-movie-poster img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 500ms ease, filter 500ms ease;
  }

  .collection-movie-card:hover .collection-movie-poster img {
    transform: scale(1.045);
    filter: brightness(1.06);
  }

  .collection-movie-shade {
    position: absolute;
    inset: auto 0 0;
    height: 45%;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.78));
  }

  .collection-movie-rating,
  .collection-movie-type {
    position: absolute;
    top: 12px;
    display: inline-flex;
    min-height: 27px;
    align-items: center;
    border-radius: 999px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 1000;
    line-height: 1;
  }

  .collection-movie-type {
    left: 12px;
    max-width: calc(100% - 84px);
    overflow: hidden;
    background: rgba(0, 0, 0, 0.74);
    color: #ffffff;
    text-overflow: ellipsis;
    white-space: nowrap;
    backdrop-filter: blur(12px);
  }

  .collection-movie-rating {
    right: 12px;
    background: #ffffff;
    color: #000000;
  }

  .collection-movie-body {
    padding: 16px;
  }

  .collection-movie-body h3 {
    display: -webkit-box;
    min-height: 44px;
    margin: 8px 0 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: #ffffff;
    font-size: 18px;
    font-weight: 1000;
    letter-spacing: -0.03em;
    line-height: 1.18;
  }

  .collection-movie-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #737373;
    font-size: 12px;
    font-weight: 800;
  }

  .collection-movie-description {
    display: -webkit-box;
    min-height: 62px;
    margin: 12px 0 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    color: #949494;
    font-size: 13px;
    line-height: 1.55;
  }

  .collection-movie-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 14px;
  }

  .collection-movie-tags span {
    display: inline-flex;
    min-height: 28px;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.035);
    padding: 0 10px;
    color: #c7c7c7;
    font-size: 11px;
    font-weight: 800;
  }

  .collection-seo-box {
    border-radius: 28px;
    padding: clamp(22px, 3vw, 32px);
  }

  .collection-seo-box p {
    margin: 0;
    color: #a8a8a8;
    font-size: 15px;
    line-height: 1.8;
  }

  .collection-faq-grid,
  .collection-related-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .collection-faq-card {
    border-radius: 24px;
    padding: 20px;
  }

  .collection-faq-card h3 {
    margin: 0 0 9px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 1000;
  }

  .collection-faq-card p {
    margin: 0;
    color: #aaaaaa;
    font-size: 14px;
    line-height: 1.75;
  }

  .collection-cta {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    border: 1px solid #ffffff;
    border-radius: 999px;
    background: #ffffff;
    padding: 0 20px;
    color: #000000;
    font-size: 13px;
    font-weight: 1000;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease;
  }

  .collection-cta:hover {
    transform: translateY(-1px);
    background: #0b0b0b;
    color: #ffffff;
  }

  @media (max-width: 1280px) {
    .collection-movies-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 1024px) {
    .collections-hero,
    .collection-detail-hero-inner {
      grid-template-columns: 1fr;
    }

    .collection-grid,
    .collection-faq-grid,
    .collection-related-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .collection-movies-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .collections-header {
      align-items: stretch;
      flex-direction: column;
      padding-top: 14px;
      padding-bottom: 14px;
    }

    .collections-header-actions {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }

    .collections-header-actions::-webkit-scrollbar {
      display: none;
    }

    .collections-header-actions a {
      flex: 0 0 auto;
    }

    .collection-grid,
    .collection-faq-grid,
    .collection-related-grid,
    .collection-movies-grid {
      grid-template-columns: 1fr;
    }

    .collection-section-topline {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
