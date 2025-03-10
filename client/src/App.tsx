import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import { TodoProvider } from './context/TodoContext'
import Navbar from './components/layout/Navbar'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Home from './pages/Home'
import ProtectedRoute from './components/routing/ProtectedRoute'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TodoProvider>
          <Router>
            <Navbar />
            <div style={{ padding: '20px' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Home />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </TodoProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
