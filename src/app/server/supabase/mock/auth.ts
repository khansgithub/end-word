export const MOCK_AUTH_COOKIE = "mock-supabase-uid";

export type MockUser = {
  id: string;
  is_anonymous: boolean;
};

export type MockSession = {
  user: MockUser;
};

function newAnonymousUser(): MockUser {
  return { id: crypto.randomUUID(), is_anonymous: true };
}

export function readUserIdFromCookieString(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${MOCK_AUTH_COOKIE}=`)) {
      return decodeURIComponent(part.slice(MOCK_AUTH_COOKIE.length + 1));
    }
  }
  return null;
}

export function readUserIdFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  return readUserIdFromCookieString(document.cookie);
}

export function setBrowserAuthCookie(userId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${MOCK_AUTH_COOKIE}=${encodeURIComponent(userId)}; path=/; SameSite=Lax`;
}

export function createMockAuthApi(getUserId: () => string | null, setUserId: (id: string) => void) {
  const buildSession = (userId: string): MockSession => ({
    user: { id: userId, is_anonymous: true },
  });

  return {
    getSession: async () => {
      const id = getUserId();
      if (!id) return { data: { session: null }, error: null };
      return { data: { session: buildSession(id) }, error: null };
    },
    getUser: async () => {
      const id = getUserId();
      if (!id) return { data: { user: null }, error: null };
      return { data: { user: buildSession(id).user }, error: null };
    },
    signInAnonymously: async () => {
      const user = newAnonymousUser();
      setUserId(user.id);
      const session = buildSession(user.id);
      return { data: { user, session }, error: null };
    },
  };
}
