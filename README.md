# Concave Projection Mapper + Wand Trigger

A React Native (Expo) app for theatrical projection mapping on concave 3D surfaces with Bluetooth HID trigger support.

## Features

- **Calibration Mode**: Drag control points to warp a video/grid to match your concave surface
- **Playback Mode**: Trigger warped video playback via Bluetooth HID button (magic wand)
- **Mesh Persistence**: Calibration is saved locally and restored on app launch
- **Cross-Platform**: Works on iOS and Web

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run in web browser
npx expo start --web
```

## Project Structure

```
├── App.tsx                          # Main app entry, mode switching, mesh state
├── src/
│   ├── components/
│   │   ├── HiddenKeyCapture.tsx     # Bluetooth HID keyboard event listener
│   │   ├── MeshWarpEditor.tsx       # Draggable mesh overlay UI
│   │   └── WarpedVideoPlayer.tsx    # Video player (TODO: add GL warp)
│   ├── screens/
│   │   ├── CalibrationScreen.tsx    # Full calibration UI
│   │   └── PlaybackScreen.tsx       # Performance mode UI
│   └── types/
│       └── index.ts                 # TypeScript types
├── assets/
│   ├── calibration-grid.svg         # Reference grid for alignment
│   └── reveal-video.mp4             # Your video content (add this)
└── package.json
```

## Required Assets

Before running, add these files to `assets/`:

1. **reveal-video.mp4** - Your video content to project
2. **calibration-grid.png** - Convert the SVG or use your own grid image
3. **icon.png** - App icon (1024x1024)
4. **splash.png** - Splash screen

## Bluetooth HID Setup

The app listens for keyboard events from paired Bluetooth HID devices. Common shutter buttons send:
- **Space** (` `)
- **Enter**
- **Volume Up** (may require additional handling)

### Pairing Your Wand Button

1. Put your Bluetooth shutter button in pairing mode
2. On iOS: Settings → Bluetooth → Pair the device
3. The button will appear as a keyboard
4. Test in the app - press the button in Playback mode

## Calibration Workflow

1. **Setup**: Connect your iOS device to the projector
2. **Position**: Aim projector at your concave surface
3. **Calibrate**: 
   - Open app (starts in Calibration mode)
   - Toggle to show the grid
   - Drag cyan control points until grid aligns with physical surface
   - Toggle to video preview to verify
4. **Save**: Tap "Save Warp" to persist calibration
5. **Perform**: Go to Playback mode, trigger with wand

## Mesh Configuration

Default: 4×4 grid (16 control points)

To change grid density, modify in `App.tsx`:
```typescript
const DEFAULT_ROWS = 5;  // More rows = finer control
const DEFAULT_COLS = 5;
```

## TODO: GL/Skia Warp Implementation

The current version plays video without actual mesh warping. To implement real warping:

1. Replace `WarpedVideoPlayer` with a GLView/Skia canvas
2. Render video as a texture
3. Apply mesh distortion via vertex shader
4. The mesh data structure is already in normalized coordinates (0-1)

### Suggested Approach

```typescript
// Mesh is already structured as:
// - Points with normalized x,y (0-1)
// - Grid IDs like "0-0", "0-1", "1-0", etc.

// For GL implementation:
// 1. Convert mesh points to vertex positions
// 2. Create triangle indices for each grid cell
// 3. Use texture coordinates from original grid positions
// 4. Apply mesh positions as vertex positions
```

## Trigger Keys

Modify accepted trigger keys in `PlaybackScreen.tsx`:
```typescript
const TRIGGER_KEYS = [' ', 'Enter', 'ArrowUp', 'MediaPlayPause'];
```

## License

MIT
