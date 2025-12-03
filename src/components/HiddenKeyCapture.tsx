import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';

type Props = {
  onKeyPress: (key: string) => void;
  enabled?: boolean;
};

/**
 * HiddenKeyCapture
 * 
 * Captures key presses from any paired Bluetooth HID device (keyboard/shutter button).
 * The shutter button typically sends: ' ' (space), 'Enter', or volume keys.
 * 
 * For web, we also listen to window keydown events as a fallback.
 */
const HiddenKeyCapture: React.FC<Props> = ({ onKeyPress, enabled = true }) => {
  const inputRef = useRef<TextInput | null>(null);

  // Keep focus on the hidden input to capture HID events
  useEffect(() => {
    if (!enabled) return;

    const focusInterval = setInterval(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);

    return () => clearInterval(focusInterval);
  }, [enabled]);

  // Web: Set up Media Session API for hardware media button support
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    
    if ('mediaSession' in navigator) {
      // Set up media session to capture hardware buttons
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Projection Mapper',
        artist: 'Ready',
      });
      
      // Handle play/pause from hardware buttons
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎬 Media Session: play');
        onKeyPress(' ');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🎬 Media Session: pause');
        onKeyPress(' ');
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('🎬 Media Session: previous');
        onKeyPress('ArrowLeft');
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('🎬 Media Session: next');
        onKeyPress('ArrowRight');
      });
    }
    
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [onKeyPress, enabled]);

  // Web fallback: listen to window keydown
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Debug: show what key was pressed
      console.log(`🔑 Key pressed: "${e.key}" (code: ${e.code})`);
      
      // Show on-screen for debugging
      const debugDiv = document.getElementById('key-debug');
      if (debugDiv) {
        debugDiv.textContent = `Last key: ${e.key}`;
        debugDiv.style.opacity = '1';
        setTimeout(() => { debugDiv.style.opacity = '0.3'; }, 1000);
      }
      
      onKeyPress(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKeyPress, enabled]);

  if (!enabled) return null;

  return (
    <TextInput
      ref={inputRef}
      style={styles.hidden}
      autoFocus
      caretHidden
      showSoftInputOnFocus={false}
      onKeyPress={(e) => {
        const key = e.nativeEvent.key;
        onKeyPress(key);
      }}
      blurOnSubmit={false}
    />
  );
};

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    top: -100,
    left: -100,
  },
});

export default HiddenKeyCapture;
