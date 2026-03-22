import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const thStyle = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px', background: '#f7f7f7' };
const tdStyle = { borderBottom: '1px solid #eee', padding: '8px' };
const trStyle = { background: 'white' };

export default function GalleryInfoManager({
  table,
  title,
  textField = 'dialogue',
  textLabel = 'Info',
  newTextPlaceholder = 'New info...',
  idField = 'id',
  sequenceField = 'sequence',
  statusField = 'status',
  approveField = 'is_approved',
  implementedField = 'is_implemented',
}) {
  const { role } = useAuth();

  const [rows, setRows] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isSuperAdmin = role === 'super_admin';
  const canEdit = isSuperAdmin || role === 'content_mod';
  const isReadonly = !canEdit;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      let query = supabase.from(table).select('*');
      if (sequenceField) query = query.order(sequenceField, { ascending: true });
      query = query.order(idField, { ascending: true });
      const { data, error } = await query;
      if (error) {
        setError(error.message);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    };
    load();
  }, [table, idField, sequenceField]);

  const orderedRows = useMemo(() => {
    if (!sequenceField) return [...rows].sort((a, b) => (a[idField] ?? 0) - (b[idField] ?? 0));
    const withSeq = [...rows].sort((a, b) => {
      const sa = a[sequenceField] ?? Number.MAX_SAFE_INTEGER;
      const sb = b[sequenceField] ?? Number.MAX_SAFE_INTEGER;
      if (sa === sb) return (a[idField] ?? 0) - (b[idField] ?? 0);
      return sa - sb;
    });
    return withSeq;
  }, [rows, idField, sequenceField]);

  const resequence = (list) => {
    if (!sequenceField) return list;
    return list.map((item, idx) => ({ ...item, [sequenceField]: idx + 1 }));
  };

  const onDragStart = (e, id) => {
    if (!canEdit || !sequenceField) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => {
    if (!canEdit || !sequenceField) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = async (e, dropId) => {
    if (!canEdit || !sequenceField) return;
    e.preventDefault();
    if (!dragId || dragId === dropId) return;

    const currentOrder = orderedRows;
    const dragIndex = currentOrder.findIndex((s) => s[idField] === dragId);
    const dropIndex = currentOrder.findIndex((s) => s[idField] === dropId);

    const nextOrder = [...currentOrder];
    const [dragItem] = nextOrder.splice(dragIndex, 1);
    nextOrder.splice(dropIndex, 0, dragItem);

    const resequenced = resequence(nextOrder);
    setRows(resequenced);

    setSaving(true);
    try {
      const updates = await Promise.all(
        resequenced.map((r) => supabase.from(table).update({ [sequenceField]: r[sequenceField] }).eq(idField, r[idField]))
      );
      const err = updates.find((u) => u.error)?.error;
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      let query = supabase.from(table).select('*');
      if (sequenceField) query = query.order(sequenceField, { ascending: true });
      query = query.order(idField, { ascending: true });
      const { data } = await query;
      setRows(data || []);
    } finally {
      setSaving(false);
      setDragId(null);
    }
  };

  const handleAdd = async () => {
    if (!canEdit) return;
    const nextSeq = (rows?.length || 0) + 1;
    const newRow = {
      [textField]: newTextPlaceholder,
    };
    if (statusField) newRow[statusField] = 'pending';
    if (approveField) newRow[approveField] = false;
    if (implementedField) newRow[implementedField] = false;
    if (sequenceField) newRow[sequenceField] = nextSeq;
    setSaving(true);
    const { data, error } = await supabase.from(table).insert(newRow).select('*').single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => [...prev, data]);
  };

  const handleEdit = async (id) => {
    if (!canEdit) return;
    const target = rows.find((r) => r[idField] === id);
    const current = target?.[textField] ?? '';
    const text = window.prompt(`Edit ${textLabel.toLowerCase()}:`, current);
    if (text === null) return;
    setSaving(true);
    const { data, error } = await supabase.from(table).update({ [textField]: text }).eq(idField, id).select('*').single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r[idField] === id ? data : r)));
  };

  const handleApprove = async (id) => {
    if (!isSuperAdmin || !approveField) return;
    setSaving(true);
    const updatePayload = {};
    if (statusField) updatePayload[statusField] = 'approved';
    updatePayload[approveField] = true;
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq(idField, id)
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r[idField] === id ? data : r)));
  };

  const handleImplementedToggle = async (id) => {
    if (!isSuperAdmin || !implementedField) return;
    const row = rows.find((r) => r[idField] === id);
    const nextImplemented = !row?.[implementedField];
    const updatePayload = { [implementedField]: nextImplemented };
    if (statusField) {
      const approved = approveField ? !!row?.[approveField] : !!row?.[statusField] && row[statusField] === 'approved';
      updatePayload[statusField] = nextImplemented ? 'approved' : (approved ? 'approved' : row?.[statusField] ?? 'pending');
    }
    setSaving(true);
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq(idField, id)
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r[idField] === id ? data : r)));
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    const confirmDelete = window.confirm('Delete this row? This cannot be undone.');
    if (!confirmDelete) return;
    setSaving(true);
    const { error: delError } = await supabase.from(table).delete().eq(idField, id);
    if (delError) {
      setSaving(false);
      setError(delError.message);
      return;
    }
    const remaining = rows.filter((r) => r[idField] !== id);
    const resequenced = resequence(remaining);
    setRows(resequenced);
    if (sequenceField) {
      try {
        const updates = await Promise.all(
          resequenced.map((r) => supabase.from(table).update({ [sequenceField]: r[sequenceField] }).eq(idField, r[idField]))
        );
        const err = updates.find((u) => u.error)?.error;
        if (err) throw err;
      } catch (err) {
        setError(err.message);
        let query = supabase.from(table).select('*');
        query = query.order(sequenceField, { ascending: true }).order(idField, { ascending: true });
        const { data } = await query;
        setRows(data || []);
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleAdd} disabled={saving || !canEdit}>Add</button>
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
                <th style={thStyle}>{textLabel}</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((row) => (
                <tr
                  key={row[idField]}
                  draggable={canEdit && !!sequenceField}
                  onDragStart={(e) => canEdit && !!sequenceField && onDragStart(e, row[idField])}
                  onDragOver={(e) => canEdit && !!sequenceField && onDragOver(e)}
                  onDrop={(e) => canEdit && !!sequenceField && onDrop(e, row[idField])}
                  style={trStyle}
                >
                  <td style={tdStyle}>
                    <span style={{ cursor: !canEdit || !sequenceField ? 'default' : 'grab' }}>⋮⋮</span> {sequenceField ? (row[sequenceField] ?? '-') : '-'}
                  </td>
                  <td style={tdStyle}>{row[textField]}</td>
                  <td style={tdStyle}>
                    {statusField ? row[statusField] : '-'}
                    {approveField && row[approveField] && <span style={{ marginLeft: 8, color: 'green' }} title="Approved">✔</span>}
                    {implementedField && row[implementedField] && <span style={{ marginLeft: 8, color: 'blue' }} title="Implemented">⬤</span>}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(row[idField])} disabled={saving || !canEdit}>Edit</button>{' '}
                    {!approveField || row[approveField] ? (
                      isSuperAdmin && (
                        <button onClick={() => handleImplementedToggle(row[idField])} disabled={saving || !implementedField}>
                        {implementedField && row[implementedField] ? 'Mark Not Implemented' : 'Mark Implemented'}
                        </button>
                      )
                    ) : (
                      isSuperAdmin && (
                        <button onClick={() => handleApprove(row[idField])} disabled={saving}>Approve</button>
                      )
                    )}{' '}
                    <button onClick={() => handleDelete(row[idField])} disabled={saving || !canEdit} style={{ color: 'red' }}>
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
