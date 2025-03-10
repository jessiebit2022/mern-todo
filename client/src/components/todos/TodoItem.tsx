import { useState } from 'react';
import { 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Checkbox, 
  IconButton, 
  TextField,
  ListItemButton,
  Box,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useTodo } from '../../context/TodoContext';

interface TodoItemProps {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const TodoItem = ({ id, title, completed, createdAt }: TodoItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateTodo, deleteTodo } = useTodo();

  const handleToggleComplete = async () => {
    try {
      setIsUpdating(true);
      await updateTodo(id, { completed: !completed });
    } catch (error) {
      console.error('Error toggling todo completion:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      await deleteTodo(id);
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedTitle.trim() === '') return;
    
    try {
      setIsUpdating(true);
      await updateTodo(id, { title: editedTitle });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <ListItem
      secondaryAction={
        isUpdating ? (
          <CircularProgress size={24} />
        ) : (
          <Box>
            {isEditing ? (
              <>
                <IconButton edge="end" aria-label="save" onClick={handleSave}>
                  <SaveIcon />
                </IconButton>
                <IconButton edge="end" aria-label="cancel" onClick={handleCancel}>
                  <CancelIcon />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton edge="end" aria-label="edit" onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </Box>
        )
      }
      disablePadding
      sx={{
        borderBottom: '1px solid #eee',
        opacity: completed ? 0.7 : 1,
      }}
    >
      <ListItemButton role={undefined} onClick={handleToggleComplete} disabled={isEditing || isUpdating}>
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={completed}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-labelledby': id }}
          />
        </ListItemIcon>
        {isEditing ? (
          <TextField
            fullWidth
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            autoFocus
            variant="standard"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
        ) : (
          <ListItemText
            id={id}
            primary={title}
            secondary={`Created: ${formatDate(createdAt)}`}
            primaryTypographyProps={{
              style: {
                textDecoration: completed ? 'line-through' : 'none',
              },
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
};

export default TodoItem;
