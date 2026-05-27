import type { Metadata } from 'next';
import ImportDashboardClient from './ImportDashboardClient';

export const metadata: Metadata = {
  title: 'KinoLuma Import Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default function AdminImportPage() {
  return <ImportDashboardClient />;
}
