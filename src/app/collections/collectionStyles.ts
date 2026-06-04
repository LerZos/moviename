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
  .collection-topic-card,
  .collection-topic-chip,
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
    grid-template-columns: minmax(0, 1fr) minmax(240px, 340px);
    gap: 28px;
    align-items: start;
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
    width: 100%;
    max-width: 340px;
    border: 1px solid rgba(255, 255, 255, 0.095);
    border-radius: 28px;
    background: rgba(0, 0, 0, 0.52);
    padding: 22px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .collection-stat-panel {
    justify-self: end;
    align-self: start;
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
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
    padding: 0 13px;
    color: #d4d4d4;
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
    vertical-align: middle;
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

  .collection-movie-body h3,
  .collection-movie-title-button {
    display: -webkit-box;
    min-height: 44px;
    margin: 8px 0 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    border: 0;
    background: transparent;
    padding: 0;
    color: #ffffff;
    font: inherit;
    font-size: 18px;
    font-weight: 1000;
    letter-spacing: -0.03em;
    line-height: 1.18;
    text-align: left;
    cursor: pointer;
  }

  .collection-movie-title-button:hover {
    color: rgba(255, 255, 255, 0.78);
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
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.035);
    padding: 0 10px;
    color: #c7c7c7;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
  }


  @keyframes collectionCardEnter {
    from {
      opacity: 0;
      translate: 0 34px;
      scale: 0.975;
      filter: blur(10px);
    }

    to {
      opacity: 1;
      translate: 0 0;
      scale: 1;
      filter: blur(0);
    }
  }

  @keyframes collectionPageFadeUp {
    from {
      opacity: 0;
      translate: 0 26px;
      filter: blur(8px);
    }

    to {
      opacity: 1;
      translate: 0 0;
      filter: blur(0);
    }
  }

  @keyframes collectionModalOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes collectionModalCardIn {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.975);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .collections-hero,
  .collection-detail-hero,
  .collection-section-topline,
  .collection-seo-box {
    opacity: 0;
    animation: collectionPageFadeUp 720ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: opacity, transform, filter;
  }

  .collections-hero {
    animation-delay: 70ms;
  }

  .collection-detail-hero {
    animation-delay: 70ms;
  }

  .collection-section-topline {
    animation-delay: 150ms;
  }

  .collection-seo-box {
    animation-delay: 210ms;
  }

  .collection-card,
  .collection-related-card,
  .collection-topic-card,
  .collection-faq-card {
    opacity: 0;
    animation: collectionCardEnter 760ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: opacity, transform, filter;
  }

  .collection-grid .collection-card:nth-child(1),
  .collection-related-grid .collection-related-card:nth-child(1),
  .collection-faq-grid .collection-faq-card:nth-child(1) { animation-delay: 150ms; }
  .collection-grid .collection-card:nth-child(2),
  .collection-related-grid .collection-related-card:nth-child(2),
  .collection-faq-grid .collection-faq-card:nth-child(2) { animation-delay: 220ms; }
  .collection-grid .collection-card:nth-child(3),
  .collection-related-grid .collection-related-card:nth-child(3),
  .collection-faq-grid .collection-faq-card:nth-child(3) { animation-delay: 290ms; }
  .collection-grid .collection-card:nth-child(4),
  .collection-related-grid .collection-related-card:nth-child(4),
  .collection-faq-grid .collection-faq-card:nth-child(4) { animation-delay: 360ms; }
  .collection-grid .collection-card:nth-child(5),
  .collection-related-grid .collection-related-card:nth-child(5),
  .collection-faq-grid .collection-faq-card:nth-child(5) { animation-delay: 430ms; }
  .collection-grid .collection-card:nth-child(6),
  .collection-related-grid .collection-related-card:nth-child(6),
  .collection-faq-grid .collection-faq-card:nth-child(6) { animation-delay: 500ms; }
  .collection-grid .collection-card:nth-child(7),
  .collection-related-grid .collection-related-card:nth-child(7),
  .collection-faq-grid .collection-faq-card:nth-child(7) { animation-delay: 570ms; }
  .collection-grid .collection-card:nth-child(8),
  .collection-related-grid .collection-related-card:nth-child(8),
  .collection-faq-grid .collection-faq-card:nth-child(8) { animation-delay: 640ms; }
  .collection-grid .collection-card:nth-child(9),
  .collection-related-grid .collection-related-card:nth-child(9),
  .collection-faq-grid .collection-faq-card:nth-child(9) { animation-delay: 710ms; }
  .collection-grid .collection-card:nth-child(10),
  .collection-related-grid .collection-related-card:nth-child(10),
  .collection-faq-grid .collection-faq-card:nth-child(10) { animation-delay: 780ms; }
  .collection-grid .collection-card:nth-child(11),
  .collection-related-grid .collection-related-card:nth-child(11),
  .collection-faq-grid .collection-faq-card:nth-child(11) { animation-delay: 850ms; }
  .collection-grid .collection-card:nth-child(12),
  .collection-related-grid .collection-related-card:nth-child(12),
  .collection-faq-grid .collection-faq-card:nth-child(12) { animation-delay: 920ms; }

  .collection-movie-card-interactive {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    opacity: 0;
    transform: translate3d(0, 52px, 0) scale(0.972);
    filter: blur(14px);
    animation: none !important;
    transition:
      opacity 980ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 1120ms cubic-bezier(0.16, 1, 0.3, 1),
      filter 980ms cubic-bezier(0.16, 1, 0.3, 1),
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
    will-change: opacity, transform, filter;
  }

  .collection-movie-card-interactive.collection-movie-card-visible {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0);
  }

  .collection-movie-card-interactive.collection-movie-card-visible:hover {
    transform: translate3d(0, -6px, 0) scale(1.01);
  }

  .collection-movie-card-interactive .collection-movie-body {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .collection-movie-poster-button {
    width: 100%;
    border: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .collection-movie-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: auto;
    padding-top: 16px;
  }

  .collection-movie-trailer-button,
  .collection-movie-more-button,
  .collection-details-primary,
  .collection-details-secondary {
    min-height: 44px;
    border-radius: 13px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 1000;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
  }

  .collection-movie-trailer-button,
  .collection-details-primary {
    border: 1px solid #ffffff;
    background: #ffffff;
    color: #000000;
  }

  .collection-movie-more-button,
  .collection-details-secondary {
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.045);
    color: #ffffff;
  }

  .collection-movie-trailer-button:hover,
  .collection-movie-more-button:hover,
  .collection-details-primary:hover,
  .collection-details-secondary:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.32);
  }

  .collection-movie-trailer-button:disabled,
  .collection-details-primary:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    transform: none;
  }

  .collection-details-overlay,
  .collection-trailer-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.84);
    padding: 18px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: collectionModalOverlayIn 180ms ease-out forwards;
  }

  .collection-trailer-overlay {
    z-index: 140;
    background: rgba(0, 0, 0, 0.9);
  }

  .collection-details-card {
    position: relative;
    display: grid;
    width: min(1040px, 100%);
    max-height: 92vh;
    overflow: hidden;
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 30px;
    background:
      radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.08), transparent 30%),
      #050505;
    box-shadow: 0 32px 120px rgba(0, 0, 0, 0.72);
    animation: collectionModalCardIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .collection-details-poster {
    min-height: 520px;
    background: #111111;
  }

  .collection-details-poster img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .collection-details-content {
    overflow-y: auto;
    padding: clamp(24px, 4vw, 38px);
  }

  .collection-modal-close {
    position: absolute;
    right: 16px;
    top: 16px;
    z-index: 5;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.75);
    color: #ffffff;
    font-size: 24px;
    font-weight: 1000;
    line-height: 1;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease;
  }

  .collection-modal-close:hover {
    transform: scale(1.04);
    background: #ffffff;
    color: #000000;
  }

  .collection-details-kicker,
  .collection-trailer-head p {
    margin: 0;
    color: #737373;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .collection-details-content h3,
  .collection-trailer-head h3 {
    margin: 12px 0 0;
    color: #ffffff;
    font-size: clamp(32px, 4.5vw, 54px);
    font-weight: 1000;
    letter-spacing: -0.06em;
    line-height: 0.98;
  }

  .collection-details-original {
    margin: 10px 0 0;
    color: #737373;
    font-size: 18px;
    font-weight: 900;
  }

  .collection-details-badges,
  .collection-details-tags,
  .collection-details-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
  }

  .collection-details-badges span {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0 15px;
    font-size: 13px;
    font-weight: 1000;
    line-height: 1;
  }

  .collection-details-badges span:first-child {
    background: #ffffff;
    color: #000000;
  }

  .collection-details-badges span:last-child,
  .collection-details-tags span {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.045);
    color: #d4d4d4;
  }

  .collection-details-description {
    display: -webkit-box;
    max-height: 190px;
    margin: 22px 0 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    color: #b6b6b6;
    font-size: 15px;
    line-height: 1.75;
  }

  .collection-details-tags span {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
    vertical-align: middle;
  }

  .collection-details-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 22px;
  }

  .collection-details-info-grid div {
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.035);
    padding: 13px;
  }

  .collection-details-info-grid span,
  .collection-details-info-grid strong {
    display: block;
  }

  .collection-details-info-grid span {
    color: #737373;
    font-size: 11px;
    font-weight: 1000;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .collection-details-info-grid strong {
    margin-top: 6px;
    color: #ffffff;
    font-size: 13px;
    line-height: 1.35;
  }

  .collection-details-actions {
    margin-top: 26px;
  }

  .collection-trailer-card {
    position: relative;
    width: min(980px, 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 26px;
    background: #050505;
    padding: 18px;
    box-shadow: 0 32px 120px rgba(0, 0, 0, 0.72);
    animation: collectionModalCardIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .collection-trailer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 16px;
    padding-right: 54px;
  }

  .collection-trailer-head h3 {
    font-size: clamp(22px, 3vw, 34px);
  }

  .collection-trailer-frame {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 18px;
    background: #000000;
  }

  .collection-trailer-frame iframe {
    width: 100%;
    height: 100%;
    border: 0;
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

  .collection-topic-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .collection-topic-card {
    display: grid;
    min-height: 132px;
    align-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.085);
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.058), rgba(255, 255, 255, 0.022)),
      rgba(5, 5, 5, 0.68);
    padding: 18px;
    color: inherit;
    text-decoration: none;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .collection-topic-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.065);
  }

  .collection-topic-card span,
  .collection-topic-card em {
    color: #858585;
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
  }

  .collection-topic-card strong {
    display: block;
    margin: 8px 0;
    color: #ffffff;
    font-size: 17px;
    line-height: 1.15;
    font-weight: 1000;
  }

  .collection-topic-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .collection-topic-chip {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
    padding: 0 14px;
    color: #e5e5e5;
    font-size: 13px;
    font-weight: 950;
    text-decoration: none;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .collection-topic-chip:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.08);
  }

  .collection-topic-grid,
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



  /* Реальные появления после гидрации: теперь элементы не "пролетают" до загрузки страницы,
     а плавно раскрываются, когда пользователь до них доходит. */
  .collections-hero,
  .collection-detail-hero,
  .collection-section-topline,
  .collection-seo-box,
  .collection-card,
  .collection-related-card,
  .collection-faq-card,
  .collection-back-link,
  .collections-stat-panel,
  .collection-stat-panel {
    animation: none !important;
    opacity: 1;
    transform: none;
    translate: none;
    scale: 1;
    filter: none;
  }

  .kinoluma-reveal-ready .collection-reveal-item {
    opacity: 0;
    transform: translate3d(0, 58px, 0) scale(0.968);
    filter: blur(16px);
    transition:
      opacity 1050ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 1200ms cubic-bezier(0.16, 1, 0.3, 1),
      filter 1100ms cubic-bezier(0.16, 1, 0.3, 1),
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
    transition-delay: var(--collection-reveal-delay, 0ms), var(--collection-reveal-delay, 0ms), var(--collection-reveal-delay, 0ms), 0ms, 0ms, 0ms;
    will-change: opacity, transform, filter;
  }

  .kinoluma-reveal-ready .collection-reveal-item.is-visible {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0);
  }

  .kinoluma-reveal-ready .collection-card.collection-reveal-item.is-visible:hover,
  .kinoluma-reveal-ready .collection-related-card.collection-reveal-item.is-visible:hover {
    transform: translate3d(0, -6px, 0) scale(1.01);
  }

  .kinoluma-reveal-ready .collection-section-topline.collection-reveal-item,
  .kinoluma-reveal-ready .collection-back-link.collection-reveal-item {
    transform: translate3d(0, 26px, 0);
    filter: blur(8px);
  }

  .kinoluma-reveal-ready .collection-section-topline.collection-reveal-item.is-visible,
  .kinoluma-reveal-ready .collection-back-link.collection-reveal-item.is-visible {
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }

  .kinoluma-reveal-ready .collections-hero.collection-reveal-item,
  .kinoluma-reveal-ready .collection-detail-hero.collection-reveal-item {
    transform: translate3d(0, 34px, 0) scale(0.988);
    filter: blur(10px);
  }

  .kinoluma-reveal-ready .collections-hero.collection-reveal-item.is-visible,
  .kinoluma-reveal-ready .collection-detail-hero.collection-reveal-item.is-visible {
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0);
  }


  @media (max-width: 1280px) {
    .collection-movies-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 1024px) {
    .collections-hero,
    .collection-detail-hero-inner,
    .collection-details-card {
      grid-template-columns: 1fr;
    }

    .collection-stat-panel {
      justify-self: stretch;
    }

    .collection-details-poster {
      min-height: 360px;
      max-height: 460px;
    }

    .collection-grid,
    .collection-topic-grid,
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
    .collection-topic-grid,
    .collection-faq-grid,
    .collection-related-grid,
    .collection-movies-grid,
    .collection-details-info-grid {
      grid-template-columns: 1fr;
    }

    .collection-details-overlay,
    .collection-trailer-overlay {
      align-items: flex-start;
      padding: 12px;
    }

    .collection-details-card {
      max-height: none;
      border-radius: 24px;
    }

    .collection-details-poster {
      min-height: 0;
      aspect-ratio: 2 / 3;
    }

    .collection-details-content {
      overflow: visible;
      padding: 22px;
    }

    .collection-section-topline {
      align-items: flex-start;
      flex-direction: column;
    }

    .collection-movie-actions,
    .collection-details-actions {
      grid-template-columns: 1fr;
    }

    .collection-details-primary,
    .collection-details-secondary {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .collections-hero,
    .collection-detail-hero,
    .collection-section-topline,
    .collection-seo-box,
    .collection-card,
    .collection-related-card,
    .collection-faq-card,
    .collection-movie-card-interactive,
    .collection-details-overlay,
    .collection-trailer-overlay,
    .collection-details-card,
    .collection-trailer-card {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
      translate: none !important;
      scale: 1 !important;
      filter: none !important;
    }
  }
`;
