import { redirect } from "next/navigation";

import { currentMonth } from "../lib/calendar";

export default function Home() {
  redirect(`/${currentMonth()}`);
}
