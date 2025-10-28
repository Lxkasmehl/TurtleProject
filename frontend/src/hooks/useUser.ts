import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setRole, setIsLoggedIn, login, logout } from '../store/slices/userSlice';
import { type UserRole } from '../types/User';

export function useUser() {
  const dispatch = useAppDispatch();
  const { role, isLoggedIn } = useAppSelector((state) => state.user);

  return {
    role,
    isLoggedIn,
    setRole: (newRole: UserRole) => dispatch(setRole(newRole)),
    setIsLoggedIn: (loggedIn: boolean) => dispatch(setIsLoggedIn(loggedIn)),
    login: (userRole: UserRole) => dispatch(login(userRole)),
    logout: () => dispatch(logout()),
  };
}
