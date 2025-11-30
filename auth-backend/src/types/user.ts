export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'community' | 'admin';
  google_id: string | null;
  created_at: string;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

