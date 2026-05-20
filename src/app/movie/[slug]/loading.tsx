export default function Loading() {
  return (
    <main className="kinoluma-loading-page">
      <style>{loadingStyles}</style>

      <div className="loading-ambient" />

      <section className="loading-shell" aria-label="Загрузка KinoLuma">
        <div className="loading-brand-row">
          <img src="/kinoluma-icon.png" alt="KinoLuma" className="loading-logo" />
          <div>
            <p>KinoLuma</p>
            <span>Каталог загружается</span>
          </div>
        </div>

        <div className="loading-hero-card">
          <div className="skeleton poster" />
          <div className="loading-copy">
            <div className="skeleton line line-lg" />
            <div className="skeleton line line-md" />
            <div className="skeleton line" />
            <div className="skeleton line line-sm" />
            <div className="loading-button-row">
              <div className="skeleton pill" />
              <div className="skeleton pill ghost" />
            </div>
          </div>
        </div>

        <div className="loading-row">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="loading-card">
              <div className="skeleton card-poster" />
              <div className="skeleton card-line" />
              <div className="skeleton card-line small" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const loadingStyles = `
  .kinoluma-loading-page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: #050505;
    color: #ffffff;
  }

  .loading-ambient {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.12), transparent 28%),
      radial-gradient(circle at 80% 16%, rgba(255,255,255,0.08), transparent 26%),
      linear-gradient(180deg, #0a0a0a 0%, #050505 48%, #000000 100%);
  }

  .loading-shell {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    padding: 26px 0 54px;
  }

  .loading-brand-row {
    min-height: 62px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .loading-logo {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    object-fit: cover;
    box-shadow: 0 0 38px rgba(255,255,255,0.14);
  }

  .loading-brand-row p {
    margin: 0;
    font-size: 20px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .loading-brand-row span {
    display: block;
    margin-top: 5px;
    color: #7e7e7e;
    font-size: 12px;
    font-weight: 900;
  }

  .loading-hero-card {
    margin-top: 20px;
    min-height: 420px;
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 22px;
    align-items: stretch;
    padding: 22px;
    border-radius: 34px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(145deg, rgba(26,26,26,0.88), rgba(6,6,6,0.95));
    box-shadow: 0 34px 90px rgba(0,0,0,0.52);
  }

  .loading-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
  }

  .skeleton {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    background: rgba(255,255,255,0.075);
  }

  .skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-110%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
    animation: shimmer 1.25s ease-in-out infinite;
  }

  .poster {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 26px;
  }

  .line {
    width: 72%;
    height: 18px;
  }

  .line-lg {
    width: 88%;
    height: 58px;
    border-radius: 20px;
  }

  .line-md {
    width: 56%;
    height: 24px;
  }

  .line-sm {
    width: 42%;
  }

  .loading-button-row {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .pill {
    width: 142px;
    height: 46px;
    border-radius: 16px;
    background: rgba(255,255,255,0.18);
  }

  .pill.ghost {
    background: rgba(255,255,255,0.075);
  }

  .loading-row {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
  }

  .loading-card {
    padding: 12px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.035);
  }

  .card-poster {
    aspect-ratio: 2 / 3;
    border-radius: 18px;
  }

  .card-line {
    height: 14px;
    margin-top: 12px;
  }

  .card-line.small {
    width: 62%;
    height: 12px;
    margin-top: 8px;
  }

  @keyframes shimmer {
    to {
      transform: translateX(110%);
    }
  }

  @media (max-width: 760px) {
    .loading-shell {
      width: min(100% - 24px, 1180px);
      padding-bottom: calc(104px + env(safe-area-inset-bottom));
    }

    .loading-hero-card {
      min-height: auto;
      grid-template-columns: 118px minmax(0, 1fr);
      gap: 14px;
      padding: 14px;
      border-radius: 26px;
    }

    .poster {
      border-radius: 20px;
    }

    .line-lg {
      height: 36px;
      width: 100%;
    }

    .line-md,
    .line,
    .line-sm {
      height: 14px;
      width: 100%;
    }

    .loading-button-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .pill {
      width: 100%;
      height: 38px;
      border-radius: 14px;
    }

    .loading-row {
      display: flex;
      overflow: hidden;
      gap: 12px;
    }

    .loading-card {
      flex: 0 0 148px;
    }
  }
`;
