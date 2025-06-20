import React, { useState } from 'react';
import {
  Alert,
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DialogueLayout from '../DialogueLayout';
import useDialogueManager from '../../../hooks/useDialogueManager';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LolitaDialogue() {
  const { dialogues, loading, error, addDialogue, updateDialogue, deleteDialogue } = useDialogueManager('lolitascript');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: null, sequence: 0, dialogue: '', speaker: '' });
  const [newDialogueText, setNewDialogueText] = useState('');
  const [newSpeakerText, setNewSpeakerText] = useState('l'); // Default to Lolita
  const [newSequenceText, setNewSequenceText] = useState('');
  const [componentError, setComponentError] = useState(null);

  const speakers = ['l', 'p']; // l = Lolita Character, p = Player Character
  const allSequences = Array.from({ length: 100 }, (_, i) => i + 1); // Define all possible sequences
  
  // Filter out sequences already in use
  const usedSequences = new Set(dialogues.map(d => Number(d.sequence)));
  const availableSequences = allSequences.filter(seq => !usedSequences.has(seq));

  const handleEdit = (dialogue) => {
    setEditingId(dialogue.id);
    setEditForm(dialogue);
  };

  const handleSave = async () => {
    setComponentError(null);
    try {
      if (editForm.sequence <= 0) {
        setComponentError('Sequence must be a positive number.');
        toast.error('Sequence must be a positive number.');
        return;
      }
      await updateDialogue(editForm.id, { sequence: editForm.sequence, dialogue: editForm.dialogue, speaker: editForm.speaker });
      setEditingId(null);
      toast.success('Dialogue updated successfully!');
    } catch (err) {
      setComponentError(err.message);
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
      toast.error('Failed to delete dialogue.');
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
      await addDialogue({ sequence: Number(newSequenceText), dialogue: newDialogueText, speaker: newSpeakerText });
      setNewDialogueText('');
      setNewSpeakerText('l'); // Reset to default Lolita
      setNewSequenceText('');
      toast.success('Dialogue added successfully!');
    } catch (err) {
      setComponentError(err.message);
      toast.error('Failed to add dialogue.');
    }
  };

  if (loading) {
    return (
      <DialogueLayout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading Dialogues...</Typography>
          </Box>
        </Container>
      </DialogueLayout>
    );
  }

  return (
    <DialogueLayout>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Lolita Dialogue Management
        </Typography>

        {/* Add New Dialogue Form */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Add New Dialogue
          </Typography>
          <Typography variant="body1">Note: l = Lolita Character, p = Player Character</Typography>
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
                  <TableRow key={dialogue.id}>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <TextField
                          type="number"
                          value={editForm.sequence}
                          onChange={(e) => setEditForm({ ...editForm, sequence: parseInt(e.target.value) })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { // Allow saving by pressing Enter
                              handleSave();
                            }
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { // Allow saving by pressing Enter
                              handleSave();
                            }
                          }}
                        />
                      ) : (
                        dialogue.dialogue
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === dialogue.id ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton color="primary" onClick={handleSave}><SaveIcon /></IconButton>
                          <IconButton color="secondary" onClick={() => setEditingId(null)}><CancelIcon /></IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton color="primary" onClick={() => handleEdit(dialogue)}><EditIcon /></IconButton>
                          <IconButton color="error" onClick={() => handleDelete(dialogue.id)}><DeleteIcon /></IconButton>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </DialogueLayout>
  );
} 