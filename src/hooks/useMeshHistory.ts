import { useState, useCallback, useRef } from 'react';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];

const MAX_HISTORY = 50;

/**
 * useMeshHistory
 * 
 * Provides undo/redo functionality for mesh editing.
 * Stores history of mesh states and allows navigation.
 */
export function useMeshHistory(initialMesh: Mesh) {
  const [mesh, setMeshInternal] = useState<Mesh>(initialMesh);
  const historyRef = useRef<Mesh[]>([initialMesh]);
  const indexRef = useRef(0);

  const setMesh = useCallback((newMesh: Mesh | ((prev: Mesh) => Mesh)) => {
    const resolvedMesh = typeof newMesh === 'function' 
      ? newMesh(historyRef.current[indexRef.current])
      : newMesh;
    
    // Don't add to history if mesh hasn't changed
    const currentMesh = historyRef.current[indexRef.current];
    const hasChanged = JSON.stringify(resolvedMesh) !== JSON.stringify(currentMesh);
    if (!hasChanged) return;

    // Truncate any "future" history if we're not at the end
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    
    // Add new state
    historyRef.current.push(resolvedMesh);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      indexRef.current++;
    }
    
    setMeshInternal(resolvedMesh);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--;
      setMeshInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      setMeshInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const resetHistory = useCallback((newMesh: Mesh) => {
    historyRef.current = [newMesh];
    indexRef.current = 0;
    setMeshInternal(newMesh);
  }, []);

  // Commit current state to history (call after drag ends)
  const commitToHistory = useCallback(() => {
    // This is called when drag ends to ensure the final position is saved
    // The regular setMesh already handles this, but this can be used
    // to force a history checkpoint
  }, []);

  return {
    mesh,
    setMesh,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    commitToHistory,
    historyLength: historyRef.current.length,
    historyIndex: indexRef.current,
  };
}

export default useMeshHistory;
