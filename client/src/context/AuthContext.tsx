import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Configure axios defaults
axios.defaults.withCredentials = true;

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Check if token is expired
          const decoded = jwtDecode<{
            userId: string;
            name?: string;
            email?: string;
            exp: number;
          }>(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // Set auth header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Get user data from token
            setUser({
              id: decoded.userId,
              name: decoded.name || 'User', // Fallback if name not in token
              email: decoded.email || '',
            });
            setIsAuthenticated(true);
          }
        } catch (error) {
          void error; // Ignore unused variable warning
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const res = await axios.post<{
        token: string;
        user: User;
        message: string;
      }>('/api/auth/login', { email, password });
      
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setError(null);
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      await axios.post('/api/auth/register', { name, email, password });
      setError(null);
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        error,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
