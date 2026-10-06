import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom Clone",
  description: "A clone of the Zoom web app, built with Next.js and FastAPI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
