export default function manifest() {
  return {
    name: "이음어린이집",
    short_name: "이음",
    description: "이음어린이집 월별 당직표를 캘린더 형식으로 확인하는 웹앱",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ef",
    theme_color: "#fff8ef",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
