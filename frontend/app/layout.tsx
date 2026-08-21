import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

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
    <html lang="vi" className={poppins.variable} suppressHydrationWarning>
      <body className="bg-[#f5f5f5] text-[#262626] antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: "240px" }}>
              <main className="flex-1 overflow-y-auto">
                <div className="min-h-full">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
