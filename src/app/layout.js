import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata = {
  title: 'Sistema Choferes',
  description: 'Gestión de chequeos e incentivos de choferes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
