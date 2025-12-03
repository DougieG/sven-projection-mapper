import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import WarpedVideoPlayer from '../components/WarpedVideoPlayer';
import HiddenKeyCapture from '../components/HiddenKeyCapture';
import { VideoCue } from '../types/video';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];

type Props = {
  mesh: Mesh;
  onGoToCalibration: () => void;
  videoUri: string | null;
  // Cue management
  videoCues: VideoCue[];
  currentCueIndex: number;
  onNextCue: () => void;
  onPrevCue: () => void;
  onSelectCue: (index: number) => void;
  currentCueLoop: boolean;
};

// Keys that trigger playback (adjust based on your Bluetooth shutter button)
// Most Bluetooth shutters send: Space, Enter, VolumeUp, or a camera key
const TRIGGER_KEYS = [
  ' ',           // Space
  'Enter',       // Enter key
  'ArrowUp',     // Some remotes
  'MediaPlayPause',
  'AudioVolumeUp',   // Volume up (web standard)
  'AudioVolumeDown', // Volume down (web standard)
  'VolumeUp',        // Volume up (older)
  'VolumeDown',      // Volume down (older)
];
// Keys for cue navigation
const NEXT_CUE_KEYS = ['ArrowRight', 'n', 'N'];
const PREV_CUE_KEYS = ['ArrowLeft', 'p', 'P'];

/**
 * PlaybackScreen
 * 
 * Minimal UI for performance mode.
 * - Fullscreen black UI with blackout option
 * - Cue navigation (prev/next)
 * - Plays warped video when triggered by HID button (magic wand)
 */
