// Podpina obsługę żądań NextAuth pod ścieżkę uwierzytelniania

import { handlers } from "@/lib/graphql/auth";

export const { GET, POST } = handlers;
