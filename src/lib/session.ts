// Odczytuje sesję i ciasteczko stanu paska bocznego raz na żądanie po stronie serwera

import { cache } from "react";
import { auth } from "@/lib/graphql/auth";
import { cookies } from "next/headers";

export const getSession = cache(async () => {
  return auth();
});

export const getSidebarCookie = cache(async () => {
  const jar = await cookies();
  return jar.get("rn-sidebar")?.value === "1";
});
