import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

/**
 * Live Webcam Hand-Gesture Recognition Modal for Indian Sign Language (ISL) math input.
 *
 * CAPABILITY SCOPE (Honest Implementation Status):
 * - Uses @mediapipe/tasks-vision (HandLandmarker) + browser getUserMedia webcam stream.
 * - Uses heuristic finger-extension geometry for a limited subset of 11 math symbols:
 *   digits 0-5 and operators +, -, *, =, <.
 * - Does NOT run full Dynamic Time Warping (DTW) across 106 signs and is NOT full continuous
 *   ISL-to-text translation.
 * - MediaPipe WASM/task model assets are fetched from jsDelivr / Google Cloud Storage CDNs
 *   at runtime; offline environments show a clear fallback message.
 */

export interface LiveISLRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognizedSign: (sign: string) => void;
  onDeleteLastSign?: () => void;
  onClearSigns?: () => void;
  currentInput?: string;
}

interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

interface HandLandmarkerInstance {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => { landmarks?: LandmarkPoint[][] };
  close: () => void;
}

const NEON_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const LiveISLRecognitionModal: React.FC<LiveISLRecognitionModalProps> = ({
  isOpen,
  onClose,
  onRecognizedSign,
  onDeleteLastSign,
  onClearSigns,
  currentInput = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<HandLandmarkerInstance | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied'>('idle');
  const [detectedSign, setDetectedSign] = useState<string>('Ready');
  const [confidence, setConfidence] = useState<number>(0);
  const [recentSigns, setRecentSigns] = useState<string[]>([]);
  const [autoInsert, setAutoInsert] = useState<boolean>(false);
  const lastEmittedSignRef = useRef<string>('');
  const signHoldCountRef = useRef<number>(0);

  const stopCameraTracks = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  // Initialize MediaPipe HandLandmarker when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setIsLoading(true);
        setModelError(null);
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        if (isCancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (isCancelled) return;

        const handLandmarker = (await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        })) as unknown as HandLandmarkerInstance;

        if (isCancelled) {
          try {
            handLandmarker.close();
          } catch {
            // Ignore close error
          }
          return;
        }

        landmarkerRef.current = handLandmarker;
        setIsLoading(false);
      } catch {
        if (isCancelled) return;
        setModelError(
          'Could not load MediaPipe HandLandmarker model (requires network access for WASM/model CDN). You can still use the 3D ISL Skeleton Player in Accessibility.'
        );
        setIsLoading(false);
      }
    }

    void initMediaPipe();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // Ignore close error
        }
        landmarkerRef.current = null;
      }
    };
  }, [isOpen]);

  // Manage webcam lifecycle cleanly (handles permission denial & cancellation race)
  useEffect(() => {
    if (!isOpen) {
      stopCameraTracks();
      return;
    }

    let isCancelled = false;

    async function startCamera() {
      setCameraError(null);
      setCameraState('requesting');

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        if (!isCancelled) {
          setCameraState('denied');
          setCameraError(
            'Camera API (navigator.mediaDevices.getUserMedia) is unavailable in this browser context.'
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });

        // If modal closed while getUserMedia was resolving, immediately stop tracks to avoid camera leak!
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraState('active');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            void videoRef.current?.play().catch(() => {});
          };
        }
      } catch (err) {
        if (isCancelled) return;
        setCameraState('denied');
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError(
            'Webcam permission was denied. Allow camera access in your browser site settings to use live sign recognition.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError('No webcam device was found on this machine.');
        } else {
          setCameraError('Webcam access was denied or is unavailable.');
        }
      }
    }

    void startCamera();

    return () => {
      isCancelled = true;
      stopCameraTracks();
    };
  }, [isOpen, stopCameraTracks]);

  const classifyHandGestures = useCallback(
    (landmarksList: LandmarkPoint[][]): { sign: string; conf: number } => {
      if (!landmarksList || landmarksList.length === 0) {
        return { sign: 'Ready', conf: 0 };
      }

      const hand1 = landmarksList[0];
      const isFingerExtended = (tipIdx: number, pipIdx: number) => hand1[tipIdx].y < hand1[pipIdx].y;

      const thumbExtended = hand1[4].x < hand1[3].x;
      const indexExtended = isFingerExtended(8, 6);
      const middleExtended = isFingerExtended(12, 10);
      const ringExtended = isFingerExtended(16, 14);
      const pinkyExtended = isFingerExtended(20, 18);

      const count = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

      if (landmarksList.length >= 2) {
        const hand2 = landmarksList[1];
        const h1Index = hand1[8];
        const h2Index = hand2[8];
        const dist = Math.hypot(h1Index.x - h2Index.x, h1Index.y - h2Index.y);

        if (dist < 0.12) return { sign: '+', conf: 0.92 };

        const h1Wrist = hand1[0];
        const h2Wrist = hand2[0];
        const yDiff = Math.abs(h1Index.y - h2Index.y);
        if (yDiff < 0.08 && Math.abs(h1Wrist.x - h2Wrist.x) > 0.15) return { sign: '=', conf: 0.88 };

        const wristDist = Math.hypot(h1Wrist.x - h2Wrist.x, h1Wrist.y - h2Wrist.y);
        if (wristDist < 0.15) return { sign: '*', conf: 0.85 };
      }

      const indexSlope = Math.abs((hand1[8].y - hand1[5].y) / (hand1[8].x - hand1[5].x + 1e-5));
      if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && indexSlope < 0.6) {
        return { sign: '-', conf: 0.89 };
      }
      if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return { sign: '<', conf: 0.86 };
      }
      if (count === 0 && !thumbExtended) return { sign: '0', conf: 0.88 };
      if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return { sign: '1', conf: 0.94 };
      if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return { sign: '2', conf: 0.95 };
      if (indexExtended && middleExtended && ringExtended && !pinkyExtended) return { sign: '3', conf: 0.92 };
      if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
        return { sign: '4', conf: 0.93 };
      }
      if (count === 4 && thumbExtended) return { sign: '5', conf: 0.95 };

      return { sign: 'Hold gesture...', conf: 0.4 };
    },
    []
  );

  // Frame processing loop
  useEffect(() => {
    if (!isOpen || isLoading || cameraError || modelError || cameraState !== 'active') return;

    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && canvas && landmarker && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          const results = landmarker.detectForVideo(video, performance.now());
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.landmarks && results.landmarks.length > 0) {
            results.landmarks.forEach((landmarks, handIdx) => {
              const color = handIdx === 0 ? '#4cebd8' : '#ffc15e';
              ctx.strokeStyle = color;
              ctx.lineWidth = 3;
              ctx.shadowColor = color;
              ctx.shadowBlur = 8;

              NEON_BONES.forEach(([i, j]) => {
                const p1 = landmarks[i];
                const p2 = landmarks[j];
                if (p1 && p2) {
                  ctx.beginPath();
                  ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                  ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                  ctx.stroke();
                }
              });

              ctx.fillStyle = '#ffffff';
              landmarks.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.shadowBlur = 0;
            });

            const { sign, conf } = classifyHandGestures(results.landmarks);
            setDetectedSign(sign);
            setConfidence(Math.round(conf * 100));

            if (conf >= 0.85 && sign !== 'Ready' && sign !== 'Hold gesture...') {
              if (sign === lastEmittedSignRef.current) {
                signHoldCountRef.current += 1;
                if (signHoldCountRef.current === 20) {
                  soundEffects.playClick(620, 0.08);
                  setRecentSigns((prev) => [...prev.slice(-8), sign]);
                  if (autoInsert) {
                    onRecognizedSign(sign);
                  }
                }
              } else {
                lastEmittedSignRef.current = sign;
                signHoldCountRef.current = 1;
              }
            }
          } else {
            setDetectedSign('Show hand to camera');
            setConfidence(0);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [
    isOpen,
    isLoading,
    cameraError,
    modelError,
    cameraState,
    classifyHandGestures,
    autoInsert,
    onRecognizedSign,
  ]);

  const handleClose = () => {
    stopCameraTracks();
    onClose();
  };

  const handleManualInsert = () => {
    if (
      detectedSign &&
      detectedSign !== 'Ready' &&
      detectedSign !== 'Hold gesture...' &&
      detectedSign !== 'Show hand to camera'
    ) {
      soundEffects.playClick(680, 0.08);
      onRecognizedSign(detectedSign);
      setRecentSigns((prev) => [...prev.slice(-15), detectedSign]);
    }
  };

  const handleDeleteLast = () => {
    soundEffects.playClick(440, 0.06);
    setRecentSigns((prev) => prev.slice(0, -1));
    onDeleteLastSign?.();
  };

  const handleClearAll = () => {
    soundEffects.playClick(320, 0.08);
    setRecentSigns([]);
    onClearSigns?.();
  };

  const handleDeleteAtIndex = (index: number) => {
    soundEffects.playClick(440, 0.06);
    setRecentSigns((prev) => prev.filter((_, i) => i !== index));
    onDeleteLastSign?.();
  };

  if (!isOpen) return null;

  const activeError = cameraError || modelError;

  return (
    <div
      className="math-modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="isl-live-modal-title"
      data-testid="live-isl-modal"
    >
      <div
        className="math-modal-content isl-live-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="math-modal-header">
          <h3 id="isl-live-modal-title">🤟 Live ISL Hand-Gesture Input (Experimental)</h3>
          <button
            type="button"
            className="math-modal-close-btn"
            onClick={handleClose}
            aria-label="Close live ISL recognition modal"
            data-testid="live-isl-close-btn"
          >
            ✕
          </button>
        </div>

        <p className="isl-live-scope-note">
          Uses MediaPipe HandLandmarker heuristics for a limited set of 11 signs (
          <code>0–5</code>, <code>+</code>, <code>-</code>, <code>*</code>, <code>=</code>,{' '}
          <code>&lt;</code>). This is not full continuous ISL translation.
        </p>

        {activeError ? (
          <div className="isl-live-error-box" role="alert" data-testid="live-isl-error">
            <strong>Camera / Vision Unavailable:</strong> {activeError}
          </div>
        ) : (
          <div className="isl-live-video-stage">
            {isLoading && (
              <div className="isl-live-loading-overlay">
                Loading MediaPipe Tasks Vision HandLandmarker...
              </div>
            )}
            <video ref={videoRef} playsInline muted className="isl-live-video" />
            <canvas ref={canvasRef} className="isl-live-canvas-overlay" />

            <div className="isl-live-hud">
              <div>
                <span className="isl-hud-label">DETECTED SYMBOL</span>
                <span className="isl-hud-value" data-testid="live-isl-detected-sign">
                  {detectedSign}
                </span>
                {confidence > 0 && <span className="isl-hud-conf">({confidence}%)</span>}
              </div>

              <div className="isl-hud-actions">
                <button
                  type="button"
                  className="isl-hud-btn secondary"
                  onClick={handleDeleteLast}
                  title="Delete last inserted sign"
                >
                  ⌫ Backspace
                </button>
                <button
                  type="button"
                  className="isl-hud-btn primary"
                  onClick={handleManualInsert}
                  disabled={
                    !detectedSign ||
                    detectedSign === 'Ready' ||
                    detectedSign === 'Hold gesture...' ||
                    detectedSign === 'Show hand to camera'
                  }
                >
                  + Insert Symbol
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="isl-live-stream-section">
          <div className="isl-live-stream-header">
            <span className="isl-stream-title">Captured Symbol Stream</span>
            <div className="isl-stream-controls">
              {recentSigns.length > 0 && (
                <button type="button" className="isl-clear-link" onClick={handleClearAll}>
                  Clear Stream
                </button>
              )}
              <label className="isl-autoinsert-label">
                <input
                  type="checkbox"
                  checked={autoInsert}
                  onChange={(e) => setAutoInsert(e.target.checked)}
                />
                Auto-insert on hold
              </label>
            </div>
          </div>

          <div className="isl-stream-chips">
            {recentSigns.length === 0 ? (
              <span className="isl-stream-empty">
                No symbols captured yet. Hold a supported hand gesture or close to return to typing.
              </span>
            ) : (
              recentSigns.map((s, idx) => (
                <span key={idx} className="isl-stream-chip">
                  {s}
                  <button
                    type="button"
                    onClick={() => handleDeleteAtIndex(idx)}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="math-modal-footer">
          <div className="isl-current-input-preview">
            Current Input: <code>{currentInput || '(empty)'}</code>
          </div>
          <button
            type="button"
            className="control-btn primary"
            onClick={handleClose}
            data-testid="live-isl-done-btn"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

