import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';

const thStyle = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px', background: '#f7f7f7' };
const tdStyle = { borderBottom: '1px solid #eee', padding: '8px' };
const trStyle = { background: 'white' };

export default function IntroductionGallery() {
  const { role } = useAuth();

  const [rows, setRows] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('intro')
        .select('*')
        .order('sequence', { ascending: true })
        .order('id', { ascending: true });
      if (error) {
        setError(error.message);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const orderedRows = useMemo(() => {
    const withSeq = [...rows].sort((a, b) => {
      const sa = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const sb = b.sequence ?? Number.MAX_SAFE_INTEGER;
      if (sa === sb) return a.id - b.id;
      return sa - sb;
    });
    return withSeq;
  }, [rows]);

  const resequence = (list) => list.map((item, idx) => ({ ...item, sequence: idx + 1 }));

  const onDragStart = (e, id) => {
    // Only allow drag when editable
    if (isReadonly) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => {
    if (isReadonly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = async (e, dropId) => {
    if (isReadonly) return;
    e.preventDefault();
    if (!dragId || dragId === dropId) return;

    const currentOrder = orderedRows;
    const dragIndex = currentOrder.findIndex((s) => s.id === dragId);
    const dropIndex = currentOrder.findIndex((s) => s.id === dropId);

    const nextOrder = [...currentOrder];
    const [dragItem] = nextOrder.splice(dragIndex, 1);
    nextOrder.splice(dropIndex, 0, dragItem);

    const resequenced = resequence(nextOrder);
    setRows(resequenced);

    setSaving(true);
    try {
      const updates = await Promise.all(
        resequenced.map((r) => supabase.from('intro').update({ sequence: r.sequence }).eq('id', r.id))
      );
      const err = updates.find((u) => u.error)?.error;
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      const { data } = await supabase
        .from('intro')
        .select('*')
        .order('sequence', { ascending: true })
        .order('id', { ascending: true });
      setRows(data || []);
    } finally {
      setSaving(false);
      setDragId(null);
    }
  };

  const handleAdd = async () => {
    if (isReadonly) return;
    const nextSeq = (rows?.length || 0) + 1;
    const newRow = {
      dialogue: 'New dialogue...',
      status: 'pending',
      actions: null,
      is_approved: false,
      is_implemented: false,
      sequence: nextSeq,
    };
    setSaving(true);
    const { data, error } = await supabase.from('intro').insert(newRow).select('*').single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => [...prev, data]);
  };

  const handleEdit = async (id) => {
    if (isReadonly) return;
    const target = rows.find((r) => r.id === id);
    const text = window.prompt('Edit dialogue:', target?.dialogue ?? '');
    if (text === null) return;
    setSaving(true);
    const { data, error } = await supabase.from('intro').update({ dialogue: text }).eq('id', id).select('*').single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
  };

  const handleApprove = async (id) => {
    if (isReadonly) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('intro')
      .update({ status: 'approved', is_approved: true })
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
  };

  const handleImplementedToggle = async (id) => {
    if (isReadonly) return;
    const row = rows.find((r) => r.id === id);
    const nextImplemented = !row?.is_implemented;
    const nextStatus = nextImplemented ? 'approved' : (row?.is_approved ? 'approved' : row?.status ?? 'pending');
    setSaving(true);
    const { data, error } = await supabase
      .from('intro')
      .update({ is_implemented: nextImplemented, status: nextStatus })
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
  };
  
  // Only super_admin can modify
  const isReadonly = role !== 'super_admin';

  // Delete a row and resequence remaining
  const handleDelete = async (id) => {
    if (isReadonly) return;
    const confirmDelete = window.confirm('Delete this dialogue? This cannot be undone.');
    if (!confirmDelete) return;
    setSaving(true);
    const { error: delError } = await supabase.from('intro').delete().eq('id', id);
    if (delError) {
      setSaving(false);
      setError(delError.message);
      return;
    }
    // Optimistically update local state
    const remaining = rows.filter((r) => r.id !== id);
    const resequenced = resequence(remaining);
    setRows(resequenced);
    // Persist new sequences
    try {
      const updates = await Promise.all(
        resequenced.map((r) => supabase.from('intro').update({ sequence: r.sequence }).eq('id', r.id))
      );
      const err = updates.find((u) => u.error)?.error;
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      // Refetch to restore consistency
      const { data } = await supabase
        .from('intro')
        .select('*')
        .order('sequence', { ascending: true })
        .order('id', { ascending: true });
      setRows(data || []);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Gallery introduction info</h3>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleAdd} disabled={saving || isReadonly}>Add</button>
        </div>
      </div>
      <p>Role: {String(role)}</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {saving && <p>Saving changes...</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Sequence</th>
                <th style={thStyle}>Dialogue</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((row) => (
                <tr
                  key={row.id}
                  draggable={!isReadonly}
                  onDragStart={(e) => !isReadonly && onDragStart(e, row.id)}
                  onDragOver={(e) => !isReadonly && onDragOver(e)}
                  onDrop={(e) => !isReadonly && onDrop(e, row.id)}
                  style={trStyle}
                >
                  <td style={tdStyle}>
                    <span style={{ cursor: isReadonly ? 'default' : 'grab' }}>⋮⋮</span> {row.sequence ?? '-'}
                  </td>
                  <td style={tdStyle}>{row.dialogue}</td>
                  <td style={tdStyle}>
                    {row.status}
                    {row.is_approved && <span style={{ marginLeft: 8, color: 'green' }} title="Approved">✔</span>}
                    {row.is_implemented && <span style={{ marginLeft: 8, color: 'blue' }} title="Implemented">⬤</span>}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(row.id)} disabled={saving || isReadonly}>Edit</button>{' '}
                    {!row.is_approved ? (
                      <button onClick={() => handleApprove(row.id)} disabled={saving || isReadonly}>Approve</button>
                    ) : (
                      <button onClick={() => handleImplementedToggle(row.id)} disabled={saving || isReadonly}>
                        {row.is_implemented ? 'Mark Not Implemented' : 'Mark Implemented'}
                      </button>
                    )}{' '}
                    <button onClick={() => handleDelete(row.id)} disabled={saving || isReadonly} style={{ color: 'red' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
