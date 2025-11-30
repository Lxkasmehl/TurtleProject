import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setUser } from '../store/slices/userSlice';
import { getToken, getCurrentUser, removeToken } from '../services/api';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Component that checks for existing authentication token on app startup
 * and restores user session if valid
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const user = await getCurrentUser();
          dispatch(setUser(user));
        } catch (error) {
          // Token is invalid or expired, remove it
          console.error('Failed to restore session:', error);
          removeToken();
        }
      }
    };

    checkAuth();
  }, [dispatch]);

  return <>{children}</>;
}

