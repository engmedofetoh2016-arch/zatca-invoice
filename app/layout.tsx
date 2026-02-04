import type { Metadata } from "next";
import { Cairo, JetBrains_Mono } from "next/font/google";
import "./globals.css";


const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZATCA Invoice",
  description: "منصة فواتير احترافية متوافقة مع متطلبات الزكاة والضريبة والجمارك",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => { try { const stored = localStorage.getItem('theme'); const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; const theme = stored || (prefersDark ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; } catch (e) {} })();",
          }}
        />
      </head>
      <body
        className={`${cairo.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
