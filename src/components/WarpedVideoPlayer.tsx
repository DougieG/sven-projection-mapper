import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Text, useWindowDimensions, Platform } from 'react-native';
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
  const { width, height } = useWindowDimensions();

  // Handle play trigger
  useEffect(() => {
    if (playing && videoRef.current && isReady) {
      if (Platform.OS === 'web') {
        // Web: Use native HTML5 video API
        const video = videoRef.current as unknown as HTMLVideoElement;
        video.currentTime = 0;
        video.play();
      } else {
        // Native: Use expo-av API
        videoRef.current.setPositionAsync(0);
        videoRef.current.playAsync();
      }
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [playing, isReady, fadeAnim, fadeInDuration]);

  // Handle playback status updates (native only)
  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    if (status.didJustFinish && onPlaybackFinished) {
      handlePlaybackEnd();
    }
  };

  // Common playback end handler
  const handlePlaybackEnd = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onPlaybackFinished?.();
    });
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
      
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, width, height }]}>
        {source ? (
          Platform.OS === 'web' ? (
            // Web: Use native HTML5 video for better Safari/iPad support
            <video
              ref={videoRef as any}
              src={source.uri}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width,
                height,
                objectFit: 'fill',
              }}
              playsInline
              onLoadedData={() => setIsReady(true)}
              onEnded={handlePlaybackEnd}
            />
          ) : (
            <Video
              ref={videoRef}
              source={source}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width, 
                height,
              }}
              resizeMode={ResizeMode.STRETCH}
              isLooping={false}
              shouldPlay={false}
              onLoad={handleLoad}
              onPlaybackStatusUpdate={handlePlaybackStatus}
              isMuted={false}
            />
          )
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No video loaded{'\n'}Select a video to preview
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
