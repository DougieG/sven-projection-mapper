import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  onSizeChange?: (width: number, height: number) => void;
};

const HANDLE_SIZE = 32;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * ResizableVideoContainer
 * 
 * A container that can be resized by dragging corner/edge handles.
 * The content inside scales to fit.
 */
const ResizableVideoContainer: React.FC<Props> = ({
  children,
  initialWidth = SCREEN_WIDTH * 0.8,
  initialHeight = SCREEN_HEIGHT * 0.6,
  minWidth = 200,
  minHeight = 150,
  onSizeChange,
}) => {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = useState({ 
    x: (SCREEN_WIDTH - initialWidth) / 2, 
    y: (SCREEN_HEIGHT - initialHeight) / 2 - 60 // Account for controls
  });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [startTouch, setStartTouch] = useState<{ x: number; y: number } | null>(null);
  const [startSize, setStartSize] = useState<{ width: number; height: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((handle: string) => (e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    setActiveHandle(handle);
    setStartTouch({ x: touch.pageX, y: touch.pageY });
    setStartSize({ ...size });
    setStartPos({ ...position });
  }, [size, position]);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    if (!activeHandle || !startTouch || !startSize || !startPos) return;

    const touch = e.nativeEvent;
    const deltaX = touch.pageX - startTouch.x;
    const deltaY = touch.pageY - startTouch.y;

    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startPos.x;
    let newY = startPos.y;

    // Handle different resize handles
    switch (activeHandle) {
      case 'move':
        newX = startPos.x + deltaX;
        newY = startPos.y + deltaY;
        break;
      case 'se': // Bottom-right
        newWidth = Math.max(minWidth, startSize.width + deltaX);
        newHeight = Math.max(minHeight, startSize.height + deltaY);
        break;
      case 'sw': // Bottom-left
        newWidth = Math.max(minWidth, startSize.width - deltaX);
        newHeight = Math.max(minHeight, startSize.height + deltaY);
        newX = startPos.x + (startSize.width - newWidth);
        break;
      case 'ne': // Top-right
        newWidth = Math.max(minWidth, startSize.width + deltaX);
        newHeight = Math.max(minHeight, startSize.height - deltaY);
        newY = startPos.y + (startSize.height - newHeight);
        break;
      case 'nw': // Top-left
        newWidth = Math.max(minWidth, startSize.width - deltaX);
        newHeight = Math.max(minHeight, startSize.height - deltaY);
        newX = startPos.x + (startSize.width - newWidth);
        newY = startPos.y + (startSize.height - newHeight);
        break;
      case 'n': // Top edge
        newHeight = Math.max(minHeight, startSize.height - deltaY);
        newY = startPos.y + (startSize.height - newHeight);
        break;
      case 's': // Bottom edge
        newHeight = Math.max(minHeight, startSize.height + deltaY);
        break;
      case 'e': // Right edge
        newWidth = Math.max(minWidth, startSize.width + deltaX);
        break;
      case 'w': // Left edge
        newWidth = Math.max(minWidth, startSize.width - deltaX);
        newX = startPos.x + (startSize.width - newWidth);
        break;
    }

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
    onSizeChange?.(newWidth, newHeight);
  }, [activeHandle, startTouch, startSize, startPos, minWidth, minHeight, onSizeChange]);

  const handleTouchEnd = useCallback(() => {
    setActiveHandle(null);
    setStartTouch(null);
    setStartSize(null);
    setStartPos(null);
  }, []);

  const renderHandle = (position: string, style: object) => (
    <View
      key={position}
      style={[styles.handle, style, activeHandle === position && styles.handleActive]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouchStart(position)}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
    />
  );

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            width: size.width,
            height: size.height,
            left: position.x,
            top: position.y,
          },
        ]}
      >
        {/* Content area - draggable to move */}
        <View
          style={styles.content}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart('move')}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          {children}
        </View>

        {/* Corner handles */}
        {renderHandle('nw', styles.handleNW)}
        {renderHandle('ne', styles.handleNE)}
        {renderHandle('sw', styles.handleSW)}
        {renderHandle('se', styles.handleSE)}

        {/* Edge handles */}
        {renderHandle('n', styles.handleN)}
        {renderHandle('s', styles.handleS)}
        {renderHandle('e', styles.handleE)}
        {renderHandle('w', styles.handleW)}

        {/* Border indicator */}
        <View style={styles.border} pointerEvents="none" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: 'rgba(0, 200, 255, 0.8)',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  handleActive: {
    backgroundColor: '#00ffff',
    transform: [{ scale: 1.2 }],
  },
  // Corner handles
  handleNW: {
    top: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },
  handleNE: {
    top: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },
  handleSW: {
    bottom: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },
  handleSE: {
    bottom: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },
  // Edge handles
  handleN: {
    top: -HANDLE_SIZE / 2,
    left: '50%',
    marginLeft: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE * 1.5,
  },
  handleS: {
    bottom: -HANDLE_SIZE / 2,
    left: '50%',
    marginLeft: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE * 1.5,
  },
  handleE: {
    right: -HANDLE_SIZE / 2,
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    height: HANDLE_SIZE * 1.5,
  },
  handleW: {
    left: -HANDLE_SIZE / 2,
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    height: HANDLE_SIZE * 1.5,
  },
});

export default ResizableVideoContainer;
