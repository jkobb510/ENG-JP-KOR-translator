import { useEffect, useState } from 'react';
import { getAllRows, addRow as addRowToDb, updateRow, deleteRow as deleteRowFromDb, clearRows as clearRowsInDb } from '../db.js';
import { fetchRemoteRows, createRemoteRow, updateRemoteRow, deleteRemoteRow, clearRemoteRows } from '../api/rows.js';

// Remote sync is best-effort; IndexedDB stays the local source of truth when the server is unreachable.
function logRemoteError(action, error) {
  console.warn(`Server sync failed (${action}):`, error);
}

async function syncWithServer() {
  const remoteRows = await fetchRemoteRows();
  const remoteIds = new Set(remoteRows.map(r => r.remoteId));
  const localRows = await getAllRows();
  const knownRemoteIds = new Set();

  for (const local of localRows) {
    if (local.remoteId == null) {
      const remoteId = await createRemoteRow(local);
      await updateRow(local.id, { ...local, remoteId });
      knownRemoteIds.add(remoteId);
    } else if (!remoteIds.has(local.remoteId)) {
      await deleteRowFromDb(local.id);
    } else {
      knownRemoteIds.add(local.remoteId);
    }
  }

  for (const remote of remoteRows) {
    if (!knownRemoteIds.has(remote.remoteId)) await addRowToDb(remote);
  }

  return getAllRows();
}

export function useStudyRows() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getAllRows()
      .then(localRows => {
        if (!cancelled) setRows(localRows);
      })
      .catch(error => console.error('Failed to load rows from IndexedDB:', error))
      .then(() => syncWithServer())
      .then(synced => {
        if (!cancelled) setRows(synced);
      })
      .catch(error => logRemoteError('load', error));
    return () => {
      cancelled = true;
    };
  }, []);

  async function addRow(data) {
    try {
      const stored = await addRowToDb(data);
      setRows(prev => [...prev, stored]);
      createRemoteRow(stored)
        .then(async remoteId => {
          await updateRow(stored.id, { ...stored, remoteId });
          setRows(prev => prev.map(r => (r.id === stored.id ? { ...r, remoteId } : r)));
        })
        .catch(error => logRemoteError('add', error));
    } catch (error) {
      console.error('Failed to save row to IndexedDB:', error);
    }
  }

  async function saveRow(row) {
    try {
      await updateRow(row.id, row);
      setRows(prev => prev.map(r => (r.id === row.id ? row : r)));
      if (row.remoteId != null) {
        updateRemoteRow(row.remoteId, row).catch(error => logRemoteError('update', error));
      }
    } catch (error) {
      console.error('Failed to save row to IndexedDB:', error);
    }
  }

  async function deleteRow(id) {
    try {
      const target = rows.find(r => r.id === id);
      await deleteRowFromDb(id);
      setRows(prev => prev.filter(r => r.id !== id));
      if (target?.remoteId != null) {
        deleteRemoteRow(target.remoteId).catch(error => logRemoteError('delete', error));
      }
    } catch (error) {
      console.error('Failed to delete row from IndexedDB:', error);
    }
  }

  async function clearRows() {
    try {
      await clearRowsInDb();
      setRows([]);
      clearRemoteRows().catch(error => logRemoteError('clear', error));
    } catch (error) {
      console.error('Failed to clear study table in IndexedDB:', error);
    }
  }

  return { rows, addRow, saveRow, deleteRow, clearRows };
}
