import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { workspaces as workspacesApi, type Workspace } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVE_KEY = 'lekki_active_workspace';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await workspacesApi.list();
      setWorkspaces(list);
      // Garantir un workspace actif valide.
      setActiveWorkspaceId((prev) => {
        if (prev && list.some((w) => w.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setError('Impossible de charger les workspaces.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem(ACTIVE_KEY, activeWorkspaceId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeWorkspaceId]);

  const setActiveWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
  }, []);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        loading,
        error,
        setActiveWorkspace,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
