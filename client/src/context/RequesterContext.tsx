import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { RequesterUser } from "../types/index.js";
import { fetchRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_active_requester";

export interface RequesterContextType {
  currentRequester: RequesterUser | null;
  setCurrentRequester: (user: RequesterUser | null) => void;
  requesters: RequesterUser[];
  isLoading: boolean;
  error: string | null;
  isSwitchModalOpen: boolean;
  openSwitchModal: () => void;
  closeSwitchModal: () => void;
  refreshRequesters: () => Promise<void>;
  selectRequester: (user: RequesterUser) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: React.ReactNode }) {
  const [currentRequester, setCurrentRequester] = useState<RequesterUser | null>(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse failure
    }
    return null;
  });

  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);

  const refreshRequesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeList = await fetchRequesters();
      setRequesters(activeList);

      // Stale / Deactivated Purge Check:
      // If a tentative user exists in state, check if they are in the active users list
      if (currentRequester) {
        const matchingActive = activeList.find(
          (u) => u.id === currentRequester.id && u.isActive === true
        );
        if (!matchingActive) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          setCurrentRequester(null);
        } else {
          // Update in case name or details changed
          setCurrentRequester(matchingActive);
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(matchingActive));
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load active requesters");
      // Note: Do not purge sessionStorage on transient network/server failure
    } finally {
      setIsLoading(false);
    }
  }, [currentRequester]);

  useEffect(() => {
    refreshRequesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRequester = useCallback((user: RequesterUser) => {
    setCurrentRequester(user);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setIsSwitchModalOpen(false);
  }, []);

  const clearRequester = useCallback(() => {
    setCurrentRequester(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
    setIsSwitchModalOpen(false);
  }, []);

  const openSwitchModal = useCallback(() => {
    setIsSwitchModalOpen(true);
  }, []);

  const closeSwitchModal = useCallback(() => {
    setIsSwitchModalOpen(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      currentRequester,
      setCurrentRequester,
      requesters,
      isLoading,
      error,
      isSwitchModalOpen,
      openSwitchModal,
      closeSwitchModal,
      refreshRequesters,
      selectRequester,
      clearRequester,
    }),
    [
      currentRequester,
      requesters,
      isLoading,
      error,
      isSwitchModalOpen,
      openSwitchModal,
      closeSwitchModal,
      refreshRequesters,
      selectRequester,
      clearRequester,
    ]
  );

  return (
    <RequesterContext.Provider value={contextValue}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
