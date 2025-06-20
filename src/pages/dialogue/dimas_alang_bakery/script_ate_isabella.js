import React, { useState } from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, IconButton, CircularProgress, Alert, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DialogueLayout from '../DialogueLayout';
import useDialogueManager from '../../../hooks/useDialogueManager';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AteIsabellaDialogue() {
  const { dialogues, loading, error, addDialogue, updateDialogue, deleteDialogue } = useDialogueManager('script_ate_isabella');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: null, sequence: 0, dialogue: '', speaker: '' });
  const [newDialogueText, setNewDialogueText] = useState('');
  const [newSpeakerText, setNewSpeakerText] = useState('N');
  const [newSequenceText, setNewSequenceText] = useState('');
  const [componentError, setComponentError] = useState(null);

  const speakers = ['N','P']; //for speakers options
  const sequences = Array.from({ length: 100 }, (_, i) => i + 1); // Define sequences array

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
      setComponentError('Failed to delete dialogue.');
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
      setNewSpeakerText('N');
      setNewSequenceText('');
      toast.success('Dialogue added successfully!');
    } catch (err) {
      setComponentError('Failed to add dialogue.');
      toast.error('Failed to add dialogue.');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error || componentError) return <Alert severity="error">{error || componentError}</Alert>;

  return (
    <DialogueLayout>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>Ate Isabella Dialogue Management</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Add New Dialogue</Typography>
          <Typography variant="body1">Note: N = Ate Isabella Character, P = Player Character</Typography>
          <Box display="flex" gap={2} mt={1}>
            <TextField
              label="Dialogue"
              value={newDialogueText}
              onChange={e => setNewDialogueText(e.target.value)}
              fullWidth required
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
                {sequences.map((sequenceOption) => (
                  <MenuItem key={sequenceOption} value={sequenceOption}>
                    {sequenceOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button variant="contained" onClick={handleAdd}>Add</Button>
          </Box>
        </Paper>
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
              {(dialogues || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {editingId === row.id ? (
                      <TextField
                        type="number"
                        value={editForm.sequence}
                        onChange={e => setEditForm({ ...editForm, sequence: Number(e.target.value) })}
                        size="small"
                        style={{ width: 60 }}
                      />
                    ) : (
                      row.sequence
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === row.id ? (
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
                      row.speaker
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === row.id ? (
                      <TextField
                        value={editForm.dialogue}
                        onChange={e => setEditForm({ ...editForm, dialogue: e.target.value })}
                        size="small"
                        fullWidth
                      />
                    ) : (
                      row.dialogue
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === row.id ? (
                      <>
                        <IconButton onClick={handleSave}><SaveIcon /></IconButton>
                        <IconButton onClick={() => setEditingId(null)}><CancelIcon /></IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => handleEdit(row)}><EditIcon /></IconButton>
                        <IconButton onClick={() => handleDelete(row.id)}><DeleteIcon color="error" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </DialogueLayout>
  );
}