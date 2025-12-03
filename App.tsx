import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalibrationScreen from './src/screens/CalibrationScreen';
import PlaybackScreen from './src/screens/PlaybackScreen';
import { VideoCue, createVideoCue } from './src/types/video';

export type MeshPoint = { id: string; x: number; y: number };
export type Mesh = MeshPoint[];

const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 4;
const MAX_HISTORY = 30;

const buildDefaultMesh = (rows: number, cols: number): Mesh => {
  const points: Mesh = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({
        id: `${r}-${c}`,
        x: c / (cols - 1),
        y: r / (rows - 1),
      });
    }
  }
  return points;
};

const MESH_KEY = 'concave-mapper-mesh';
const CUES_KEY = 'concave-mapper-cues';

export default function App() {
  const [mode, setMode] = useState<'calibration' | 'playback'>('calibration');
  const [mesh, setMeshInternal] = useState<Mesh>(() =>
    buildDefaultMesh(DEFAULT_ROWS, DEFAULT_COLS)
  );
  const [meshLoaded, setMeshLoaded] = useState(false);
  
  // Video cues (playlist)
  const [videoCues, setVideoCues] = useState<VideoCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState(0);
  
  // Undo/Redo history
  const historyRef = useRef<Mesh[]>([buildDefaultMesh(DEFAULT_ROWS, DEFAULT_COLS)]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Current video URI (from current cue)
  const currentVideoUri = videoCues[currentCueIndex]?.uri || null;

  // Update undo/redo state
  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Set mesh with history tracking
  const setMesh = useCallback((newMesh: Mesh) => {
    // Check if mesh actually changed
    const currentMesh = historyRef.current[historyIndexRef.current];
    if (JSON.stringify(newMesh) === JSON.stringify(currentMesh)) return;

    // Truncate future history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(newMesh);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    
    setMeshInternal(newMesh);
    updateHistoryState();
  }, [updateHistoryState]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setMeshInternal(historyRef.current[historyIndexRef.current]);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setMeshInternal(historyRef.current[historyIndexRef.current]);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedMesh, storedCues] = await Promise.all([
          AsyncStorage.getItem(MESH_KEY),
          AsyncStorage.getItem(CUES_KEY),
        ]);
        
        if (storedMesh) {
          const parsedMesh = JSON.parse(storedMesh);
          setMeshInternal(parsedMesh);
          historyRef.current = [parsedMesh];
          historyIndexRef.current = 0;
        }
        
        if (storedCues) {
          const parsedCues = JSON.parse(storedCues);
          setVideoCues(parsedCues);
        }
        
        // If both mesh and cues are set, default to playback
        if (storedMesh && storedCues) {
          const cues = JSON.parse(storedCues);
          if (cues.length > 0) {
            setMode('playback');
          }
        }
      } catch (e) {
        console.warn('Failed to load data, using defaults.', e);
      } finally {
        setMeshLoaded(true);
        updateHistoryState();
      }
    };
    loadData();
  }, [updateHistoryState]);

  // Save mesh
  const handleSaveMesh = useCallback(async (newMesh: Mesh) => {
    setMesh(newMesh);
    try {
      await AsyncStorage.setItem(MESH_KEY, JSON.stringify(newMesh));
    } catch (e) {
      console.warn('Failed to save mesh', e);
    }
  }, [setMesh]);

  // Reset mesh and history
  const handleResetMesh = useCallback(async () => {
    const defaultMesh = buildDefaultMesh(DEFAULT_ROWS, DEFAULT_COLS);
    historyRef.current = [defaultMesh];
    historyIndexRef.current = 0;
    setMeshInternal(defaultMesh);
    updateHistoryState();
    try {
      await AsyncStorage.removeItem(MESH_KEY);
    } catch (e) {
      console.warn('Failed to clear mesh', e);
    }
  }, [updateHistoryState]);

  // Add video cue
  const handleVideoSelected = useCallback(async (uri: string, name?: string) => {
    const newCue = createVideoCue(uri, name);
    const updatedCues = [...videoCues, newCue];
    setVideoCues(updatedCues);
    setCurrentCueIndex(updatedCues.length - 1); // Select the new cue
    try {
      await AsyncStorage.setItem(CUES_KEY, JSON.stringify(updatedCues));
    } catch (e) {
      console.warn('Failed to save cues', e);
    }
  }, [videoCues]);

  // Remove video cue
  const handleRemoveCue = useCallback(async (cueId: string) => {
    const updatedCues = videoCues.filter(c => c.id !== cueId);
    setVideoCues(updatedCues);
    if (currentCueIndex >= updatedCues.length) {
      setCurrentCueIndex(Math.max(0, updatedCues.length - 1));
    }
    try {
      await AsyncStorage.setItem(CUES_KEY, JSON.stringify(updatedCues));
    } catch (e) {
      console.warn('Failed to save cues', e);
    }
  }, [videoCues, currentCueIndex]);

  // Toggle cue loop setting
  const handleToggleCueLoop = useCallback(async (cueId: string) => {
    const updatedCues = videoCues.map(c => 
      c.id === cueId ? { ...c, loop: !c.loop } : c
    );
    setVideoCues(updatedCues);
    try {
      await AsyncStorage.setItem(CUES_KEY, JSON.stringify(updatedCues));
    } catch (e) {
      console.warn('Failed to save cues', e);
    }
  }, [videoCues]);

  // Navigate cues
  const handleNextCue = useCallback(() => {
    if (currentCueIndex < videoCues.length - 1) {
      setCurrentCueIndex(currentCueIndex + 1);
    }
  }, [currentCueIndex, videoCues.length]);

  const handlePrevCue = useCallback(() => {
    if (currentCueIndex > 0) {
      setCurrentCueIndex(currentCueIndex - 1);
    }
  }, [currentCueIndex]);

  const handleSelectCue = useCallback((index: number) => {
    if (index >= 0 && index < videoCues.length) {
      setCurrentCueIndex(index);
    }
  }, [videoCues.length]);

  if (!meshLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {mode === 'calibration' ? (
        <CalibrationScreen
          mesh={mesh}
          onMeshChange={setMesh}
          onSaveMesh={handleSaveMesh}
          onResetMesh={handleResetMesh}
          onGoToPlayback={() => setMode('playback')}
          videoUri={currentVideoUri}
          onVideoSelected={handleVideoSelected}
          // Undo/Redo
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          // Cue management
          videoCues={videoCues}
          currentCueIndex={currentCueIndex}
          onSelectCue={handleSelectCue}
          onRemoveCue={handleRemoveCue}
          onToggleCueLoop={handleToggleCueLoop}
        />
      ) : (
        <PlaybackScreen
          mesh={mesh}
          onGoToCalibration={() => setMode('calibration')}
          videoUri={currentVideoUri}
          // Cue management
          videoCues={videoCues}
          currentCueIndex={currentCueIndex}
          onNextCue={handleNextCue}
          onPrevCue={handlePrevCue}
          onSelectCue={handleSelectCue}
          currentCueLoop={videoCues[currentCueIndex]?.loop || false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
