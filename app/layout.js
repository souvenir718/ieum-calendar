import "./globals.css";

export const metadata = {
  title: "이음어린이집 캘린더",
  description: "이음어린이집 월별 당직표를 캘린더 형식으로 확인하는 웹앱",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
