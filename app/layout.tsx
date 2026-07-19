import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aaj Kiski Bari? - Flat Chore Manager",
  description: "Who's got the chore today? Manage your flat chores, presence status, and vote on updates in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased text-zinc-800`}
    >
      <body className="min-h-full flex flex-col surface-table">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
