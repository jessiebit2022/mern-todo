import { useState } from 'react';
import { 
  List, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TodoItem from './TodoItem';
import { useTodo } from '../../context/TodoContext';

const TodoList = () => {
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { todos, loading, error, addTodo, clearError } = useTodo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTodo.trim()) return;
    
    try {
      setIsAdding(true);
      await addTodo(newTodo.trim());
      setNewTodo('');
      if (error) clearError();
    } catch (err) {
      // Error is handled in the todo context
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        width: '100%', 
        maxWidth: 600, 
        mx: 'auto',
        borderRadius: 2,
        mb: 4
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        My Todo List
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3, display: 'flex' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Add a new todo..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          disabled={isAdding}
          size="small"
          sx={{ mr: 1 }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={!newTodo.trim() || isAdding}
          startIcon={isAdding ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
        >
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}
      
      <Divider sx={{ mb: 2 }} />
      
      {loading && !isAdding ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : todos.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ my: 4 }}>
          No todos yet. Add one above!
        </Typography>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {todos.map((todo) => (
            <TodoItem
              key={todo._id}
              id={todo._id}
              title={todo.title}
              completed={todo.completed}
              createdAt={todo.createdAt}
            />
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TodoList;
