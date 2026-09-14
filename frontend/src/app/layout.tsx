import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal Metrology Rule 6 Compliance Scanner | Statutory Packaging Audit",
  description:
    "Autonomous packaging compliance auditing under the Legal Metrology (Packaged Commodities) Rules, 2011. Powered by PaddleOCR and deterministic guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08090d] text-gray-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
