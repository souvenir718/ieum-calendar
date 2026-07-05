import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";

export const metadata = {
  title: "이음어린이집 캘린더",
  description: "이음어린이집 월별 당직표를 캘린더 형식으로 확인하는 웹앱",
  applicationName: "이음어린이집",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff8ef",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
