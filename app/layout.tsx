import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Aim · Your market brief",
  description:
    "Your weekly market intelligence, shaped around what matters to you.",
  icons: { icon: "/assets/aim-favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/assets/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
