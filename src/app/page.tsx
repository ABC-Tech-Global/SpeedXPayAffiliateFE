import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUser } from "@/lib/server-auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login" as Route);
  redirect("/dashboard" as Route);
}
