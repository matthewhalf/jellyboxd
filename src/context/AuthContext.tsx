import React, { createContext, useContext, useEffect, useState } from "react";
import { JellyfinService, JellyfinSession, SavedServer } from "../services/jellyfin";

interface AuthContextType {
  session: JellyfinSession | null;
  isLoading: boolean;
  /** Remembered logins (this one included, once authenticated), most recently used first. */
  savedServers: SavedServer[];
  /** `name` is an optional custom label for the saved server. */
  login: (serverUrl: string, username: string, password: string, name?: string) => Promise<void>;
  /** Switches the active session to an already-saved server, instantly (reuses its stored token). */
  switchServer: (server: SavedServer) => Promise<void>;
  /** Forgets a saved server; if it's the active one, this also logs out. */
  forgetServer: (id: string) => Promise<void>;
  /** Sets a saved server's custom name; a blank name goes back to the default label. */
  renameServer: (id: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  savedServers: [],
  login: async () => {},
  switchServer: async () => {},
  forgetServer: async () => {},
  renameServer: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<JellyfinSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedServers, setSavedServers] = useState<SavedServer[]>([]);

  useEffect(() => {
    Promise.all([JellyfinService.getStoredSession(), JellyfinService.getSavedServers()])
      .then(([saved, servers]) => {
        setSession(saved);
        setSavedServers(servers);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (serverUrl: string, username: string, password: string, name?: string) => {
    const newSession = await JellyfinService.login(serverUrl, username, password, name);
    setSession(newSession);
    setSavedServers(await JellyfinService.getSavedServers());
  };

  const switchServer = async (server: SavedServer) => {
    const newSession = await JellyfinService.switchToSavedServer(server);
    setSession(newSession);
    // Keep the saved list "most recently used first"
    setSavedServers(await JellyfinService.upsertSavedServer(newSession));
  };

  const forgetServer = async (id: string) => {
    const remaining = await JellyfinService.removeSavedServer(id);
    setSavedServers(remaining);
    if (session && savedServerMatches(session, id)) {
      await JellyfinService.clearSession();
      setSession(null);
    }
  };

  const renameServer = async (id: string, name: string) => {
    setSavedServers(await JellyfinService.renameSavedServer(id, name));
  };

  const logout = async () => {
    await JellyfinService.clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, isLoading, savedServers, login, switchServer, forgetServer, renameServer, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function savedServerMatches(session: JellyfinSession, id: string): boolean {
  return `${session.serverUrl}::${session.userId}` === id;
}

export const useAuth = () => useContext(AuthContext);
