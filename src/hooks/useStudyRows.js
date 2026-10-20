import { useEffect, useState } from 'react';
import {
  getAllRows,
  addRow as addRowToDb,
  updateRow,
  deleteRow as deleteRowFromDb,
  clearRows as clearRowsInDb,
} from '../db.js';

export function useStudyRows() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getAllRows()
      .then(setRows)
      .catch(error => console.error('Failed to load rows from IndexedDB:', error));
  }, []);

  async function addRow(data) {
    try {
      const stored = await addRowToDb(data);
      setRows(prev => [...prev, stored]);
    } catch (error) {
      console.error('Failed to save row to IndexedDB:', error);
    }
  }

  async function saveRow(row) {
    try {
      await updateRow(row.id, row);
      setRows(prev => prev.map(r => (r.id === row.id ? row : r)));
    } catch (error) {
      console.error('Failed to save row to IndexedDB:', error);
    }
  }

  async function deleteRow(id) {
    try {
      await deleteRowFromDb(id);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete row from IndexedDB:', error);
    }
  }

  async function clearRows() {
    try {
      await clearRowsInDb();
      setRows([]);
    } catch (error) {
      console.error('Failed to clear study table in IndexedDB:', error);
    }
  }

  return { rows, addRow, saveRow, deleteRow, clearRows };
}
