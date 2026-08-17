import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "Namvinscom Fantasy — FPL 2026/27",
  description:
    "Ứng dụng quản lý và phân tích đội Fantasy Premier League mùa 2026/27. Theo dõi đội hình, tối ưu transfer, đề xuất captain theo chiến thuật ổn định rank.",
  keywords: ["FPL", "Fantasy Premier League", "Namvinscom", "2026/27"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#060b12] text-slate-100 antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-[#060b12]">
              <div className="min-h-full">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
