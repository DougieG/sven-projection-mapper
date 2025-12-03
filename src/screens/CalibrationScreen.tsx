import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MeshWarpEditor from '../components/MeshWarpEditor';
import { VideoCue } from '../types/video';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];

type Props = {
  mesh: Mesh;
  onMeshChange: (mesh: Mesh) => void;
  onSaveMesh: (mesh: Mesh) => void;
  onResetMesh: () => void;
  onGoToPlayback: () => void;
  videoUri: string | null;
  onVideoSelected: (uri: string, name?: string) => void;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Cue management
  videoCues: VideoCue[];
  currentCueIndex: number;
  onSelectCue: (index: number) => void;
  onRemoveCue: (cueId: string) => void;
  onToggleCueLoop: (cueId: string) => void;
};

/**
 * CalibrationScreen
 * 
 * Full UI for adjusting the mesh warp and saving calibration.
 * User drags mesh points until projected grid aligns to the concave surface.
 */
const CalibrationScreen: React.FC<Props> = ({
  mesh,
  onMeshChange,
  onSaveMesh,
  onResetMesh,
  onGoToPlayback,
  videoUri,
  onVideoSelected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  videoCues,
  currentCueIndex,
  onSelectCue,
  onRemoveCue,
  onToggleCueLoop,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  const [showCueList, setShowCueList] = useState(false);

  const pickVideo = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to select videos.'
      );
      return;
    }

    // Launch picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Generate a name from the file path
      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop()?.split('.')[0] || `Cue ${videoCues.length + 1}`;
      onVideoSelected(uri, fileName);
      Alert.alert('Video Added', `"${fileName}" has been added to your cue list.`);
    }
  };

  const handleSave = () => {
    onSaveMesh(mesh);
    Alert.alert(
      'Warp Saved',
      'Mesh calibration has been saved. Ready for playback!',
      [
        { text: 'Stay Here', style: 'cancel' },
        { text: 'Go to Playback', onPress: onGoToPlayback },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Mesh?',
      'This will reset all control points to their default positions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetMesh },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mesh Editor - full screen */}
      <View style={styles.editorContainer}>
        <MeshWarpEditor
          mesh={mesh}
          onMeshChange={onMeshChange}
          showVideo={showVideo}
          videoUri={videoUri}
          editable={true}
        />
      </View>

      {/* Cue List Panel (collapsible) */}
      {showCueList && videoCues.length > 0 && (
        <View style={styles.cueListPanel}>
          <Text style={styles.cueListTitle}>Video Cues ({videoCues.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {videoCues.map((cue, index) => (
              <TouchableOpacity
                key={cue.id}
                style={[
                  styles.cueItem,
                  index === currentCueIndex && styles.cueItemActive,
                ]}
                onPress={() => onSelectCue(index)}
                onLongPress={() => {
                  Alert.alert(
                    cue.name,
                    `Loop: ${cue.loop ? 'On' : 'Off'}`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: cue.loop ? 'Disable Loop' : 'Enable Loop', onPress: () => onToggleCueLoop(cue.id) },
                      { text: 'Remove', style: 'destructive', onPress: () => onRemoveCue(cue.id) },
                    ]
                  );
                }}
              >
                <Text style={styles.cueNumber}>{index + 1}</Text>
                <Text style={styles.cueName} numberOfLines={1}>{cue.name}</Text>
                {cue.loop && <Text style={styles.cueLoop}>🔁</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Control Panel */}
      <View style={styles.controls}>
        {/* Top row: Undo/Redo and Cue toggle */}
        <View style={styles.controlRowTop}>
          <View style={styles.undoRedoGroup}>
            <TouchableOpacity
              style={[styles.smallButton, !canUndo && styles.buttonDisabled]}
              onPress={onUndo}
              disabled={!canUndo}
            >
              <Text style={styles.buttonText}>↩ Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, !canRedo && styles.buttonDisabled]}
              onPress={onRedo}
              disabled={!canRedo}
            >
              <Text style={styles.buttonText}>Redo ↪</Text>
            </TouchableOpacity>
          </View>
          
          {videoCues.length > 0 && (
            <TouchableOpacity
              style={[styles.smallButton, styles.cueToggle]}
              onPress={() => setShowCueList(!showCueList)}
            >
              <Text style={styles.buttonText}>
                🎬 Cues ({currentCueIndex + 1}/{videoCues.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main control row */}
        <View style={styles.controlRow}>
          {/* Add Video */}
          <TouchableOpacity
            style={[styles.button, styles.pickButton]}
            onPress={pickVideo}
          >
            <Text style={styles.buttonText}>+ Add Video</Text>
          </TouchableOpacity>

          {/* Toggle Grid/Video */}
          <TouchableOpacity
            style={[styles.button, styles.toggleButton, !videoUri && styles.buttonDisabled]}
            onPress={() => setShowVideo((prev) => !prev)}
            disabled={!videoUri && showVideo}
          >
            <Text style={styles.buttonText}>
              {showVideo ? '🔲 Grid' : '🎬 Video'}
            </Text>
          </TouchableOpacity>

          {/* Reset */}
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>↺ Reset</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>💾 Save</Text>
          </TouchableOpacity>

          {/* Go to Playback */}
          <TouchableOpacity
            style={[styles.button, styles.playbackButton, videoCues.length === 0 && styles.buttonDisabled]}
            onPress={onGoToPlayback}
            disabled={videoCues.length === 0}
          >
            <Text style={styles.buttonText}>▶ Play</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          {videoCues.length === 0
            ? 'Add a video to get started'
            : 'Drag cyan points to warp • Long-press cue for options'
          }
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  editorContainer: {
    flex: 1,
  },
  // Cue list panel
  cueListPanel: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cueListTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  cueItem: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cueItemActive: {
    backgroundColor: '#0066cc',
    borderWidth: 2,
    borderColor: '#00aaff',
  },
  cueNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cueName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 2,
    maxWidth: 70,
  },
  cueLoop: {
    fontSize: 10,
    marginTop: 2,
  },
  // Controls
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  controlRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  undoRedoGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  cueToggle: {
    backgroundColor: '#444',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  pickButton: {
    backgroundColor: '#664400',
  },
  toggleButton: {
    backgroundColor: '#444',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  resetButton: {
    backgroundColor: '#663333',
  },
  saveButton: {
    backgroundColor: '#336633',
  },
  playbackButton: {
    backgroundColor: '#333366',
  },
  buttonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  instructions: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default CalibrationScreen;
