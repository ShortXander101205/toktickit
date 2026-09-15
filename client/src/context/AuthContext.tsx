import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AuthUser, LoginPayload, ChangePasswordPayload } from "../types/index.js";
import { loginApi, logoutApi, getMeApi, changePasswordApi, setAuthToken } from "../api.js";

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<AuthUser>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMeApi();
      setUser(me);
    } catch {
      setUser(null);
      setAuthToken(null);
    }
  }, []);

  // Initial session restoration on app launch
  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const me = await getMeApi();
        if (mounted) {
          setUser(me);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loginApi(payload);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const msg = err?.response?.error?.message || err?.message || "Invalid email address or password.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch {
      // Ignore logout network errors and clean local state
    } finally {
      setUser(null);
      setAuthToken(null);
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await changePasswordApi(payload);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const msg = err?.response?.error?.message || err?.message || "Failed to update password.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login,
      logout,
      changePassword,
      refreshUser,
      clearError,
    }),
    [user, isLoading, error, login, logout, changePassword, refreshUser, clearError]
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
