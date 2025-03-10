import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  completed: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});

// Add index for better query performance
todoSchema.index({ createdAt: -1 });

export const Todo = mongoose.model('Todo', todoSchema);
