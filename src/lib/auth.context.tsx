import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { sdb } from "@/lib/supabase-unsafe";
import { useQueryClient } from "@tanstack/react-query";
import { DEMO_USER, disableDemo, isDemo } from "@/lib/demo";

export type UserRole = "parent" | "tutor" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: Record<string, any> | null;
  students: any[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadUser = useCallback(async (userId: string, email: string) => {
    // Always set a baseline user so the auth gate can proceed even if
    // profile/student_users reads fail (e.g. RLS/grant issues). Errors are
    // logged for diagnosis but never block sign-in.
    let role: UserRole = "parent";
    let profile: Record<string, any> | null = null;
    let students: any[] = [];

    try {
      const { data, error } = await sdb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) console.error("[auth] profile fetch error:", error);
      if (data) {
        profile = data;
        if (data.role) role = data.role as UserRole;
      }
    } catch (err) {
      console.error("[auth] profile fetch threw:", err);
    }

    try {
      const { data, error } = await sdb
        .from("student_users")
        .select("*, students(*)")
        .eq("user_id", userId);
      if (error) console.error("[auth] student_users fetch error:", error);
      students = (data || []).map((su: any) => su.students).filter(Boolean);
    } catch (err) {
      console.error("[auth] student_users fetch threw:", err);
    }

    setUser({ id: userId, email, role, profile, students });
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (isDemo()) {
          if (mounted) setUser(DEMO_USER);
          return;
        }
        const { data: { session } } = await sdb.auth.getSession();
        if (session?.user && mounted) {
          await loadUser(session.user.id, session.user.email || "");
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = sdb.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (!mounted) return;

        // CRITICAL: never `await` Supabase calls inside this callback —
        // supabase-js holds an internal auth lock here and awaiting other
        // Supabase calls deadlocks signInWithPassword. Defer with setTimeout.
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(() => {
            if (mounted) void loadUser(session.user.id, session.user.email || "");
          }, 0);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          queryClient.clear();
        } else if (event === "USER_UPDATED" && session?.user) {
          setTimeout(() => {
            if (mounted) void loadUser(session.user.id, session.user.email || "");
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser, queryClient]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    disableDemo();
    try { await sdb.auth.signOut(); } catch {}
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/auth";
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
