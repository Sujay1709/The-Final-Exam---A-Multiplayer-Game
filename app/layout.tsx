import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Professor’s Last Exam | Multiplayer Math Escape Room",
  description:
    "An old grudge. Five locked rooms. A timed multiplayer math escape room for 2–8 players.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
