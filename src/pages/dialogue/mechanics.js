import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import useDialogueManager from '../../hooks/useDialogueManager';
import useUserRole from '../../hooks/useUserRole';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../context/AuthContext';

export default function IntroductionDialogue() {
  const location = useLocation();
  const { dialogues, loading, error, addDialogue, updateDialogue, deleteDialogue } = useDialogueManager('mechanicsscript');
 const { role: currentUserRole } = useAuth();

  // Prefer role from navigation state if available, otherwise use hook
  const effectiveRole = location.state?.role || currentUserRole;

  console.log('Debug: useUserRole hook result:', { currentUserRole, effectiveRole });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: null, sequence: 0, dialogue: '', speaker: '' });
  const [newDialogueText, setNewDialogueText] = useState('');
  const [newSpeakerText, setNewSpeakerText] = useState(''); 
  const [newSequenceText, setNewSequenceText] = useState('');
  const [componentError, setComponentError] = useState(null);
  const [refactorOpen, setRefactorOpen] = useState(false);
  const [dragDialogues, setDragDialogues] = useState([]);
  const [dragLoading, setDragLoading] = useState(false);
  const [suggestingId, setSuggestingId] = useState(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogueToDelete, setDialogueToDelete] = useState(null);
  
  // Define speakers
  // a = Aji Character, h = Harold Character
  const speakers = ['a', 'h']; // a = Aji Character, h = harold Character
  const allSequences = Array.from({ length: 100 }, (_, i) => i + 1); // Define all possible sequences
  
  // Filter out sequences already in use
  const usedSequences = new Set(dialogues.map(d => Number(d.sequence)));
  const availableSequences = allSequences.filter(seq => !usedSequences.has(seq));

  const handleEdit = (dialogue) => {
    setEditingId(dialogue.id);
    setEditForm(dialogue);
  };
//handle saving adding dialogue
  const handleSave = async () => {
    setComponentError(null);
    try {
      if (editForm.sequence <= 0) {
        setComponentError('Sequence must be a positive number.');
        toast.error('Sequence must be a positive number.');
        return;
      }
      let updatedData = {};
      if (effectiveRole === 'super_admin') {
        updatedData = { sequence: editForm.sequence, dialogue: editForm.dialogue, speaker: editForm.speaker, for_approval: null };
      } else if (effectiveRole === 'content_mod') {
        updatedData = { sequence: editForm.sequence, for_approval: editForm.dialogue };
      }
      await updateDialogue(editForm.id, updatedData);
      setEditingId(null);
      toast.success(effectiveRole === 'super_admin' ? 'Dialogue updated successfully!' : 'Edit submitted for approval!');
    } catch (err) {
      setComponentError('Failed to update dialogue.');
      toast.error('Failed to update dialogue.');
    }
  };

  const handleDelete = async (id) => {
    setComponentError(null);
    try {
      await deleteDialogue(id);
      toast.success('Dialogue deleted successfully!');
    } catch (err) {
      setComponentError(err.message);
      toast.error(`Error deleting dialogue: ${err.message}`);
    }
  };

  const handleAdd = async () => {
    setComponentError(null);
    try {
      if (!newDialogueText.trim() || !newSpeakerText.trim() || !newSequenceText) {
        setComponentError('Dialogue, Speaker, and Sequence cannot be empty.');
        toast.error('Dialogue, Speaker, and Sequence cannot be empty.');
        return;
      }
      const sequenceExists = dialogues.some(
        (dialogue) => dialogue.sequence === Number(newSequenceText)
      );
      if (sequenceExists) {
        setComponentError('Sequence already exists. Please choose a different sequence number.');
        toast.error('Sequence already exists. Please choose a different sequence number.');
        return;
      }
      let newDialogueData = {};
      if (effectiveRole === 'super_admin') {
        newDialogueData = { sequence: Number(newSequenceText), dialogue: newDialogueText, speaker: newSpeakerText };
      } else if (effectiveRole === 'content_mod') {
        newDialogueData = { sequence: Number(newSequenceText), dialogue: '', for_approval: newDialogueText, speaker: newSpeakerText };
      } else {
        // fallback: treat as super_admin
        newDialogueData = { sequence: Number(newSequenceText), dialogue: newDialogueText, speaker: newSpeakerText };
      }
      await addDialogue(newDialogueData);
      setNewDialogueText('');
      setNewSpeakerText('a'); // Reset to default Aji
      setNewSequenceText('');
      toast.success(effectiveRole === 'content_mod' ? 'Dialogue submitted for approval!' : 'Dialogue added successfully!');
    } catch (err) {
      setComponentError(err.message);
      toast.error(`Error adding dialogue: ${err.message}`);
    }
  };

  const handleApprove = async (dialogue) => {
    try {
      await updateDialogue(dialogue.id, { dialogue: dialogue.for_approval, for_approval: null });
      toast.success('Dialogue approved!');
    } catch (err) {
      toast.error('Failed to approve dialogue.');
    }
  };

  const handleSuggest = (dialogue) => {
    console.log('Suggest clicked for dialogue:', dialogue.id, dialogue);
    setSuggestingId(dialogue.id);
    setSuggestionText(dialogue.for_approval || '');
  };

  const handleSubmitSuggestion = async (dialogue) => {
    console.log('Submitting suggestion for dialogue:', dialogue.id, 'with value:', suggestionText);
    try {
      const result = await updateDialogue(dialogue.id, { for_approval: suggestionText });
      console.log('updateDialogue result:', result);
      toast.success('Suggestion submitted for approval!');
      setSuggestingId(null);
      setSuggestionText('');
    } catch (err) {
      toast.error('Failed to submit suggestion.');
    }
  };

  // Open drag modal and set initial order
  const handleOpenRefactor = () => {
    setDragDialogues([...dialogues].sort((a, b) => a.sequence - b.sequence));
    setRefactorOpen(true);
  };

  // Refactor SortableDialogueRow to use useSortable inside the component
  function SortableDialogueRow({ dialogue, index, handleUp, handleDown, disableUp, disableDown }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: dialogue.id.toString() });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 2 : 1,
    };
    return (
      <Paper
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        sx={{
          p: 1.5,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          border: isDragging ? '2px dashed #8e24aa' : '1px solid #e0e0e0',
          background: isDragging ? '#e3f2fd' : '#f9f9f9',
          boxShadow: isDragging ? 4 : 1,
          transition: 'background 0.2s, border 0.2s',
          cursor: 'grab',
        }}
      >
        <Box sx={{ pr: 1, color: '#888', display: 'flex', alignItems: 'center' }}>
          <DragIndicatorIcon />
        </Box>
        <Typography variant="body1" sx={{ width: 32, textAlign: 'right', fontWeight: 500 }}>{index + 1}.</Typography>
        <Typography variant="body2" sx={{ flex: 1 }}>{dialogue.dialogue}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'center' }}>({dialogue.speaker})</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
          <IconButton size="small" onClick={handleUp} disabled={disableUp}>
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleDown} disabled={disableDown}>
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    );
  }

  // Handle drag end (update dragDialogues order and reassign sequence numbers for UI feedback)
  const onDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIndex = dragDialogues.findIndex(d => d.id.toString() === active.id);
      const newIndex = dragDialogues.findIndex(d => d.id.toString() === over.id);
      const newOrder = arrayMove(dragDialogues, oldIndex, newIndex).map((item, idx) => ({ ...item, sequence: idx + 1 }));
      setDragDialogues(newOrder);
    }
  };

  // Save new order
