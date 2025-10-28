import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { type UserRole } from '../types/User';

interface UserContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [role, setRole] = useState<UserRole>('community');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return React.createElement(
    UserContext.Provider,
    { value: { role, setRole, isLoggedIn, setIsLoggedIn } },
    children
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
