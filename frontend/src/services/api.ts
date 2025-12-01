/**
 * API Service for backend communication
 */

// Auth Backend API URL - Node.js/Express server runs on port 3001
const AUTH_API_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api';

// Turtle Backend API URL - Flask server runs on port 5000
const TURTLE_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'community' | 'admin';
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Get stored token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Store token in localStorage
export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Make authenticated API request to Auth Backend
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};

// Register new user
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();
  if (result.success && result.token) {
    setToken(result.token);
  }
  return result;
};

// Login
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  if (result.success && result.token) {
    setToken(result.token);
  }
  return result;
};

// Get current user
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiRequest('/auth/me');

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get user');
  }

  const result = await response.json();
  return result.user;
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
  }
};

// Google OAuth URL
export const getGoogleAuthUrl = (): string => {
  return `${AUTH_API_BASE_URL.replace('/api', '')}/api/auth/google`;
};

// Get invitation details by token
export interface InvitationDetails {
  success: boolean;
  invitation: {
    email: string;
    expires_at: string;
  };
}

export const getInvitationDetails = async (token: string): Promise<InvitationDetails> => {
  const response = await apiRequest(`/auth/invitation/${token}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get invitation details');
  }

  return await response.json();
};

// Promote user to admin (admin only)
export interface PromoteToAdminResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string;
    role: 'admin';
  };
}

export const promoteToAdmin = async (email: string): Promise<PromoteToAdminResponse> => {
  const response = await apiRequest('/admin/promote-to-admin', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user to admin');
  }

  return await response.json();
};

// --- Turtle Photo Upload & Matching API ---

export interface TurtleMatch {
  turtle_id: string;
  location: string;
  distance: number;
  file_path: string;
  filename: string;
}

export interface UploadPhotoResponse {
  success: boolean;
  request_id?: string;
  matches?: TurtleMatch[];
  uploaded_image_path?: string;
  message: string;
}

export interface ReviewQueueItem {
  request_id: string;
  uploaded_image: string;
  metadata: {
    finder?: string;
    email?: string;
    uploaded_at?: number;
  };
  candidates: Array<{
    rank: number;
    turtle_id: string;
    score: number;
    image_path: string;
  }>;
  status: string;
}

export interface ReviewQueueResponse {
  success: boolean;
  items: ReviewQueueItem[];
}

export interface ApproveReviewRequest {
  match_turtle_id?: string;
  new_location?: string;
}

export interface ApproveReviewResponse {
  success: boolean;
  message: string;
}

// Upload photo (Admin or Community)
export const uploadTurtlePhoto = async (
  file: File,
  role: 'admin' | 'community',
  email: string
): Promise<UploadPhotoResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('role', role);
  formData.append('email', email);

  const response = await fetch(`${TURTLE_API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return await response.json();
};

// Get review queue (Admin only)
export const getReviewQueue = async (): Promise<ReviewQueueResponse> => {
  const response = await fetch(`${TURTLE_API_BASE_URL}/review-queue`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load review queue');
  }

  return await response.json();
};

// Approve review item (Admin only)
export const approveReview = async (
  requestId: string,
  data: ApproveReviewRequest
): Promise<ApproveReviewResponse> => {
  const response = await fetch(`${TURTLE_API_BASE_URL}/review/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve review');
  }

  return await response.json();
};

// Get image URL helper
export const getImageUrl = (imagePath: string): string => {
  // Convert file path to API endpoint
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  // For local paths, encode them as query parameter
  const encodedPath = encodeURIComponent(imagePath);
  return `${TURTLE_API_BASE_URL.replace('/api', '')}/api/images?path=${encodedPath}`;
};
