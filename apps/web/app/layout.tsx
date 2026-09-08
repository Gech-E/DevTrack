import type { Metadata } from 'next';
import { APP_NAME } from '@devtrack/shared';

import { Providers } from '@/components/providers';

import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Personal developer learning and task management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
