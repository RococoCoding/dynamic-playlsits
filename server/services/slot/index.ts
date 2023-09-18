import { pool } from '../../index.js';
import { Slot } from '../../types/index.js';
import { createPool } from '../pool/index.js';

const getSlotById = async (id: string): Promise<Slot | null> => {
  const { rows } = await pool.query(
    `SELECT slot.*, pool.last_updated AS pool_last_updated, pool.id AS pool_id, pool.spotify_id AS pool_spotify_id
     FROM slot
     JOIN pool ON slot.pool_id = pool.id
     WHERE slot.id = $1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getSlotsByPlaylistId = async (playlistId: string): Promise<Slot[]> => {
  const { rows } = await pool.query(
    `SELECT slot.*, pool.last_updated AS pool_last_updated, pool.id AS pool_id, pool.spotify_id AS pool_spotify_id
     FROM slot
     LEFT JOIN pool ON slot.pool_id = pool.id
     WHERE slot.playlist_id = $1`,
    [playlistId]
  );
  return rows;
};

const createSlot = async (slot: Omit<Slot, 'id'>, spotify_id: string): Promise<Slot> => {
  const { type, name, playlist_id, artist_name, position } = slot;
  // TODO: transactions
  const { id: pool_id } = await createPool({ spotify_id });
  const { rows } = await pool.query(
    `INSERT INTO slot (type, name, playlist_id, artist_name, position, pool_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [type, name, playlist_id, artist_name, position, pool_id]
  );
  return rows[0];
};

const updateSlot = async (id: string, slot: Partial<Omit<Slot, 'id' | 'created_at' | 'created_by'>>, spotify_id: string): Promise<Slot | null> => {
  const { type, name, artist_name, position } = slot;
  const { id: pool_id } = await createPool({ spotify_id });
  const { rows } = await pool.query(
    `UPDATE slot
     SET type = COALESCE($1, type),
         name = COALESCE($2, name),
         artist_name = COALESCE($3, artist_name),
         pool_id = COALESCE($4, pool_id),
         position = COALESCE($5, position)
     WHERE id = $6
     RETURNING *;`,
    [type, name, artist_name, pool_id, position, id]
  );
  return rows.length > 0 ? {...rows[0], id } : null;
};

const deleteSlot = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM slot WHERE id = $1', [id]);
};

export {
  getSlotById,
  getSlotsByPlaylistId,
  createSlot,
  updateSlot,
  deleteSlot,
};