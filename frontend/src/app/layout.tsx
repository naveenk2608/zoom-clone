import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { CurrentUserProvider } from "@/components/layout/CurrentUserProvider";
import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

// Inter is the closest free match to Zoom's font. It's exposed as a CSS
// variable, which globals.css puts first in Tailwind's font-sans stack.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Zoom Clone",
  description: "A clone of the Zoom web app, built with Next.js and FastAPI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <ToastProvider>
          <CurrentUserProvider>{children}</CurrentUserProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
