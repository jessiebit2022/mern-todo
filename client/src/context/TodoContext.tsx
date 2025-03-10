import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TodoContextType {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  addTodo: (title: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearError: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

interface TodoProviderProps {
  children: ReactNode;
}

export const TodoProvider = ({ children }: TodoProviderProps) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, token } = useAuth();

  const clearError = () => setError(null);

  useEffect(() => {
    const fetchTodos = async () => {
      if (!isAuthenticated) {
        setTodos([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get('/api/todos');
        setTodos(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch todos');
        console.error('Error fetching todos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, [isAuthenticated, token]);

  const addTodo = async (title: string) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/todos', { title });
      setTodos(prevTodos => [res.data, ...prevTodos]);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add todo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      setLoading(true);
      const res = await axios.patch(`/api/todos/${id}`, updates);
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo._id === id ? { ...todo, ...res.data } : todo
        )
      );
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update todo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      setLoading(true);
      await axios.delete(`/api/todos/${id}`);
      setTodos(prevTodos => prevTodos.filter(todo => todo._id !== id));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete todo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        loading,
        error,
        addTodo,
        updateTodo,
        deleteTodo,
        clearError
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};