const PlaybackScreen: React.FC<Props> = ({
  mesh,
  onGoToCalibration,
  videoUri,
  videoCues,
  currentCueIndex,
  onNextCue,
  onPrevCue,
  onSelectCue,
  currentCueLoop,
}) => {
  const [playing, setPlaying] = useState(false);
  const [armed, setArmed] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [blackout, setBlackout] = useState(false);

  const currentCue = videoCues[currentCueIndex];

  const handleKeyPress = useCallback(
    (key: string) => {
      // Blackout toggle with Escape
      if (key === 'Escape') {
        setBlackout(prev => !prev);
        if (playing) {
          setPlaying(false);
          setArmed(true);
        }
        return;
      }

      // Cue navigation (when not playing)
      if (!playing) {
        if (NEXT_CUE_KEYS.includes(key)) {
          onNextCue();
          return;
        }
        if (PREV_CUE_KEYS.includes(key)) {
          onPrevCue();
          return;
        }
      }

      if (!armed || blackout) return;

      // Check if the key matches any trigger
      if (TRIGGER_KEYS.includes(key)) {
        console.log(`🪄 Wand triggered! Key: ${key}`);
        setPlaying(true);
        setArmed(false);
        setShowControls(false);
      }
    },
    [armed, blackout, playing, onNextCue, onPrevCue]
  );

  const handlePlaybackFinished = useCallback(() => {
    console.log('📼 Playback finished');
    setPlaying(false);
    setArmed(true);
    
    // Auto-advance to next cue if not looping
    if (!currentCueLoop && currentCueIndex < videoCues.length - 1) {
      onNextCue();
    }
  }, [currentCueLoop, currentCueIndex, videoCues.length, onNextCue]);

  const handleManualTrigger = () => {
    if (!armed || blackout) return;
    setPlaying(true);
    setArmed(false);
    setShowControls(false);
  };

  const handleScreenTap = () => {
    if (!playing) {
      setShowControls((prev) => !prev);
    }
  };

  const handleBlackout = () => {
    setBlackout(true);
    if (playing) {
      setPlaying(false);
      setArmed(true);
    }
  };

  const handleUnblackout = () => {
    setBlackout(false);
  };

  return (
    <View style={styles.container}>
      {/* Hidden key capture for Bluetooth HID */}
      <HiddenKeyCapture onKeyPress={handleKeyPress} enabled={true} />

      {/* Blackout overlay */}
      {blackout ? (
        <TouchableOpacity
          style={styles.blackoutOverlay}
          activeOpacity={1}
          onPress={handleUnblackout}
        >
          <Text style={styles.blackoutText}>BLACKOUT</Text>
          <Text style={styles.blackoutHint}>Tap or press Escape to exit</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Video Player */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleScreenTap}
          >
            <WarpedVideoPlayer
              mesh={mesh}
              playing={playing && !blackout}
              onPlaybackFinished={handlePlaybackFinished}
              videoSource={videoUri ? { uri: videoUri } : undefined}
            />
          </TouchableOpacity>

          {/* Status Overlay */}
          {showControls && (
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
              {/* Top row: Status + Cue info */}
              <View style={styles.topRow}>
                {/* Status indicator */}
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: armed ? '#00ff00' : '#ffaa00' },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {armed ? 'Ready' : 'Playing...'}
                  </Text>
                </View>

                {/* Current cue indicator */}
                {currentCue && (
                  <View style={styles.cueIndicator}>
                    <Text style={styles.cueNumber}>
                      Cue {currentCueIndex + 1}/{videoCues.length}
                    </Text>
                    <Text style={styles.cueName} numberOfLines={1}>
                      {currentCue.name}
                    </Text>
                    {currentCueLoop && <Text style={styles.loopBadge}>🔁 Loop</Text>}
                  </View>
                )}
              </View>

              {/* Center: Cue navigation */}
              {videoCues.length > 1 && (
                <View style={styles.cueNavRow}>
                  <TouchableOpacity
                    style={[styles.navButton, currentCueIndex === 0 && styles.buttonDisabled]}
                    onPress={onPrevCue}
                    disabled={currentCueIndex === 0}
                  >
                    <Text style={styles.navButtonText}>◀ Prev</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.navButton, currentCueIndex === videoCues.length - 1 && styles.buttonDisabled]}
                    onPress={onNextCue}
                    disabled={currentCueIndex === videoCues.length - 1}
                  >
                    <Text style={styles.navButtonText}>Next ▶</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom: Control buttons */}
              <View style={styles.bottomControls}>
                <View style={styles.controlRow}>
                  {/* Blackout button */}
                  <TouchableOpacity
                    style={[styles.button, styles.blackoutButton]}
                    onPress={handleBlackout}
                  >
                    <Text style={styles.buttonText}>⬛ Blackout</Text>
                  </TouchableOpacity>

                  {/* Manual trigger button */}
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.triggerButton,
                      !armed && styles.buttonDisabled,
                    ]}
                    onPress={handleManualTrigger}
                    disabled={!armed}
                  >
                    <Text style={styles.buttonText}>🪄 Trigger</Text>
                  </TouchableOpacity>

                  {/* Back to calibration */}
                  <TouchableOpacity
                    style={[styles.button, styles.calibrateButton]}
                    onPress={onGoToCalibration}
                  >
                    <Text style={styles.buttonText}>⚙️ Setup</Text>
                  </TouchableOpacity>
                </View>

                {/* Help text */}
                <Text style={styles.helpText}>
                  Wand/Space/Enter = Play • Arrows = Navigate cues • Esc = Blackout
                </Text>
              </View>
            </SafeAreaView>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  // Blackout mode
  blackoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackoutText: {
    color: '#333',
    fontSize: 24,
    fontWeight: 'bold',
  },
  blackoutHint: {
    color: '#222',
    fontSize: 12,
    marginTop: 8,
  },
  // Main overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Cue indicator
  cueIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  cueNumber: {
    color: '#00aaff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cueName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 150,
  },
  loopBadge: {
    color: '#ffaa00',
    fontSize: 11,
    marginTop: 2,
  },
  // Cue navigation
  cueNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Bottom controls
  bottomControls: {
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  blackoutButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
  },
  triggerButton: {
    backgroundColor: '#336633',
  },
  calibrateButton: {
    backgroundColor: '#444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default PlaybackScreen;
