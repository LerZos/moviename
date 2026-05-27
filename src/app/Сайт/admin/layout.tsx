import AdminAccessGuard from './AdminAccessGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccessGuard>{children}</AdminAccessGuard>;
}
