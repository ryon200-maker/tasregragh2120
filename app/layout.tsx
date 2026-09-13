import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "TasteGraph v4", description: "言葉で作品との関係を記録するTasteGraph" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
