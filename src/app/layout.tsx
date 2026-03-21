import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peaklog — Journal de randonnée & aventure outdoor",
  description:
    "Planificateur IA, journal de sorties, statistiques et intégrations Strava pour vos aventures en montagne.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
      </body>
    </html>
  );
}
