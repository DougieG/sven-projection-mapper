import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

type MeshPoint = { id: string; x: number; y: number };
type Mesh = MeshPoint[];

type Props = {
  mesh: Mesh;
  videoUri: string;
  width: number;
  height: number;
  gridSize?: number; // e.g., 4 means 4x4 grid
};

/**
 * MeshWarpCanvas
 * 
 * Renders a video warped according to mesh control points using canvas.
 * Uses bilinear interpolation to map video pixels to warped mesh positions.
 */
const MeshWarpCanvas: React.FC<Props> = ({
  mesh,
  videoUri,
  width,
  height,
  gridSize = 4,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get mesh point by grid position
    const getMeshPoint = (row: number, col: number): { x: number; y: number } => {
      const index = row * gridSize + col;
      const point = mesh[index];
      if (point) {
        return { x: point.x * width, y: point.y * height };
      }
      // Fallback to regular grid
      return {
        x: (col / (gridSize - 1)) * width,
        y: (row / (gridSize - 1)) * height,
      };
    };

    // Draw a warped quad (one cell of the mesh)
    const drawWarpedQuad = (
      srcX: number, srcY: number, srcW: number, srcH: number,
      p0: { x: number; y: number }, // top-left
      p1: { x: number; y: number }, // top-right
      p2: { x: number; y: number }, // bottom-right
      p3: { x: number; y: number }, // bottom-left
      subdivisions: number = 4
    ) => {
      // Subdivide the quad for smoother warping
      for (let i = 0; i < subdivisions; i++) {
        for (let j = 0; j < subdivisions; j++) {
          const u0 = i / subdivisions;
          const u1 = (i + 1) / subdivisions;
          const v0 = j / subdivisions;
          const v1 = (j + 1) / subdivisions;

          // Bilinear interpolation for each corner of the sub-quad
          const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
          const bilinear = (u: number, v: number) => ({
            x: lerp(lerp(p0.x, p1.x, u), lerp(p3.x, p2.x, u), v),
            y: lerp(lerp(p0.y, p1.y, u), lerp(p3.y, p2.y, u), v),
          });

          const q0 = bilinear(u0, v0);
          const q1 = bilinear(u1, v0);
          const q2 = bilinear(u1, v1);
          const q3 = bilinear(u0, v1);

          // Source rectangle for this sub-quad
          const subSrcX = srcX + srcW * u0;
          const subSrcY = srcY + srcH * v0;
          const subSrcW = srcW / subdivisions;
          const subSrcH = srcH / subdivisions;

          // Draw using triangles
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(q0.x, q0.y);
          ctx.lineTo(q1.x, q1.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.lineTo(q3.x, q3.y);
          ctx.closePath();
          ctx.clip();

          // Calculate transform matrix for this quad
          // Simplified: just draw stretched
          const minX = Math.min(q0.x, q1.x, q2.x, q3.x);
          const minY = Math.min(q0.y, q1.y, q2.y, q3.y);
          const maxX = Math.max(q0.x, q1.x, q2.x, q3.x);
          const maxY = Math.max(q0.y, q1.y, q2.y, q3.y);

          try {
            ctx.drawImage(
              video,
              subSrcX, subSrcY, subSrcW, subSrcH,
              minX, minY, maxX - minX, maxY - minY
            );
          } catch (e) {
            // Video not ready
          }
          ctx.restore();
        }
      }
    };

    const render = () => {
      if (!video.paused && !video.ended) {
        ctx.clearRect(0, 0, width, height);

        const videoWidth = video.videoWidth || width;
        const videoHeight = video.videoHeight || height;
        const cellWidth = videoWidth / (gridSize - 1);
        const cellHeight = videoHeight / (gridSize - 1);

        // Draw each cell of the mesh
        for (let row = 0; row < gridSize - 1; row++) {
          for (let col = 0; col < gridSize - 1; col++) {
            const p0 = getMeshPoint(row, col);
            const p1 = getMeshPoint(row, col + 1);
            const p2 = getMeshPoint(row + 1, col + 1);
            const p3 = getMeshPoint(row + 1, col);

            drawWarpedQuad(
              col * cellWidth, row * cellHeight, cellWidth, cellHeight,
              p0, p1, p2, p3,
              2 // subdivisions for smoother warp
            );
          }
        }
      }
      animationRef.current = requestAnimationFrame(render);
    };

    video.addEventListener('play', () => {
      render();
    });

    // Start video
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [mesh, videoUri, width, height, gridSize]);

  if (Platform.OS !== 'web') {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        src={videoUri}
        style={{ display: 'none' }}
        loop
        muted
        playsInline
        autoPlay
      />
      {/* Canvas for warped output */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

export default MeshWarpCanvas;
