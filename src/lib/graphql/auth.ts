// Konfiguracja NextAuth oraz logowanie i weryfikacja drugiego składnika po stronie API GraphQL

import NextAuth, {
  type DefaultSession,
  type Session,
  type User,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      shortId?: number;
      role?: string;
      companyId?: string | null;
      twoFactorEnabled?: boolean;
      assignedAgentId?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    accessToken?: string;
    shortId?: number;
    role?: string;
    companyId?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorRequired?: boolean;
    pendingToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    shortId?: number;
    role?: string;
    companyId?: string | null;
    twoFactorEnabled?: boolean;
    assignedAgentId?: string | null;
  }
}

function readAssignedAgentId(accessToken?: string | null): string | null {
  const segment = accessToken?.split(".")[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    const value = (payload as { assignedAgentId?: unknown } | null)?.assignedAgentId;
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      twoFactorRequired
      pendingToken
      user {
        id
        shortId
        name
        email
        role
        companyId
        twoFactorEnabled
      }
    }
  }
`;

const VERIFY_2FA_MUTATION = `
  mutation VerifyTwoFactorLogin($pendingToken: String!, $code: String!, $isBackupCode: Boolean) {
    verifyTwoFactorLogin(pendingToken: $pendingToken, code: $code, isBackupCode: $isBackupCode) {
      accessToken
      twoFactorRequired
      user {
        id
        shortId
        name
        email
        role
        companyId
        twoFactorEnabled
      }
    }
  }
`;

interface GqlUser {
  id: string;
  shortId: number;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  twoFactorEnabled: boolean;
}

interface LoginPayload {
  data?: {
    login?: {
      accessToken: string | null;
      twoFactorRequired: boolean;
      pendingToken: string | null;
      user: GqlUser;
    };
  };
  errors?: Array<{ message: string; extensions?: { userId?: string } }>;
}

interface Verify2FAPayload {
  data?: {
    verifyTwoFactorLogin?: {
      accessToken: string;
      twoFactorRequired: boolean;
      user: GqlUser;
    };
  };
  errors?: Array<{ message: string }>;
}

async function gqlFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(process.env.GRAPHQL_INTERNAL_URL ?? "http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export async function gqlLogin(
  email: string,
  password: string,
): Promise<LoginPayload> {
  return gqlFetch(LOGIN_MUTATION, { email, password });
}

const CHECK_EMAIL_QUERY = `
  query CheckEmail($email: String!) {
    checkEmail(email: $email)
  }
`;

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const res: { data?: { checkEmail?: boolean } } = await gqlFetch(CHECK_EMAIL_QUERY, { email });
    return res.data?.checkEmail ?? false;
  } catch {
    return false;
  }
}

export async function gqlVerify2FA(pendingToken: string, code: string, isBackupCode?: boolean): Promise<Verify2FAPayload> {
  return gqlFetch(VERIFY_2FA_MUTATION, { pendingToken, code, isBackupCode: isBackupCode ?? false });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        verifiedToken: { label: "Verified token", type: "text" },
        userId: { label: "User ID", type: "text" },
        userName: { label: "User name", type: "text" },
        userEmail: { label: "User email", type: "email" },
        userRole: { label: "User role", type: "text" },
        userShortId: { label: "User short ID", type: "text" },
        userCompanyId: { label: "User company ID", type: "text" },
        userTwoFactorEnabled: { label: "2FA enabled", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.verifiedToken) {
          return {
            id: credentials.userId as string,
            name: credentials.userName as string,
            email: credentials.userEmail as string,
            accessToken: credentials.verifiedToken as string,
            role: credentials.userRole as string,
            shortId: Number(credentials.userShortId),
            companyId: (credentials.userCompanyId as string) || null,
            twoFactorEnabled: credentials.userTwoFactorEnabled === "true",
          };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.accessToken = user.accessToken ?? "";
        token.role = user.role ?? "AGENT";
        token.shortId = user.shortId;
        token.companyId = user.companyId ?? null;
        token.twoFactorEnabled = user.twoFactorEnabled ?? false;
        token.assignedAgentId = readAssignedAgentId(token.accessToken);
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "AGENT";
        session.user.shortId = token.shortId;
        session.user.companyId = token.companyId ?? null;
        session.user.twoFactorEnabled = token.twoFactorEnabled ?? false;
        session.user.assignedAgentId = token.assignedAgentId ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
});
