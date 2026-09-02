import React, { useEffect, useState } from 'react';
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementStatus } from '../../services/announcementService';

const Announcement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ description: '', fullText: '', isActive: false });
  const [editingId, setEditingId] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await listAnnouncements();
    if (error) {
      setError(error.message || 'Failed to load announcements');
      setRows([]);
    } else {
      setError(null);
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchRows();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = () => {
    setForm({ description: '', fullText: '', isActive: false });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { description: form.description, fullText: form.fullText, isActive: !!form.isActive };
    const res = editingId
      ? await updateAnnouncement(editingId, payload)
      : await createAnnouncement(payload);

    if (res.error) {
      setError(res.error.message || 'Failed to save announcement');
    } else {
      setError(null);
      resetForm();
      await fetchRows();
    }
    setLoading(false);
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    const isActive = String(row.status).toLowerCase() === 'active';
    setForm({ description: row.description || '', fullText: row.fullText || '', isActive });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    setLoading(true);
    const { error } = await deleteAnnouncement(id);
    if (error) {
      setError(error.message || 'Failed to delete announcement');
    } else {
      setError(null);
      await fetchRows();
    }
    setLoading(false);
  };

  const handleToggle = async (row) => {
    const isActive = String(row.status).toLowerCase() === 'active';
    const nextActive = !isActive;
    const { error } = await toggleAnnouncementStatus(row.id, nextActive);
    if (error) {
      setError(error.message || 'Failed to update status');
    } else {
      setError(null);
      await fetchRows();
    }
  };

  return (
    <div>
      <h1>Announcement</h1>
      <p>Manage announcements here.</p>

      {error && (
        <div style={{ background: '#ffe6e6', color: '#b30000', padding: '10px', borderRadius: 4, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 16, border: '1px solid #eee', padding: 12, borderRadius: 4 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ flex: 1, padding: 8 }}
            required
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        <textarea
          placeholder="Full Text"
          value={form.fullText}
          onChange={(e) => setForm({ ...form, fullText: e.target.value })}
          style={{ width: '100%', minHeight: 80, padding: 8, marginBottom: 8 }}
          required
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} disabled={loading} style={{ padding: '8px 12px' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div style={{ padding: '8px' }}>Loading announcements…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Description</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Full Text</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Created at</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id ?? idx}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{row.description || '—'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{row.fullText || '—'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{row.status || '—'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                    <button onClick={() => handleEdit(row)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => handleDelete(row.id)} style={{ marginRight: 8 }}>Delete</button>
                    <button onClick={() => handleToggle(row)}>
                      {String(row.status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={5} style={{ padding: '12px', color: '#666' }}>No announcements found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Announcement;
