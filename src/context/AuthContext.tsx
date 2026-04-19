import React, { createContext, useContext } from 'react';

type AuthContextValue = {
  authUsername: string | null;
  authDisplayName: string | null;
  groups: string[];
  isAdmin: boolean;
  onLogout: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  authUsername: null,
  authDisplayName: null,
  groups: [],
  isAdmin: false,
  onLogout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = AuthContext.Provider;
