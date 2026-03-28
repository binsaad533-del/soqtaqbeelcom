import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    loading: true,
  });

  const fetchUserData = useCallback(async (user: User) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.rpc("get_user_role", { _user_id: user.id }),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      ]);

      setState((prev) => ({
        ...prev,
        user,
        role: roleRes.data as AppRole | null,
        profile: profileRes.data,
        loading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, user, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({ ...prev, session }));
        if (session?.user) {
          // defer to avoid deadlock
          setTimeout(() => fetchUserData(session.user), 0);
          // Update last_activity + log session ONLY on sign-in (not every state change)
          if (event === "SIGNED_IN") {
            // Batch both writes into one promise to reduce round-trips
            Promise.all([
              supabase
                .from("profiles")
                .update({ last_activity: new Date().toISOString() })
                .eq("user_id", session.user.id),
              supabase
                .from("session_logs" as any)
                .insert({
                  user_id: session.user.id,
                  event_type: "sign_in",
                  user_agent: navigator.userAgent,
                  device_info: /Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
                }),
            ]).catch(() => {});
          }
        } else {
          setState({ user: null, session: null, role: null, profile: null, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({ ...prev, session }));
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone: phone || "" },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => state.role === role;
  const isOwner = () => hasRole("platform_owner");
  const isSupervisor = () => hasRole("supervisor");
  const isCustomer = () => hasRole("customer");

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    hasRole,
    isOwner,
    isSupervisor,
    isCustomer,
  };
}
