import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Todo } from './models/todo.js';
import { User } from './models/user.js';
import jwt from 'jsonwebtoken';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Print the MongoDB connection string (with password masked)
const maskedMongoURI = process.env.MONGODB_URI 
  ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':******@') 
  : 'MongoDB URI not found';
console.log('Using MongoDB URI:', maskedMongoURI);

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Set up static file serving for the client application
app.use(express.static(path.join(__dirname, '/client/dist')));

// In-memory storage as fallback when MongoDB is not available
const inMemoryDb = {
  todos: [],
  users: []
};
// Force MongoDB usage - don't use in-memory database
let useInMemoryDb = false;

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Function to check MongoDB connection status
const checkMongoDBConnection = async () => {
  if (!useInMemoryDb) {
    try {
      // Get MongoDB connection state
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      console.log(`MongoDB connection state: ${states[state] || state}`);

      if (state === 1) {
        // List available databases
        const admin = mongoose.connection.db.admin();
        const databases = await admin.listDatabases();
        console.log('Available MongoDB databases:');
        databases.databases.forEach(db => {
          console.log(`- ${db.name}`);
        });

        // Count documents in collections
        try {
          const todoCount = await Todo.countDocuments();
          const userCount = await User.countDocuments();
          console.log(`Collections stats: Todos (${todoCount}), Users (${userCount})`);
        } catch (err) {
          console.log('Error counting documents:', err.message);
        }
      }
    } catch (err) {
      console.error('Error checking MongoDB connection:', err.message);
    }
  }
};

// MongoDB Connection with better options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,  // Increased timeout
  socketTimeoutMS: 45000,
  retryWrites: true,
  connectTimeoutMS: 30000,
  maxPoolSize: 10
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  // Ensure we're not using in-memory DB
  useInMemoryDb = false;
  // Check MongoDB connection details
  setTimeout(checkMongoDBConnection, 1000);
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  console.log('Attempting to connect to MongoDB with alternate options...');

  // Try again with simplified options
  mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => {
      console.log('Connected to MongoDB with simplified options');
      useInMemoryDb = false;
      // Check MongoDB connection details
      setTimeout(checkMongoDBConnection, 1000);
    })
    .catch((innerError) => {
      console.error('MongoDB connection failed with simplified options:', innerError);
      console.log('WARNING: We should be using MongoDB, but connection failed.');
      console.log('Will keep trying to use MongoDB for all operations.');
      // Force MongoDB usage even if connection initially fails
      useInMemoryDb = false;
    });
});

