import React, { createContext, useContext, useEffect, useState } from "react";
import { JellyfinService, JellyfinSession } from "../services/jellyfin";

interface AuthContextType {
  session: JellyfinSession | null;
  isLoading: boolean;
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<JellyfinSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    JellyfinService.getStoredSession()
      .then((saved) => setSession(saved))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (serverUrl: string, username: string, password: string) => {
    const newSession = await JellyfinService.login(serverUrl, username, password);
    setSession(newSession);
  };

  const logout = async () => {
    await JellyfinService.clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
