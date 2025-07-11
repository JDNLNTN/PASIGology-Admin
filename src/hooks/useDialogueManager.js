import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const useDialogueManager = (tableName) => {
  const [dialogues, setDialogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDialogues = useCallback(async () => {
    if (!tableName) {
      console.error('No tableName provided to useDialogueManager!');
      setError('No table name specified.');
      setLoading(false);
      return;
    }
    console.log(`Attempting to fetch dialogues for table: ${tableName}`);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('sequence', { ascending: true });

      if (fetchError) {
        console.error(`Supabase fetch error for ${tableName}:`, fetchError);
        throw fetchError;
      }
      // Sort dialogues numerically by sequence before setting state
      const sortedData = (data || []).sort((a, b) => Number(a.sequence) - Number(b.sequence));
      console.log(`Data fetched and sorted from ${tableName}:`, sortedData);
      setDialogues(sortedData);
    } catch (err) {
      console.error(`Error fetching dialogues from ${tableName} (caught):`, err);
      setError(err.message);
    } finally {
      console.log(`Finished fetch attempt for table: ${tableName}`);
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchDialogues();
  }, [fetchDialogues]);

  const addDialogue = async (newDialogueData) => {
    if (!tableName) {
      console.error('No tableName provided to useDialogueManager!');
      setError('No table name specified.');
      return;
    }
    setError(null);
    try {
      // The sequence and dialogue are now expected to be provided in newDialogueData
      const { sequence, dialogue, speaker } = newDialogueData;

      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert([{ sequence, dialogue, speaker }])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchDialogues(); // Refetch to ensure latest order and sequence from DB
      return data;
    } catch (err) {
      console.error(`Error adding dialogue to ${tableName}:`, err);
      setError(err.message);
      throw err;
    }
  };

  const updateDialogue = async (id, updatedDialogueData) => {
    if (!tableName) {
      console.error('No tableName provided to useDialogueManager!');
      setError('No table name specified.');
      return;
    }
    setError(null);
    try {
      const currentDialogue = dialogues.find(d => d.id === id);
      if (!currentDialogue) {
        throw new Error('Dialogue not found.');
      }
      // Only update the fields provided in updatedDialogueData
      const { data: updatedItem, error: updateError } = await supabase
        .from(tableName)
        .update({ ...updatedDialogueData })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchDialogues(); // Refetch to ensure client state matches database after re-indexing
      return updatedItem;
    } catch (err) {
      console.error(`Error updating dialogue in ${tableName}:`, err);
      setError(err.message);
      throw err;
    }
  };

  const deleteDialogue = async (id) => {
    if (!tableName) {
      console.error('No tableName provided to useDialogueManager!');
      setError('No table name specified.');
      return;
    }
    setError(null);
    try {
      const dialogueToDelete = dialogues.find(d => d.id === id);
      if (!dialogueToDelete) {
        throw new Error('Dialogue not found for deletion.');
      }

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchDialogues(); // Refetch to ensure client state matches database after re-indexing
      return dialogueToDelete;
    } catch (err) {
      console.error(`Error deleting dialogue from ${tableName}:`, err);
      setError(err.message);
      throw err;
    }
  };

  return { dialogues, loading, error, addDialogue, updateDialogue, deleteDialogue, fetchDialogues };
};

export default useDialogueManager;