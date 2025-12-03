import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Line, Circle, G, Rect } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];
type Size = { width: number; height: number };

type Props = {
  mesh: Mesh;
  onMeshChange: (mesh: Mesh) => void;
  showVideo?: boolean;
  videoSource?: any;
  videoUri?: string | null;
  gridSource?: any;
  editable?: boolean;
  // Resize props
  contentSize?: { width: number; height: number };
  onContentSizeChange?: (size: { width: number; height: number }) => void;
  contentOffset?: { x: number; y: number };
  onContentOffsetChange?: (offset: { x: number; y: number }) => void;
};

const HANDLE_RADIUS = 12;
const HANDLE_HIT_SLOP = 20;
const RESIZE_HANDLE_SIZE = 24;

/**
 * MeshWarpEditor
 * 
 * Displays a draggable mesh overlay on top of either a calibration grid
 * or video preview. Users drag control points to define the warp.
 */
const MeshWarpEditor: React.FC<Props> = ({
  mesh,
  onMeshChange,
  showVideo = false,
  videoSource,
  videoUri,
  gridSource,
  editable = true,
  contentSize,
  onContentSizeChange,
  contentOffset,
  onContentOffsetChange,
}) => {
  // Determine video source - prefer videoUri if provided
  const effectiveVideoSource = videoUri ? { uri: videoUri } : videoSource;
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<Size | null>(null);
  const [resizeStartOffset, setResizeStartOffset] = useState<{ x: number; y: number } | null>(null);

  // Use content size if provided, otherwise use container size
  const size = contentSize || containerSize;
  const offset = contentOffset || { x: 0, y: 0 };

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
    // Initialize content size if not set
    if (!contentSize && onContentSizeChange) {
      onContentSizeChange({ width: width * 0.8, height: height * 0.8 });
    }
    if (!contentOffset && onContentOffsetChange) {
      onContentOffsetChange({ x: width * 0.1, y: height * 0.1 });
    }
  }, [contentSize, contentOffset, onContentSizeChange, onContentOffsetChange]);

  // Calculate grid dimensions from mesh
  const rows = Math.max(...mesh.map((p) => Number(p.id.split('-')[0]))) + 1 || 1;
  const cols = Math.max(...mesh.map((p) => Number(p.id.split('-')[1]))) + 1 || 1;

  const getPoint = useCallback(
    (r: number, c: number): MeshPoint | undefined =>
      mesh.find((p) => p.id === `${r}-${c}`),
    [mesh]
  );

  const findNearestPoint = useCallback(
    (touchX: number, touchY: number): string | null => {
      if (!size) return null;
      
      let nearest: string | null = null;
      let minDist = HANDLE_HIT_SLOP + HANDLE_RADIUS;

      for (const point of mesh) {
        const px = point.x * size.width;
        const py = point.y * size.height;
        const dist = Math.sqrt((touchX - px) ** 2 + (touchY - py) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = point.id;
        }
      }
      return nearest;
    },
    [mesh, size]
  );

  const updatePoint = useCallback(
    (id: string, touchX: number, touchY: number) => {
      if (!size) return;
      
      const clampedX = Math.max(0, Math.min(size.width, touchX));
      const clampedY = Math.max(0, Math.min(size.height, touchY));

      const newMesh = mesh.map((p) =>
        p.id === id
          ? {
              ...p,
              x: clampedX / size.width,
              y: clampedY / size.height,
            }
          : p
      );
      onMeshChange(newMesh);
    },
    [mesh, onMeshChange, size]
  );

  const handleTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (!editable || !size) return;
      
      const touch = e.nativeEvent;
      const pointId = findNearestPoint(touch.locationX, touch.locationY);
      if (pointId) {
        setActivePointId(pointId);
      }
    },
    [editable, findNearestPoint, size]
  );

  const handleTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!editable || !activePointId || !size) return;
      
      const touch = e.nativeEvent;
      updatePoint(activePointId, touch.locationX, touch.locationY);
    },
    [editable, activePointId, updatePoint, size]
  );

  const handleTouchEnd = useCallback(() => {
    setActivePointId(null);
  }, []);

  // Render mesh lines
  const renderLines = () => {
    if (!size) return null;
    
    const lines: React.ReactNode[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = getPoint(r, c);
        const pRight = c < cols - 1 ? getPoint(r, c + 1) : undefined;
        const pDown = r < rows - 1 ? getPoint(r + 1, c) : undefined;

        if (p && pRight) {
          lines.push(
            <Line
              key={`h-${r}-${c}`}
              x1={p.x * size.width}
              y1={p.y * size.height}
              x2={pRight.x * size.width}
              y2={pRight.y * size.height}
              stroke="rgba(0, 255, 255, 0.6)"
              strokeWidth={2}
            />
          );
        }
        if (p && pDown) {
          lines.push(
            <Line
              key={`v-${r}-${c}`}
              x1={p.x * size.width}
              y1={p.y * size.height}
              x2={pDown.x * size.width}
              y2={pDown.y * size.height}
              stroke="rgba(0, 255, 255, 0.6)"
              strokeWidth={2}
            />
          );
        }
      }
    }
    return lines;
  };

  // Render draggable handles
  const renderHandles = () => {
    if (!size || !editable) return null;

    return mesh.map((p) => {
      const isActive = activePointId === p.id;
      return (
        <G key={p.id}>
          {/* Outer glow for active point */}
          {isActive && (
            <Circle
              cx={p.x * size.width}
              cy={p.y * size.height}
              r={HANDLE_RADIUS + 4}
              fill="rgba(0, 255, 255, 0.3)"
            />
          )}
          {/* Main handle */}
          <Circle
            cx={p.x * size.width}
            cy={p.y * size.height}
            r={HANDLE_RADIUS}
            fill={isActive ? '#00ffff' : 'rgba(0, 200, 255, 0.9)'}
            stroke="white"
            strokeWidth={2}
          />
        </G>
      );
    });
  };

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => editable}
      onMoveShouldSetResponder={() => editable}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
    >
      {size && (
        <>
          {/* Background: either grid or video */}
          <View style={StyleSheet.absoluteFill}>
            {showVideo && effectiveVideoSource ? (
              <Video
                source={effectiveVideoSource}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping
              />
            ) : gridSource ? (
              <Image
                source={gridSource}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
              />
            ) : (
              // Default checkerboard pattern
              <View style={[StyleSheet.absoluteFill, styles.defaultGrid]} />
            )}
          </View>

          {/* Mesh overlay */}
          <Svg
            width={size.width}
            height={size.height}
            style={StyleSheet.absoluteFill}
          >
            {renderLines()}
            {renderHandles()}
          </Svg>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  defaultGrid: {
    backgroundColor: '#222',
  },
});

export default MeshWarpEditor;
