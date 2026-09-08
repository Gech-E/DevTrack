import type { Metadata } from 'next';

import { APP_NAME } from '@devtrack/shared';

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
      <body>{children}</body>
    </html>
  );
}
