import { AuthProvider } from "@/lib/auth-context";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finone Search System",
  description: "Advanced search and user management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.className} bg-background text-foreground antialiased selection:bg-indigo-500/30`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
