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

  // Web fallback: listen to window keydown
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
