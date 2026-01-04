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
          if (user) {
            dispatch(setUser(user));
          } else {
            // Token is invalid or expired, remove it silently
            removeToken();
          }
        } catch (error) {
          // Only log unexpected errors (not authentication errors)
          console.error('Unexpected error during auth check:', error);
          removeToken();
        }
      }
    };

    checkAuth();
  }, [dispatch]);

  return <>{children}</>;
}

