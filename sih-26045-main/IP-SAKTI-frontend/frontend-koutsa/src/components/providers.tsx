"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext, useEffect, useMemo } from "react";
import type { AuthUser } from "@/types";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/providers/language-provider";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, user?: AuthUser | null) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AppProviders");
  return value;
}

function setBrowserSession(token: string, user?: AuthUser | null) {
  localStorage.setItem("ip-sakti-token", token);
  if (user) localStorage.setItem("ip-sakti-user", JSON.stringify(user));
  document.cookie = `ip_sakti_session=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
}

function clearBrowserSession() {
  localStorage.removeItem("ip-sakti-token");
  localStorage.removeItem("ip-sakti-user");
  document.cookie = "ip_sakti_session=; path=/; max-age=0; SameSite=Lax";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
  }));
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("ip-sakti-token");
    const storedUser = localStorage.getItem("ip-sakti-user");
    setToken(storedToken);
    setUser(storedUser ? JSON.parse(storedUser) as AuthUser : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const onAuth = (event: Event) => {
      const detail = (event as CustomEvent<{ token: string; user?: AuthUser | null }>).detail;
      setToken(detail.token);
      setUser(detail.user ?? null);
    };
    const onExpired = () => {
      clearBrowserSession();
      setToken(null);
      setUser(null);
      window.location.href = "/auth/login";
    };
    window.addEventListener("ip-sakti-auth", onAuth);
    window.addEventListener("ip-sakti-auth-expired", onExpired);
    return () => {
      window.removeEventListener("ip-sakti-auth", onAuth);
      window.removeEventListener("ip-sakti-auth-expired", onExpired);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token),
    setSession(nextToken, nextUser) {
      setBrowserSession(nextToken, nextUser);
      setToken(nextToken);
      setUser(nextUser ?? null);
    },
    clearSession() {
      clearBrowserSession();
      setToken(null);
      setUser(null);
      queryClient.clear();
    }
  }), [isLoading, queryClient, token, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
        </LanguageProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

