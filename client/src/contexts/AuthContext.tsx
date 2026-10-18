import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, getToken, setToken, usersApi } from "@/lib/api";
import { User } from "@/types/lekki";

interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const token = getToken();
        if (!token) return;
        const me = await auth.me();
        if (!cancelled && me) setUser(me);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAllUsers([]);
      return;
    }

    let cancelled = false;
    usersApi
      .list()
      .then((usersList) => {
        if (!cancelled) setAllUsers(Array.isArray(usersList) ? usersList : []);
      })
      .catch(() => {
        if (!cancelled) setAllUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    const res = await auth.login(username, password);
    setUser(res.user);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await auth.register(payload);
    setUser(res.user);
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
        ready,
        login,
        register,
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
