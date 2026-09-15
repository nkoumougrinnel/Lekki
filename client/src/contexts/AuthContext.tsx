import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, getToken, setToken, usersApi } from "@/lib/api";
import { User } from "@/types/lekki";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  loading: boolean;
  login: (username: string) => Promise<void>;
  switchUser: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current user and all available users
  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const usersList = await usersApi.list().catch(() => []);
        if (!cancelled) setAllUsers(usersList);

        const token = getToken();
        if (token) {
          const me = await auth.me().catch(() => null);
          if (!cancelled && me) {
            setUser(me);
            return;
          }
        }

        // Default to Grinnel (persona from product document)
        const defaultUser = await auth.me().catch(() => null);
        if (!cancelled && defaultUser) {
          setUser(defaultUser);
          setToken(defaultUser.id);
        }
      } catch {
        // Safe fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string) => {
    setLoading(true);
    try {
      const res = await auth.login(username);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const switchUser = async (username: string) => {
    await login(username);
  };

  const logout = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        loading,
        login,
        switchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
