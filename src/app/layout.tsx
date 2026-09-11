import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const displayFont = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: "PartyLens | 15 anos da Julia", description: "Um álbum compartilhado para cada momento especial." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}><body>{children}</body></html>;
}
