'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

type GuardState = 'loading' | 'allowed' | 'denied';

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export default function AdminAccessGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    let isMounted = true;
    const originalFetch = window.fetch.bind(window);

    async function checkAdmin() {
      const token = await getAccessToken();

      if (!token) {
        if (isMounted) setState('denied');
        return;
      }

      window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.startsWith('/api/admin/') || url.includes('/api/admin/')) {
          const headers = new Headers(init.headers || {});

          if (!headers.has('authorization')) {
            const freshToken = await getAccessToken();

            if (freshToken) {
              headers.set('authorization', `Bearer ${freshToken}`);
            }
          }

          return originalFetch(input, {
            ...init,
            headers,
          });
        }

        return originalFetch(input, init);
      };

      const response = await originalFetch('/api/admin/me', {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!isMounted) {
        return;
      }

      setState(response.ok ? 'allowed' : 'denied');
    }

    void checkAdmin();

    return () => {
      isMounted = false;
      window.fetch = originalFetch;
    };
  }, []);

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/45">KinoLuma Admin</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Проверяю доступ…</h1>
          <p className="mt-3 text-sm text-white/55">Если ты админ, страница откроется автоматически.</p>
        </div>
      </main>
    );
  }

  if (state === 'denied') {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/45">KinoLuma Admin</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Доступ закрыт</h1>
          <p className="mt-3 text-sm text-white/55">
            Войди в профиль под админским email и открой страницу снова.
          </p>
          <Link
            href="/profile"
            className="mt-5 inline-flex rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-white/85"
          >
            Перейти в профиль
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
