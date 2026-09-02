import { supabasePlayer } from './supabase';

/**
 * List announcements in a safe, read-only way.
 * Expects a Supabase table named `announcements` with fields:
 * - description (or text/body)
 * - status
 * - created_at (or createdAt)
 * Returns a normalized array and does not throw; callers should check `error`.
 */
let _announcementsEmptyWarned = false;
export async function listAnnouncements() {
  try {
    const { data, error } = await supabasePlayer
      .from('announcements')
      // Alias returned columns: title -> description, is_active -> status, created_at -> createdAt
      .select('id, title, is_active, created_at, full_text')
      // Order by the actual DB column name, not the alias
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error };
    }

    const normalized = (data || []).map((row) => {
      const rawStatus = row.status ?? row.is_active ?? row.state;
      const statusLabel =
        typeof rawStatus === 'boolean'
          ? (rawStatus ? 'Active' : 'Inactive')
          : (rawStatus ?? 'Unknown');

      return {
        id: row.id ?? row.uuid ?? row._id ?? null,
        // Expect alias 'description', but keep graceful fallbacks
        description: row.description ?? row.title ?? row.text ?? row.body ?? '',
        // Map full_text column to camelCase fullText
        fullText: row.fullText ?? row.full_text ?? '',
        // Map boolean to labels; otherwise use provided string/fallback
        status: statusLabel,
        // Expect alias 'createdAt' but include fallbacks
        createdAt: row.createdAt ?? row.created_at ?? row.inserted_at ?? row.created ?? null,
      };
    });

    // Dev-only: warn once if no announcements are visible (likely RLS/privilege)
    const isDev = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
    if (isDev && !_announcementsEmptyWarned && normalized.length === 0) {
      _announcementsEmptyWarned = true;
      console.warn('No announcements visible. Check RLS SELECT policies and table privileges.');
    }

    return { data: normalized, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

// Lightweight visibility/health check for the announcements relation.
// Returns ok=true when the table is visible to the current role.
export async function pingAnnouncements() {
  const { error, status } = await supabasePlayer
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  return { ok: !error, status, error };
}

/**
 * Create a new announcement.
 * Accepts { description, fullText, isActive } and maps to DB columns
 * { title, full_text, is_active }. Returns { data, error } and does not throw.
 */
export async function createAnnouncement({ description, fullText, isActive }) {
  try {
    const { data, error } = await supabasePlayer
      .from('announcements')
      .insert([{ title: description || '', full_text: fullText || '', is_active: !!isActive }])
      .select('id, title, is_active, created_at, full_text')
      .single();

    if (error) return { data: null, error };

    const normalized = {
      id: data?.id ?? null,
      description: data?.title ?? '',
      fullText: data?.full_text ?? '',
      status: typeof data?.is_active === 'boolean' ? (data.is_active ? 'Active' : 'Inactive') : 'Unknown',
      createdAt: data?.created_at ?? null,
    };
    return { data: normalized, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update an announcement by id.
 * Accepts (id, { description, fullText, isActive }) and maps to DB columns.
 */
export async function updateAnnouncement(id, { description, fullText, isActive }) {
  try {
    if (!id) return { data: null, error: new Error('Missing id') };
    const { data, error } = await supabasePlayer
      .from('announcements')
      .update({ title: description ?? undefined, full_text: fullText ?? undefined, is_active: typeof isActive === 'boolean' ? isActive : undefined })
      .eq('id', id)
      .select('id, title, is_active, created_at, full_text')
      .single();

    if (error) return { data: null, error };

    const normalized = {
      id: data?.id ?? null,
      description: data?.title ?? '',
      fullText: data?.full_text ?? '',
      status: typeof data?.is_active === 'boolean' ? (data.is_active ? 'Active' : 'Inactive') : 'Unknown',
      createdAt: data?.created_at ?? null,
    };
    return { data: normalized, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Delete an announcement by id.
 */
export async function deleteAnnouncement(id) {
  try {
    if (!id) return { data: null, error: new Error('Missing id') };
    const { error } = await supabasePlayer
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Toggle announcement `is_active` status by id to nextActive (boolean).
 */
export async function toggleAnnouncementStatus(id, nextActive) {
  try {
    if (!id) return { data: null, error: new Error('Missing id') };
    const { data, error } = await supabasePlayer
      .from('announcements')
      .update({ is_active: !!nextActive })
      .eq('id', id)
      .select('id, title, is_active, created_at, full_text')
      .single();
    if (error) return { data: null, error };
    const normalized = {
      id: data?.id ?? null,
      description: data?.title ?? '',
      fullText: data?.full_text ?? '',
      status: typeof data?.is_active === 'boolean' ? (data.is_active ? 'Active' : 'Inactive') : 'Unknown',
      createdAt: data?.created_at ?? null,
    };
    return { data: normalized, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
