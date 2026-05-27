import type { Metadata } from "next";

import AdminAccessGuard from "./AdminAccessGuard";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccessGuard>{children}</AdminAccessGuard>;
}
