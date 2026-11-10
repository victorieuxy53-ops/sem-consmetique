import '@/styles/main.css';
import '@/styles/admin.css';
import { fonts } from '@/lib/fonts';
import { boot } from '@/lib/server';
import { App } from '@/components/ui';
import { AdminLogin, AdminShell } from '@/components/admin/app';

export const viewport = { themeColor: '#1b2a5c' };
export async function generateMetadata() {
  const { settings: s } = await boot();
  return { title: `Administration | ${s.site_name}`, robots: { index: false, follow: false }, icons: { icon: '/assets/img/icon.svg' } };
}

export default async function AdminLayout({ children }) {
  const { settings, user } = await boot();
  const admin = user?.role === 'admin';
  return (
    <html lang="fr" className={fonts}>
      <body className="admin-body">
        <App settings={settings} user={user}>{admin ? <AdminShell>{children}</AdminShell> : <AdminLogin user={user} />}</App>
      </body>
    </html>
  );
}
