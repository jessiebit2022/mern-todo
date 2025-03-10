import { Box, Typography, Container } from '@mui/material';
import TodoList from '../components/todos/TodoList';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name || 'User'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your tasks efficiently with our Todo App.
        </Typography>
        <TodoList />
      </Box>
    </Container>
  );
};

export default Home;
