import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { ClientProviders } from '@/components/client-providers';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const siteUrl = `${protocol}://${host}`;
  return {
    metadataBase: new URL(siteUrl),
    title: 'Evidentia — Legal Reasoning',
    description: 'Structured legal reasoning for legal professionals. Analyse facts, map law, evaluate risks and strategy.',
    icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
    openGraph: {
      title: 'Evidentia — Legal Reasoning',
      description: 'Structured legal reasoning for legal professionals. Analyse facts, map law, evaluate risks and strategy.',
      images: ['/og-image.png'],
      type: 'website',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className={inter.className}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