const handleSaveRefactor = async () => {
  setDragLoading(true); // Show one global loading indicator
  try {
    await Promise.all(
      dragDialogues.map((dialogue, index) =>
        updateDialogue(dialogue.id, { sequence: index + 1 })
      )
    );
    toast.success('Sequences updated!');
    setRefactorOpen(false);
  } catch (err) {
    toast.error('Failed to update sequences.');
  } finally {
    setDragLoading(false); // Hide the global loading indicator
  }
};


  // Move sensors definition outside of the render/return so hooks are not called conditionally
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (loading) {
    return (
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading Dialogues...</Typography>
          </Box>
        </Container>
    );
  }

  // Open the delete confirmation dialog and set the dialogue to delete
  const handleRequestDelete = (dialogue) => {
    setDialogueToDelete(dialogue);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDialogueToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (dialogueToDelete) {
      await handleDelete(dialogueToDelete.id);
    }
    setDeleteDialogOpen(false);
    setDialogueToDelete(null);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Mechanics Dialogue Management
      </Typography>
      {!currentUserRole && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Warning: No user role detected. Edit/Delete/Approve actions will be hidden.
        </Alert>
      )}

      {/* Add New Dialogue Form */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Add New Dialogue
        </Typography>
        <Typography variant="body1">Note: C = Claire Character, L = Luisa Character</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Dialogue"
            fullWidth required
            value={newDialogueText}
            onChange={(e) => setNewDialogueText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { // Allow adding by pressing Enter
                handleAdd();
              }
            }}
          />
          <FormControl  size="small" sx={{ minWidth: 120 }} required>
            <InputLabel>Speaker</InputLabel>
            <Select
              value={newSpeakerText}
              label="Speaker"
              onChange={e => setNewSpeakerText(e.target.value)}
            >
              {speakers.map((speakerOption) => (
                <MenuItem key={speakerOption} value={speakerOption}>
                  {speakerOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl  size="small" sx={{ minWidth: 120 }} required>
            <InputLabel>Sequence</InputLabel>
            <Select
              value={newSequenceText}
              label="Sequence"
              onChange={e => setNewSequenceText(e.target.value)}
            >
              {availableSequences.map((sequenceOption) => (
                <MenuItem key={sequenceOption} value={sequenceOption}>
                  {sequenceOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleAdd}>
            Add
          </Button>
        </Box>
      </Paper>

      {/* Dialogues Table */}
      <TableContainer component={Paper}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <Button variant="outlined" color="secondary" onClick={handleOpenRefactor}>
            Re-order Dialogues
          </Button>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sequence</TableCell>
              <TableCell>Speaker</TableCell>
              <TableCell>Dialogue</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dialogues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3 }}>
                  No dialogues found. Add one above!
                </TableCell>
              </TableRow>
            ) : (
              dialogues.map((dialogue) => (
                <React.Fragment key={dialogue.id}>
                  <TableRow>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <TextField
                          type="number"
                          value={editForm.sequence}
                          onChange={(e) => setEditForm({ ...editForm, sequence: parseInt(e.target.value) })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { handleSave(); }
                          }}
                        />
                      ) : (
                        dialogue.sequence
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Speaker</InputLabel>
                          <Select
                            value={editForm.speaker}
                            label="Speaker"
                            onChange={e => setEditForm({ ...editForm, speaker: e.target.value })}
                          >
                            {speakers.map((speakerOption) => (
                              <MenuItem key={speakerOption} value={speakerOption}>
                                {speakerOption}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        dialogue.speaker
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <TextField
                          fullWidth
                          value={editForm.dialogue}
                          onChange={(e) => setEditForm({ ...editForm, dialogue: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { handleSave(); } }}
                        />
                      ) : (
                        <>
                          {dialogue.dialogue}
                          {dialogue.for_approval && (
                            <Box sx={{ mt: 1, p: 1, background: '#fffde7', border: '1px dashed #fbc02d', borderRadius: 1 }}>
                              <Typography variant="body2" color="warning.main">
                                <b>Pending Approval:</b> {dialogue.for_approval}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton color="primary" onClick={handleSave}><SaveIcon /></IconButton>
                          <IconButton color="secondary" onClick={() => setEditingId(null)}><CancelIcon /></IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Actions Row: Delete, Approve (super_admin only) */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {currentUserRole && currentUserRole.toLowerCase() === 'super_admin' && (
                              <IconButton color="error" onClick={() => handleRequestDelete(dialogue)}><DeleteIcon /></IconButton>
                            )}
                            {currentUserRole && currentUserRole.toLowerCase() === 'super_admin' && dialogue.for_approval && (
                              <Button size="small" color="success" onClick={() => handleApprove(dialogue)}>
                                Approve
                              </Button>
                            )}
                          </Box>
                          {/* Edit/Suggest Button logic */}
                          {currentUserRole && currentUserRole.toLowerCase() === 'super_admin' && (
                            <IconButton color="primary" onClick={() => handleEdit(dialogue)} style={{ alignSelf: 'flex-start' }}>
                              <EditIcon />
                            </IconButton>
                          )}
                          {currentUserRole && currentUserRole.toLowerCase() === 'content_mod' && (
                            <Button size="small" color="primary" variant="outlined" onClick={() => handleSuggest(dialogue)} style={{ alignSelf: 'flex-start' }}>
                              Suggest
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                  {/* Suggestion input row for content_mod */}
                  {currentUserRole && currentUserRole.toLowerCase() === 'content_mod' && suggestingId === dialogue.id && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ background: '#f3e5f5' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Suggest new dialogue"
                            value={suggestionText}
                            onChange={e => setSuggestionText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmitSuggestion(dialogue); }}
                            autoFocus
                          />
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button size="small" color="primary" variant="contained" onClick={() => handleSubmitSuggestion(dialogue)}>
                              Submit
                            </Button>
                            <Button size="small" onClick={() => { setSuggestingId(null); setSuggestionText(''); }}>
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={refactorOpen} onClose={() => setRefactorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reorder Dialogues</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Drag and drop to reorder dialogues. You can also use the up/down arrows. Click Save to update sequence numbers.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={dragDialogues.map(d => d.id.toString())} strategy={verticalListSortingStrategy}>
                {dragDialogues.map((dialogue, index) => (
                  <SortableDialogueRow
                    key={dialogue.id}
                    dialogue={dialogue}
                    index={index}
                    handleUp={() => {
                      if (index > 0) {
                        const newOrder = Array.from(dragDialogues);
                        const temp = newOrder[index - 1];
                        newOrder[index - 1] = newOrder[index];
                        newOrder[index] = temp;
                        setDragDialogues(newOrder.map((item, idx) => ({ ...item, sequence: idx + 1 })));
                      }
                    }}
                    handleDown={() => {
                      if (index < dragDialogues.length - 1) {
                        const newOrder = Array.from(dragDialogues);
                        const temp = newOrder[index + 1];
                        newOrder[index + 1] = newOrder[index];
                        newOrder[index] = temp;
                        setDragDialogues(newOrder.map((item, idx) => ({ ...item, sequence: idx + 1 })));
                      }
                    }}
                    disableUp={index === 0}
                    disableDown={index === dragDialogues.length - 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefactorOpen(false)} disabled={dragLoading}>Cancel</Button>
          <Button onClick={handleSaveRefactor} color="primary" disabled={dragLoading}>
            {dragLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this dialogue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnOnHover draggable pauseOnHover />
    </Container>
  );
}