import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../utils/soundEffects';

interface LiveISLRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognizedSign: (sign: string) => void;
  onDeleteLastSign?: () => void;
  onClearSigns?: () => void;
  currentInput?: string;
}

const NEON_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

export const LiveISLRecognitionModal: React.FC<LiveISLRecognitionModalProps> = ({
  isOpen,
  onClose,
  onRecognizedSign,
  onDeleteLastSign,
  onClearSigns,
  currentInput = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedSign, setDetectedSign] = useState<string>('Ready');
  const [confidence, setConfidence] = useState<number>(0);
  const [recentSigns, setRecentSigns] = useState<string[]>([]);
  const [autoInsert, setAutoInsert] = useState<boolean>(false);
  const lastEmittedSignRef = useRef<string>('');
  const signHoldCountRef = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });

        if (isCancelled) return;
        landmarkerRef.current = handLandmarker;
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load MediaPipe HandLandmarker:', err);
        setErrorMsg('Could not load camera vision models. Falling back to gesture presets.');
        setIsLoading(false);
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch (e) {}
        landmarkerRef.current = null;
      }
    };
  }, [isOpen]);

  // Start webcam stream
  useEffect(() => {
    if (!isOpen) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      } catch (err: any) {
        console.error('Webcam permission error:', err);
        setErrorMsg('Webcam access was denied or is unavailable.');
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Rule-based and heuristic ISL mathematical gesture classifier
  const classifyHandGestures = useCallback((landmarksList: any[]): { sign: string; conf: number } => {
    if (!landmarksList || landmarksList.length === 0) {
      return { sign: 'Ready', conf: 0 };
    }

    const hand1 = landmarksList[0];
    const isFingerExtended = (tipIdx: number, pipIdx: number) => {
      return hand1[tipIdx].y < hand1[pipIdx].y;
    };

    const thumbExtended = hand1[4].x < hand1[3].x; // mirror adjusted
    const indexExtended = isFingerExtended(8, 6);
    const middleExtended = isFingerExtended(12, 10);
    const ringExtended = isFingerExtended(16, 14);
    const pinkyExtended = isFingerExtended(20, 18);

    const count = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Two hands present: Operator recognition (+, =, *)
    if (landmarksList.length >= 2) {
      const hand2 = landmarksList[1];
      const h1Index = hand1[8];
      const h2Index = hand2[8];
      const dist = Math.hypot(h1Index.x - h2Index.x, h1Index.y - h2Index.y);

      // Crossed index fingers: PLUS (+)
      if (dist < 0.12) {
        return { sign: '+', conf: 0.92 };
      }

      // Parallel horizontal fingers: EQUALS (=)
      const h1Wrist = hand1[0];
      const h2Wrist = hand2[0];
      const yDiff = Math.abs(h1Index.y - h2Index.y);
      if (yDiff < 0.08 && Math.abs(h1Wrist.x - h2Wrist.x) > 0.15) {
        return { sign: '=', conf: 0.88 };
      }

      // Crossed wrists: TIMES (*)
      const wristDist = Math.hypot(h1Wrist.x - h2Wrist.x, h1Wrist.y - h2Wrist.y);
      if (wristDist < 0.15) {
        return { sign: '*', conf: 0.85 };
      }
    }

    // Single hand operators and digits
    // Horizontal single index: MINUS (-)
    const indexSlope = Math.abs((hand1[8].y - hand1[5].y) / (hand1[8].x - hand1[5].x + 1e-5));
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && indexSlope < 0.6) {
      return { sign: '-', conf: 0.89 };
    }

    // Index and thumb acute angle: LESS_THAN (<) or L
    if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { sign: '<', conf: 0.86 };
    }

    // Fist: ZERO (0)
    if (count === 0 && !thumbExtended) {
      return { sign: '0', conf: 0.88 };
    }

    // 1 Finger: 1
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { sign: '1', conf: 0.94 };
    }

    // 2 Fingers (V): 2
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return { sign: '2', conf: 0.95 };
    }

    // 3 Fingers: 3
    if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
      return { sign: '3', conf: 0.92 };
    }

    // 4 Fingers: 4
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
      return { sign: '4', conf: 0.93 };
    }

    // Open Palm: 5
    if (count === 4 && thumbExtended) {
      return { sign: '5', conf: 0.95 };
    }

    return { sign: 'Hold gesture...', conf: 0.4 };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (!isOpen || isLoading || errorMsg) return;

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
            // Draw neon glowing landmarks
            results.landmarks.forEach((landmarks: any[], handIdx: number) => {
              const color = handIdx === 0 ? '#4cebd8' : '#ffc15e';

              // Draw bones
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

              // Draw points
              ctx.fillStyle = '#ffffff';
              landmarks.forEach((p: any) => {
                ctx.beginPath();
                ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.shadowBlur = 0;
            });

            // Classify gesture
            const { sign, conf } = classifyHandGestures(results.landmarks);
            setDetectedSign(sign);
            setConfidence(Math.round(conf * 100));

            // Auto-insert logic upon stable hold
            if (conf >= 0.85 && sign !== 'Ready' && sign !== 'Hold gesture...') {
              if (sign === lastEmittedSignRef.current) {
                signHoldCountRef.current += 1;
                if (signHoldCountRef.current === 20) {
                  // Locked in (~600ms hold)
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, isLoading, errorMsg, classifyHandGestures, autoInsert, onRecognizedSign]);

  const handleManualInsert = () => {
    if (detectedSign && detectedSign !== 'Ready' && detectedSign !== 'Hold gesture...') {
      soundEffects.playClick(680, 0.08);
      onRecognizedSign(detectedSign);
      setRecentSigns((prev) => [...prev.slice(-15), detectedSign]);
    }
  };

  const handleDeleteLast = () => {
    soundEffects.playClick(440, 0.06);
    setRecentSigns((prev) => prev.slice(0, -1));
    if (onDeleteLastSign) {
      onDeleteLastSign();
    }
  };

  const handleClearAll = () => {
    soundEffects.playClick(320, 0.08);
    setRecentSigns([]);
    if (onClearSigns) {
      onClearSigns();
    }
  };

  const handleDeleteAtIndex = (index: number) => {
    soundEffects.playClick(440, 0.06);
    setRecentSigns((prev) => prev.filter((_, i) => i !== index));
    if (onDeleteLastSign) {
      onDeleteLastSign();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤟</span> Live Indian Sign Language (ISL) Recognition
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {errorMsg ? (
          <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            {errorMsg}
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '340px', background: '#0b1615', borderRadius: '8px', overflow: 'hidden' }}>
            {isLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,22,21,0.9)', color: '#4cebd8', zIndex: 10 }}>
                Loading MediaPipe Tasks Vision AI...
              </div>
            )}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', pointerEvents: 'none' }}
            />

            {/* Live Recognition HUD */}
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.88)', padding: '8px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>RECOGNIZED SIGN</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#4cebd8', fontFamily: 'monospace' }}>
                  {detectedSign}
                </span>
                {confidence > 0 && (
                  <span style={{ fontSize: '11px', color: '#a7f3d0', marginLeft: '8px' }}>
                    ({confidence}% confidence)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDeleteLast}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Delete last inserted sign (Backspace)"
                >
                  ⌫ Backspace
                </button>
                <button
                  type="button"
                  onClick={handleManualInsert}
                  disabled={!detectedSign || detectedSign === 'Ready' || detectedSign === 'Hold gesture...'}
                  style={{
                    background: '#10b981',
                    color: '#0f172a',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  ➕ Insert Symbol
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent sequence strip */}
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Recognized Expression Stream
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {recentSigns.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title="Clear all recognized signs"
                >
                  🗑️ Clear Stream
                </button>
              )}
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoInsert}
                  onChange={(e) => setAutoInsert(e.target.checked)}
                />
                Auto-insert on hold
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minHeight: '34px', background: '#1e293b', padding: '6px 10px', borderRadius: '6px', alignItems: 'center' }}>
            {recentSigns.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>No symbols captured yet. Make a sign or click ➕ to begin.</span>
            ) : (
              recentSigns.map((s, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#047857',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleDeleteAtIndex(idx)}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: 'none',
                      color: '#fecaca',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      lineHeight: '14px',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                    title="Remove this token"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Current Expression Preview & Footer */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Current Input:{' '}
            <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>
              {currentInput || '(empty)'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '7px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

