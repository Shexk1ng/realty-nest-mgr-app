// Klient Apollo z tokenem sesji, kierowany na proxy GraphQL i wylogowujący po wygaśnięciu sesji

import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { getSession } from "next-auth/react";

import { localeFromPathname, localeHref } from "@/lib/i18n-routing";

type SessionWithToken = {
  accessToken?: string;
};

function redirectToLoginSessionExpired() {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  if (currentPath.includes("/login") || currentPath.includes("/auth-error")) return;
  const locale = localeFromPathname(currentPath);
  const login = localeHref(locale, "/login");
  window.location.assign(`${login}?error=session_expired`);
}

const authLink = new SetContextLink(async (prevContext) => {
  const session = (await getSession()) as SessionWithToken | null;
  const accessToken = session?.accessToken;

  return {
    headers: {
      ...(prevContext.headers as Record<string, string> | undefined ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const gqlError of error.errors) {
      const code = gqlError.extensions?.["code"];
      if (code === "UNAUTHENTICATED") {
        getSession().then((session) => {
          const s = session as SessionWithToken | null;
          if (!s?.accessToken) {
            redirectToLoginSessionExpired();
          }
        });
        return;
      }
    }
  }
  console.error("[Apollo error]", error);
});

const httpLink = new HttpLink({ uri: "/api/graphql" });

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
