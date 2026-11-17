import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { CELESTIAL_OBJECTS } from '../../data/experimentsData';
import { AstronomyTarget } from '../../types/laboratory';
import { soundManager } from '../../audio/SoundManager';
import { Orbit, Play, Pause, Globe, ArrowLeft, Rocket, RotateCw } from 'lucide-react';

interface AstronomyStationProps {
  onBackToLab: () => void;
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const meshLike = obj as THREE.Mesh & THREE.Points;
    if (meshLike.geometry) {
      meshLike.geometry.dispose();
    }
    if (meshLike.material) {
      const materials = Array.isArray(meshLike.material)
        ? meshLike.material
        : [meshLike.material];
      materials.forEach((mat) => {
        for (const value of Object.values(mat)) {
          if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) {
            (value as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      });
    }
  });
}

export const AstronomyStation: React.FC<AstronomyStationProps> = ({ onBackToLab }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedTarget, setSelectedTarget] = useState<AstronomyTarget>(
    CELESTIAL_OBJECTS.find((p) => p.id === 'earth') || CELESTIAL_OBJECTS[3]
  );
  const [viewMode, setViewMode] = useState<'orrery' | 'inspector'>('orrery');
  const [agencyTab, setAgencyTab] = useState<'isro' | 'nasa'>('isro');
  const [orbitSpeed, setOrbitSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Live refs so Three.js scene mounts ONCE and never leaks WebGL contexts on slider/planet updates
  const orbitSpeedRef = useRef(orbitSpeed);
  const isPausedRef = useRef(isPaused);
  const viewModeRef = useRef(viewMode);
  const selectedTargetRef = useRef(selectedTarget);

  useEffect(() => {
    orbitSpeedRef.current = orbitSpeed;
  }, [orbitSpeed]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    selectedTargetRef.current = selectedTarget;
  }, [selectedTarget]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetMeshesRef = useRef<
    Map<string, { mesh: THREE.Mesh; pivot: THREE.Group; speed: number; dist: number; size: number }>
  >(new Map());

  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  const focusCamera = useCallback((mode: 'orrery' | 'inspector', target: AstronomyTarget) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (mode === 'inspector') {
      const targetObj = planetMeshesRef.current.get(target.id);
      if (targetObj) {
        if (target.id === 'sun') {
          camera.position.set(0, 3, 16);
          camera.lookAt(0, 0, 0);
        } else {
          const worldPos = new THREE.Vector3();
          targetObj.mesh.getWorldPosition(worldPos);
          const zoomOffset = Math.max(targetObj.size * 3.6, 5.0);
          camera.position.set(worldPos.x, worldPos.y + 1.2, worldPos.z + zoomOffset);
          camera.lookAt(worldPos);
        }
      }
    } else {
      camera.position.set(0, 36, 68);
      camera.lookAt(0, 0, 0);
      if (sceneRef.current) {
        sceneRef.current.rotation.set(0, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    sceneRef.current = scene;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    camera.position.set(0, 36, 68);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Deep Space Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 800;
      starPositions[i + 1] = (Math.random() - 0.5) * 800;
      starPositions[i + 2] = (Math.random() - 0.5) * 800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Central Sun
    const sunGeo = new THREE.SphereGeometry(4.2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const coronaGeo = new THREE.SphereGeometry(4.8, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(coronaMesh);

    const sunLight = new THREE.PointLight(0xffffff, 3.5, 600, 0.5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x64748b, 0.65);
    scene.add(ambientLight);

    const celestialConfigs = [
      { id: 'sun', name: 'The Sun', size: 4.2, dist: 0, speed: 0, color: 0xffa500, roughness: 0.2 },
      { id: 'mercury', name: 'Mercury', size: 0.8, dist: 8.5, speed: 4.1, color: 0x94a3b8, roughness: 0.8 },
      { id: 'venus', name: 'Venus', size: 1.25, dist: 13, speed: 1.6, color: 0xfbbf24, roughness: 0.5 },
      { id: 'earth', name: 'Earth', size: 1.35, dist: 18, speed: 1.0, color: 0x38bdf8, roughness: 0.4 },
      { id: 'moon', name: 'The Moon', size: 0.65, dist: 21, speed: 1.25, color: 0xe2e8f0, roughness: 0.9 },
      { id: 'mars', name: 'Mars', size: 0.95, dist: 26.5, speed: 0.53, color: 0xef4444, roughness: 0.7 },
      { id: 'jupiter', name: 'Jupiter', size: 3.1, dist: 36.5, speed: 0.22, color: 0xd97706, roughness: 0.5 },
      { id: 'saturn', name: 'Saturn', size: 2.5, dist: 47.5, speed: 0.12, color: 0xfef08a, roughness: 0.5, hasRings: true },
    ];

    const planetMap = planetMeshesRef.current;
    planetMap.clear();

    celestialConfigs.forEach((c) => {
      if (c.dist > 0) {
        const orbitGeo = new THREE.RingGeometry(c.dist - 0.08, c.dist + 0.08, 64);
        const orbitMat = new THREE.MeshBasicMaterial({
          color: 0x334155,
          side: THREE.DoubleSide,
          opacity: 0.4,
          transparent: true,
        });
        const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
        orbitRing.rotation.x = Math.PI / 2;
        scene.add(orbitRing);

        const pivot = new THREE.Group();
        scene.add(pivot);

        const geo = new THREE.SphereGeometry(c.size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
          color: c.color,
          roughness: c.roughness,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(c.dist, 0, 0);
        mesh.userData = { id: c.id };
        pivot.add(mesh);

        if (c.hasRings) {
          const ringGeo = new THREE.RingGeometry(c.size * 1.35, c.size * 2.4, 48);
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0xfde047,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            roughness: 0.5,
          });
          const rings = new THREE.Mesh(ringGeo, ringMat);
          rings.rotation.x = Math.PI / 2.3;
          mesh.add(rings);
        }

        planetMap.set(c.id, { mesh, pivot, speed: c.speed, dist: c.dist, size: c.size });
      } else {
        const sunPivot = new THREE.Group();
        scene.add(sunPivot);
        planetMap.set('sun', { mesh: sunMesh, pivot: sunPivot, speed: 0, dist: 0, size: 4.2 });
      }
    });

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      if (viewModeRef.current === 'orrery') {
        scene.rotation.y += deltaX * 0.005;
        scene.rotation.x = Math.max(-0.6, Math.min(0.6, scene.rotation.x + deltaY * 0.004));
      } else {
        const targetObj = planetMap.get(selectedTargetRef.current.id);
        if (targetObj) {
          targetObj.mesh.rotation.y += deltaX * 0.015;
          targetObj.mesh.rotation.x += deltaY * 0.015;
        }
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      if (!isPausedRef.current && viewModeRef.current === 'orrery') {
        planetMap.forEach((p) => {
          if (p.speed > 0) {
            p.pivot.rotation.y += p.speed * 0.15 * orbitSpeedRef.current * delta;
          }
          p.mesh.rotation.y += 0.6 * delta;
        });
      } else if (viewModeRef.current === 'inspector') {
        const targetObj = planetMap.get(selectedTargetRef.current.id);
        if (targetObj && !isDraggingRef.current) {
          targetObj.mesh.rotation.y += 0.5 * delta;
        }
      }

      sunMesh.rotation.y += 0.15 * delta;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();

      disposeObject3D(scene);
      scene.clear();
      planetMap.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  const handleToggleMode = (mode: 'orrery' | 'inspector') => {
    soundManager.playClick();
    setViewMode(mode);
    focusCamera(mode, selectedTarget);
  };

  const handleSelectPlanet = (target: AstronomyTarget) => {
    soundManager.playClick();
    setSelectedTarget(target);
    if (viewMode === 'inspector') {
      focusCamera('inspector', target);
    }
  };

  const handleResetCamera = () => {
    soundManager.playClick();
    focusCamera(viewMode, selectedTarget);
  };

  return (
    <div
      data-testid="astronomy-station"
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 flex flex-col pt-16"
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        data-testid="astronomy-canvas-mount"
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Top Space Agency Control Bar */}
      <div className="relative z-20 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onBackToLab();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-bold font-mono tracking-wide transition-all shadow-xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Physics Workshop</span>
          </button>

          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-cyan-500/40 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleToggleMode('orrery')}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'orrery'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" /> 3D Solar System
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('inspector')}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'inspector'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> 3D Planet Inspector
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 text-xs transition-all shadow-xl backdrop-blur-md cursor-pointer"
            title="Reset 3D Camera Angle"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Orbit Speed Controls */}
        <div className="pointer-events-auto bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-3 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsPaused(!isPaused);
            }}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isPaused ? 'Resume Planetary Orbit' : 'Pause Planetary Orbit'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
          </button>
          <span className="text-[11px] text-slate-400 font-mono uppercase">Speed:</span>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.2"
            value={orbitSpeed}
            onChange={(e) => setOrbitSpeed(Number(e.target.value))}
            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-xs font-mono text-cyan-300 font-bold">{orbitSpeed.toFixed(1)}x</span>
        </div>
      </div>

      {/* Bottom Planet Bar & Scientific HUD Card */}
      <div className="relative z-20 mt-auto p-4 sm:p-6 flex flex-col lg:flex-row items-end justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 p-2 rounded-2xl border border-slate-700/80 flex flex-wrap gap-1.5 max-w-2xl shadow-2xl backdrop-blur-md">
          {CELESTIAL_OBJECTS.map((obj) => {
            const isSelected = selectedTarget.id === obj.id;
            return (
              <button
                key={obj.id}
                type="button"
                data-testid={`planet-btn-${obj.id}`}
                onClick={() => handleSelectPlanet(obj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-mono cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-500 shadow-sm"
                  style={{ backgroundColor: obj.color }}
                />
                <span>{obj.name}</span>
              </button>
            );
          })}
        </div>

        {selectedTarget && (
          <div className="pointer-events-auto bg-slate-900/95 p-4 rounded-2xl border border-cyan-500/40 max-w-md w-full shadow-2xl backdrop-blur-md science-fade-in">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: selectedTarget.color }}
                />
                <div>
                  <h3 className="font-black text-lg text-white font-mono tracking-wide leading-none">
                    {selectedTarget.name}
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
                    {selectedTarget.type.toUpperCase()} • REAL TELEMETRY
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {selectedTarget.moonsCount !== undefined ? `${selectedTarget.moonsCount} Moons` : 'Solar Star'}
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              {selectedTarget.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mb-3">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Surface Gravity (g)</span>
                <span className="text-cyan-300 font-bold text-xs">{selectedTarget.gravity || 'N/A'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Escape Velocity</span>
                <span className="text-emerald-300 font-bold text-xs">{selectedTarget.escapeVelocity || 'N/A'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Diameter</span>
                <span className="text-amber-300 font-bold">{selectedTarget.diameter}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Surface Temp</span>
                <span className="text-red-300 font-bold">{selectedTarget.temperature}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Space Agency Archive:
                </span>
                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setAgencyTab('isro');
                    }}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      agencyTab === 'isro'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ISRO
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setAgencyTab('nasa');
                    }}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      agencyTab === 'nasa'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    NASA
                  </button>
                </div>
              </div>

              {agencyTab === 'isro' && (
                <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                  {selectedTarget.isroData ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono">
                        <Rocket className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{selectedTarget.isroData.missionHighlight}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {selectedTarget.isroData.keyAchievement}
                      </p>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      <span className="font-bold text-amber-400">ISRO Deep Space Telemetry:</span> Tracked by ISTRAC and IDSN Byalalu for international planetary flybys.
                    </div>
                  )}
                </div>
              )}

              {agencyTab === 'nasa' && (
                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                  {selectedTarget.nasaData ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 font-mono">
                        <Rocket className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{selectedTarget.nasaData.missionHighlight}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {selectedTarget.nasaData.keyFact}
                      </p>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      NASA Deep Space Network (DSN) planetary science archive.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

