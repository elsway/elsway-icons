import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, ALLOWED_EMAIL_DOMAIN, SUPABASE_CONFIGURED } from "./supabase";

type AuthState = {
  ready: boolean;
  user: User | null;
  session: Session | null;
  isAllowed: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  configured: boolean;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  user: null,
  session: null,
  isAllowed: false,
  signIn: async () => {},
  signOut: async () => {},
  configured: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    if (!supabase) {
      alert("Supabase is not configured. See CMS setup instructions.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin`,
        queryParams: {
          hd: ALLOWED_EMAIL_DOMAIN, // Google Workspace hosted-domain hint
          prompt: "select_account",
        },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const user = session?.user ?? null;
  const email = user?.email?.toLowerCase() ?? "";
  const isAllowed = email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        session,
        isAllowed,
        signIn,
        signOut,
        configured: SUPABASE_CONFIGURED,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