// Add unhandled promise rejection handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// Authentication Routes
app.post('/api/auth/register', async (req, res, next) => {
  try {
    console.log('Registration request received:', req.body);
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    if (useInMemoryDb) {
      console.log('Using in-memory database for registration');
      // Check if user already exists in memory
      const existingUser = inMemoryDb.users.find(user => user.email === email);
      if (existingUser) {
        console.log('User already exists in memory');
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Create new user in memory
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password, // Note: In a real app, you'd still hash this
      };
      
      inMemoryDb.users.push(newUser);
      console.log('User registered successfully in memory');
      return res.status(201).json({ message: 'User registered successfully' });
    }
    
    // MongoDB flow
    console.log('Using MongoDB for registration');
    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('User already exists in MongoDB');
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Create new user
      const user = new User({
        name,
        email,
        password
      });
      
      console.log('About to save user to MongoDB:', {
        name: user.name,
        email: user.email,
        _id: user._id
      });
      
      try {
        await user.save();
        console.log('User saved successfully to MongoDB with ID:', user._id);
        res.status(201).json({ message: 'User registered successfully' });
      } catch (saveError) {
        console.error('Error saving user to MongoDB:', saveError);
        if (saveError.name === 'ValidationError') {
          return res.status(400).json({ 
            message: 'Validation Error', 
            errors: Object.values(saveError.errors).map(e => e.message)
          });
        }
        throw saveError;
      }
    } catch (findError) {
      console.error('Error finding existing user:', findError);
      throw findError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    if (useInMemoryDb) {
      // Find user in memory
      const user = inMemoryDb.users.find(user => user.email === email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Create token
      const token = jwt.sign(
        { userId: user.id }, 
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
    }
    
    // MongoDB flow
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user._id }, 
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Todo Routes
app.get('/api/todos', async (req, res, next) => {
  try {
    console.log('Get todos request received');
    
    if (useInMemoryDb) {
      console.log('Using in-memory database for get todos (should not happen)');
      return res.json(inMemoryDb.todos);
    }
    
    console.log('Using MongoDB for get todos');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    try {
      const count = await Todo.countDocuments();
      console.log(`Found ${count} todos in MongoDB`);
      
      const todos = await Todo.find().sort({ createdAt: -1 });
      console.log('Todos retrieved from MongoDB:', todos.length);
      console.log('First few todos:', todos.slice(0, 2));
      
      res.json(todos);
    } catch (findError) {
      console.error('Error finding todos in MongoDB:', findError);
      throw findError;
    }
  } catch (error) {
    console.error('Get todos error:', error);
    next(error);
  }
});

app.post('/api/todos', async (req, res, next) => {
  try {
    console.log('Todo creation request received:', req.body);
    
    if (!req.body.title || typeof req.body.title !== 'string') {
      console.log('Invalid todo title:', req.body.title);
      return res.status(400).json({ message: 'Title is required and must be a string' });
    }

    if (useInMemoryDb) {
      console.log('Using in-memory DB for todo creation (should not happen)');
      const newTodo = {
        _id: Date.now().toString(),
        title: req.body.title.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      inMemoryDb.todos.unshift(newTodo);
      return res.status(201).json(newTodo);
    }

    console.log('Using MongoDB for todo creation');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    const todo = new Todo({
      title: req.body.title.trim(),
      completed: false
    });
    
    console.log('Todo document created:', todo);
    try {
      const newTodo = await todo.save();
      console.log('Todo saved successfully to MongoDB:', newTodo);
      res.status(201).json(newTodo);
    } catch (saveError) {
      console.error('Error saving todo to MongoDB:', saveError);
      throw saveError;
    }
  } catch (error) {
    console.error('Todo creation error:', error);
    next(error);
  }
});

app.patch('/api/todos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (useInMemoryDb) {
      const todoIndex = inMemoryDb.todos.findIndex(todo => todo._id === id);
      if (todoIndex === -1) {
        return res.status(404).json({ message: 'Todo not found' });
      }
      
      const todo = inMemoryDb.todos[todoIndex];
      
      if (req.body.title !== undefined) {
        if (typeof req.body.title !== 'string') {
          return res.status(400).json({ message: 'Title must be a string' });
        }
        todo.title = req.body.title.trim();
      }
      
      if (req.body.completed !== undefined) {
        if (typeof req.body.completed !== 'boolean') {
          return res.status(400).json({ message: 'Completed must be a boolean' });
        }
        todo.completed = req.body.completed;
      }
      
      todo.updatedAt = new Date().toISOString();
      
      return res.json(todo);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid todo ID' });
    }

    const todo = await Todo.findById(id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string') {
        return res.status(400).json({ message: 'Title must be a string' });
      }
      todo.title = req.body.title.trim();
    }
    if (req.body.completed !== undefined) {
      if (typeof req.body.completed !== 'boolean') {
        return res.status(400).json({ message: 'Completed must be a boolean' });
      }
      todo.completed = req.body.completed;
    }
    
    const updatedTodo = await todo.save();
    res.json(updatedTodo);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/todos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (useInMemoryDb) {
      const initialLength = inMemoryDb.todos.length;
      inMemoryDb.todos = inMemoryDb.todos.filter(todo => todo._id !== id);
      
      if (inMemoryDb.todos.length === initialLength) {
        return res.status(404).json({ message: 'Todo not found' });
      }
      
      return res.json({ message: 'Todo deleted successfully' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid todo ID' });
    }

    const todo = await Todo.findById(id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    
    await todo.deleteOne();
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  // Check MongoDB connection state
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Get MongoDB database info if connected
  let dbInfo = null;
  if (dbState === 1) {
    try {
      dbInfo = {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      };
    } catch (err) {
      console.error('Error getting MongoDB info:', err);
    }
  }

  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    database: useInMemoryDb ? 'in-memory' : 'mongodb',
    mongodb: {
      state: dbStates[dbState] || `unknown (${dbState})`,
      connected: dbState === 1,
      info: dbInfo
    }
  });
});

// Debug endpoint to check MongoDB connection and useInMemoryDb flag
app.get('/api/debug', async (req, res) => {
  try {
    // Check MongoDB connection state
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Count collections
    let collections = [];
    let todoCount = 0;
    let userCount = 0;

    if (connectionState === 1) {
      try {
        collections = await mongoose.connection.db.listCollections().toArray();
        todoCount = await Todo.countDocuments();
        userCount = await User.countDocuments();
      } catch (err) {
        console.error('Error fetching collections:', err);
      }
    }

    res.json({
      mongodbState: {
        connectionState: states[connectionState] || connectionState,
        isConnected: connectionState === 1,
        databaseName: mongoose.connection.name || 'unknown',
      },
      useInMemoryDb: useInMemoryDb,
      collections: collections.map(c => c.name),
      counts: {
        todos: todoCount,
        users: userCount,
        inMemoryTodos: inMemoryDb.todos.length,
        inMemoryUsers: inMemoryDb.users.length
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        mongoUri: process.env.MONGODB_URI ? 'Set (masked)' : 'Not set'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve the client app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/client/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  });
  
  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: messages,
      details: process.env.NODE_ENV === 'development' ? messages : undefined
    });
  }
  
  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate field value entered',
      field: Object.keys(err.keyValue)[0],
      details: process.env.NODE_ENV === 'development' ? err.keyValue : undefined
    });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Verify database connection after server starts
  mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
  });
  
  // Check MongoDB connectivity
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB is already connected');
    setTimeout(checkMongoDBConnection, 500);
  }
}).on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
