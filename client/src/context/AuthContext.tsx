import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AuthUser, LoginPayload, ChangePasswordPayload } from "../types/index.js";
import { loginApi, logoutApi, getMeApi, changePasswordApi, getAuthToken } from "../api.js";

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getAuthToken()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function rehydrateSession() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await getMeApi();
        if (isMounted && res.data?.user) {
          setUser(res.data.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    rehydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginApi(payload);
      setUser(res.data.user);
    } catch (err: any) {
      const msg = err.message || "Invalid email address or password.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logoutApi();
    } catch {
      // Session cleanup on client even if server call fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await changePasswordApi(payload);
      setUser(res.data.user);
    } catch (err: any) {
      const msg = err.message || "Failed to update password.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      error,
      login,
      logout,
      changePassword,
      clearError,
    }),
    [user, isLoading, error, login, logout, changePassword, clearError]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
