import { Cormorant_Garamond, Outfit } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import ModalRoot from '@/components/modals/ModalRoot';
import ToastRoot from '@/components/ui/ToastRoot';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Aura — Tous les guérisseurs, un seul lieu de confiance',
  description:
    "La plateforme française des praticiens du bien-être énergétique. Magnétisme, Reiki, hypnose, chamanisme — trouvez un praticien vérifié près de chez vous.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${outfit.variable}`}>
      {/* suppressHydrationWarning: browser extensions (password managers,
          antivirus) inject attributes like bis_register/__processed_* onto
          <body> before React hydrates — this ignores those benign diffs. */}
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <ModalRoot />
          <ToastRoot />
        </Providers>
      </body>
    </html>
  );
}
