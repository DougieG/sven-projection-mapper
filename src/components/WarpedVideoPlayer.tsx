import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];

type Props = {
  mesh: Mesh;
  playing: boolean;
  videoSource?: any;
  onPlaybackFinished?: () => void;
  fadeInDuration?: number;
};

/**
 * WarpedVideoPlayer
 * 
 * Plays video with the saved mesh warp applied.
 * 
 * 🚧 TODO: Replace this with a GLView/Skia implementation that:
 *    - Uses `mesh` as a 2D mesh warp
 *    - Applies the warp to the video texture via a shader
 * 
 * For now, this displays the video normally with fade-in effect,
 * so the rest of the app flow works end-to-end.
 */
const WarpedVideoPlayer: React.FC<Props> = ({
  mesh,
  playing,
  videoSource,
  onPlaybackFinished,
  fadeInDuration = 500,
}) => {
  const videoRef = useRef<Video | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);

  // Handle play trigger
  useEffect(() => {
    if (playing && videoRef.current && isReady) {
      // Reset to beginning and play
      videoRef.current.setPositionAsync(0);
      videoRef.current.playAsync();
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();
    }
  }, [playing, isReady, fadeAnim, fadeInDuration]);

  // Handle playback status updates
  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    if (status.didJustFinish && onPlaybackFinished) {
      // Fade out then callback
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onPlaybackFinished();
      });
    }
  };

  const handleLoad = () => {
    setIsReady(true);
  };

  // Video source - must be provided or app shows placeholder
  const source = videoSource;

  return (
    <View style={styles.container}>
      {/* 
        🚧 MESH WARP TODO:
        The `mesh` prop contains normalized vertex positions (0-1).
        To implement actual warping:
        
        1. Use expo-gl / GLView to render video as a texture
        2. Create a vertex shader that takes mesh positions as uniforms
        3. Fragment shader samples the video texture
        4. The mesh defines how the quad is distorted
        
        For concave surfaces, the mesh typically has:
        - Edge points pulled inward
        - Center points pushed outward
        
        Example shader approach:
        - Divide video into grid cells matching mesh
        - Each cell is a quad with 4 corner vertices from mesh
        - Bilinear interpolate within each cell
      */}
      
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        {source ? (
          <Video
            ref={videoRef}
            source={source}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            shouldPlay={false}
            onLoad={handleLoad}
            onPlaybackStatusUpdate={handlePlaybackStatus}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No video loaded{'\n'}Add reveal-video.mp4 to assets/
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Debug: show mesh info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          {/* Mesh has {mesh.length} points */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
});

export default WarpedVideoPlayer;
