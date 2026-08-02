import { redirect } from "next/navigation";

import { currentMonth } from "../lib/calendar";

// 배포 시점의 월이 정적 페이지에 고정되지 않도록, 첫 진입마다 현재 월을 계산한다.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect(`/${currentMonth()}`);
}
