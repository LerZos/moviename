'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';

export default function AdminProfileButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdmin() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      const response = await fetch('/api/admin/me', {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (isMounted) {
        setIsAdmin(response.ok);
      }
    }

    void checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin/import"
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/20 backdrop-blur transition hover:bg-white hover:text-black"
    >
      Открыть админку KinoLuma
    </Link>
  );
}
