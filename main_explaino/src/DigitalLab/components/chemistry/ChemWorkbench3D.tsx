import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { soundManager } from '../../audio/SoundManager';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { Beaker, Pipette, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface ChemWorkbench3DProps {
  onSelectStation: (station: 'simulator' | 'titration') => void;
  onSwitchToRealistic?: () => void;
}

function disposeThreeScene(root: THREE.Object3D) {
  root.traverse((obj) => {
    const meshLike = obj as THREE.Mesh & THREE.LineSegments;
    if (meshLike.geometry) {
      meshLike.geometry.dispose();
    }
    if (meshLike.material) {
      const mats = Array.isArray(meshLike.material)
        ? meshLike.material
        : [meshLike.material];
      mats.forEach((mat) => {
        for (const val of Object.values(mat)) {
          if (val && typeof val === 'object' && 'isTexture' in val && val.isTexture) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      });
    }
  });
}

export const ChemWorkbench3D: React.FC<ChemWorkbench3DProps> = ({
  onSelectStation,
  onSwitchToRealistic,
}) => {
  const { settings } = useAccessibility();
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredStation, setHoveredStation] = useState<'simulator' | 'titration' | null>(null);

  const hoveredStationRef = useRef<'simulator' | 'titration' | null>(null);
  const isZoomingRef = useRef(false);
  const onSelectStationRef = useRef(onSelectStation);
  const reduceMotionRef = useRef(settings.reduceMotion);

  useEffect(() => {
    hoveredStationRef.current = hoveredStation;
  }, [hoveredStation]);

  useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  }, [onSelectStation]);

  useEffect(() => {
    reduceMotionRef.current = settings.reduceMotion;
  }, [settings.reduceMotion]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050811, 0.04);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 7.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xecfdf5, 2.8);
    mainSpot.position.set(0, 8, 3);
    mainSpot.angle = Math.PI / 4;
    mainSpot.penumbra = 0.6;
    mainSpot.castShadow = true;
    scene.add(mainSpot);

    const greenGlow = new THREE.PointLight(0x10b981, 2.5, 8);
    greenGlow.position.set(-2, 1.2, 0);
    scene.add(greenGlow);

    const cyanGlow = new THREE.PointLight(0x06b6d4, 2.5, 8);
    cyanGlow.position.set(2, 1.8, 0);
    scene.add(cyanGlow);

    // 3D Workbench Table
    const tableGroup = new THREE.Group();

    const tableGeo = new THREE.BoxGeometry(9.5, 0.35, 4.2);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.25,
      metalness: 0.6,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.receiveShadow = true;
    tableGroup.add(tableMesh);

    const rimGeo = new THREE.BoxGeometry(9.6, 0.08, 4.3);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.16;
    tableGroup.add(rimMesh);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    [
      [-4.4, -1.25, -1.8],
      [4.4, -1.25, -1.8],
      [-4.4, -1.25, 1.8],
      [4.4, -1.25, 1.8],
    ].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x070b13, roughness: 0.4, metalness: 0.6 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.5;
    floorMesh.receiveShadow = true;
    tableGroup.add(floorMesh);

    const floorGrid = new THREE.GridHelper(30, 30, 0x10b981, 0x1e293b);
    floorGrid.position.y = -2.48;
    tableGroup.add(floorGrid);

    const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.02, 32);
    const pad1 = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        emissive: 0x059669,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.7,
      })
    );
    pad1.position.set(-2.2, 0.18, 0);
    tableGroup.add(pad1);

    const pad2 = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({
        color: 0x083344,
        emissive: 0x0891b2,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.7,
      })
    );
    pad2.position.set(2.2, 0.18, 0);
    tableGroup.add(pad2);

    scene.add(tableGroup);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
      thickness: 0.2,
      specularIntensity: 1,
    });

    // Station 1: Reaction Simulator Apparatus
    const simGroup = new THREE.Group();
    simGroup.position.set(-2.2, 0.2, 0.2);
    simGroup.name = 'station_simulator';

    const beakerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32, 1, true), glassMat);
    beakerMesh.position.set(-0.8, 0.6, 0.4);
    beakerMesh.castShadow = true;
    simGroup.add(beakerMesh);

    const beakerLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.7, 32),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      })
    );
    beakerLiquid.position.set(-0.8, 0.38, 0.4);
    simGroup.add(beakerLiquid);

    const flaskCone = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.9, 32, 1, true), glassMat);
    const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 32), glassMat);
    flaskCone.position.set(0.6, 0.45, -0.2);
    flaskNeck.position.set(0.6, 1.05, -0.2);
    simGroup.add(flaskCone, flaskNeck);

    const flaskLiquid = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, transparent: true, opacity: 0.85 })
    );
    flaskLiquid.position.set(0.6, 0.26, -0.2);
    simGroup.add(flaskLiquid);

    const rackBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.1, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 })
    );
    rackBase.position.set(-0.4, 0.05, -0.9);
    simGroup.add(rackBase);

    const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 16);
    const tubeLiquidGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 16);
    [0xef4444, 0x3b82f6, 0x10b981, 0xa855f7].forEach((col, idx) => {
      const xOffset = -0.4 + (idx - 1.5) * 0.25;
      const tube = new THREE.Mesh(tubeGeo, glassMat);
      tube.position.set(xOffset, 0.45, -0.9);
      simGroup.add(tube);

      const tubeLiquid = new THREE.Mesh(
        tubeLiquidGeo,
        new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.9 })
      );
      tubeLiquid.position.set(xOffset, 0.3, -0.9);
      simGroup.add(tubeLiquid);
    });

    const burnerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });
    const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.1, 24), burnerMat);
    const burnerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 16), burnerMat);
    burnerBase.position.set(1.4, 0.05, 0.5);
    burnerPipe.position.set(1.4, 0.4, 0.5);
    simGroup.add(burnerBase, burnerPipe);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.35, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    flameMesh.position.set(1.4, 0.85, 0.5);
    simGroup.add(flameMesh);

    const bottleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.55, 16);
    const amberBottleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.3 });
    [-1.5, -1.0, 1.4].forEach((bx) => {
      const bottle = new THREE.Mesh(bottleGeo, amberBottleMat);
      bottle.position.set(bx, 0.28, -1.2);
      simGroup.add(bottle);
    });

    scene.add(simGroup);

    // Station 2: Acid-Base Titration Apparatus
    const titrGroup = new THREE.Group();
    titrGroup.position.set(2.2, 0.2, 0.2);
    titrGroup.name = 'station_titration';

    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), standMat);
    standBase.position.set(-0.2, 0.05, 0);
    standBase.castShadow = true;
    titrGroup.add(standBase);

    const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 16), standMat);
    rodMesh.position.set(-0.6, 1.45, 0);
    titrGroup.add(rodMesh);

    const clampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), standMat);
    clampMesh.position.set(-0.35, 2.1, 0);
    titrGroup.add(clampMesh);

    const buretteMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.8, 24), glassMat);
    buretteMesh.position.set(-0.1, 1.85, 0);
    titrGroup.add(buretteMesh);

    const buretteLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 1.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    buretteLiquid.position.set(-0.1, 1.6, 0);
    titrGroup.add(buretteLiquid);

    const stopcock = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xd97706 })
    );
    stopcock.position.set(-0.1, 0.9, 0);
    titrGroup.add(stopcock);

    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.04, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 })
    );
    tile.position.set(-0.1, 0.12, 0);
    titrGroup.add(tile);

    const titrFlaskCone = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.7, 32, 1, true), glassMat);
    const titrFlaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 32), glassMat);
    titrFlaskCone.position.set(-0.1, 0.45, 0);
    titrFlaskNeck.position.set(-0.1, 0.88, 0);
    titrGroup.add(titrFlaskCone, titrFlaskNeck);

    const titrLiquid = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.38, 32),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, transparent: true, opacity: 0.85, roughness: 0.2 })
    );
    titrLiquid.position.set(-0.1, 0.28, 0);
    titrGroup.add(titrLiquid);

    const dropper = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.65, 16), glassMat);
    dropper.rotation.z = Math.PI / 4;
    dropper.position.set(0.65, 0.35, -0.4);
    titrGroup.add(dropper);

    const washBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    washBottle.position.set(0.9, 0.32, 0.2);
    titrGroup.add(washBottle);

    scene.add(titrGroup);

    // Raycasting & Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const triggerZoomIn = (station: 'simulator' | 'titration') => {
      if (isZoomingRef.current) return;
      isZoomingRef.current = true;
      soundManager.playDoorSlide();

      if (reduceMotionRef.current) {
        onSelectStationRef.current(station);
        return;
      }

      const targetX = station === 'simulator' ? -2.2 : 2.2;
      gsap.to(camera.position, {
        x: targetX,
        y: 1.0,
        z: 2.4,
        duration: 0.9,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(targetX, 0.6, 0);
        },
        onComplete: () => {
          onSelectStationRef.current(station);
        },
      });
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const simIntersects = raycaster.intersectObjects(simGroup.children, true);
      const titrIntersects = raycaster.intersectObjects(titrGroup.children, true);

      if (simIntersects.length > 0) {
        setHoveredStation('simulator');
        container.style.cursor = 'pointer';
      } else if (titrIntersects.length > 0) {
        setHoveredStation('titration');
        container.style.cursor = 'pointer';
      } else {
        setHoveredStation(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      if (isZoomingRef.current) return;
      raycaster.setFromCamera(mouse, camera);
      const simIntersects = raycaster.intersectObjects(simGroup.children, true);
      const titrIntersects = raycaster.intersectObjects(titrGroup.children, true);

      if (simIntersects.length > 0) {
        triggerZoomIn('simulator');
      } else if (titrIntersects.length > 0) {
        triggerZoomIn('titration');
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      flameMesh.scale.y = 1.0 + Math.sin(elapsedTime * 15) * 0.18;
      flameMesh.scale.x = 1.0 + Math.cos(elapsedTime * 18) * 0.12;

      if (hoveredStationRef.current === 'simulator') {
        simGroup.position.y = 0.2 + Math.sin(elapsedTime * 4) * 0.03;
      } else {
        simGroup.position.y = THREE.MathUtils.lerp(simGroup.position.y, 0.2, 0.1);
      }

      if (hoveredStationRef.current === 'titration') {
        titrGroup.position.y = 0.2 + Math.sin(elapsedTime * 4) * 0.03;
      } else {
        titrGroup.position.y = THREE.MathUtils.lerp(titrGroup.position.y, 0.2, 0.1);
      }

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
      gsap.killTweensOf(camera.position);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);

      disposeThreeScene(scene);
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      data-testid="chemistry-workbench-3d"
      className="relative w-full h-full overflow-hidden select-none bg-slate-950"
    >
      <img
        src="/science-assets/futuristic_chem_lab.jpg"
        alt="Futuristic Chemistry Laboratory Room"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-45 brightness-90 blur-[0.5px]"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/75" />

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        data-testid="chem-3d-canvas-mount"
        className="relative z-10 w-full h-full cursor-default"
      />

      {/* Floating 3D Station HUD Beacons */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <button
          type="button"
          data-testid="chem-3d-beacon-simulator"
          style={{ left: '26%', top: '34%' }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-auto cursor-pointer ${
            hoveredStation === 'simulator' ? 'scale-110' : 'scale-100 opacity-90'
          }`}
          onClick={() => onSelectStation('simulator')}
        >
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Beaker className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span className="font-mono font-black text-xs uppercase tracking-wider text-white">
                STATION 1: REACTION SIMULATOR
              </span>
            </div>
            <p className="text-[10px] font-mono text-emerald-300">
              Free Mixing • Beakers • Gas &amp; Precipitate Reactions
            </p>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-950 bg-emerald-400 px-2 py-0.5 rounded-full shadow">
              Step Up <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        <button
          type="button"
          data-testid="chem-3d-beacon-titration"
          style={{ left: '74%', top: '34%' }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-auto cursor-pointer ${
            hoveredStation === 'titration' ? 'scale-110' : 'scale-100 opacity-90'
          }`}
          onClick={() => onSelectStation('titration')}
        >
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Pipette className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span className="font-mono font-black text-xs uppercase tracking-wider text-white">
                STATION 2: ACID-BASE TITRATION
              </span>
            </div>
            <p className="text-[10px] font-mono text-cyan-300">
              Burette Setup • Color Endpoint • Molarity Calculations
            </p>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-950 bg-cyan-400 px-2 py-0.5 rounded-full shadow">
              Step Up <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3 px-5 py-2 rounded-full bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-300 backdrop-blur-md shadow-2xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Interactive Three.js 3D Workbench — Click apparatus or beacons to experiment</span>
        {onSwitchToRealistic && (
          <>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onSwitchToRealistic();
              }}
              className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-bold cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Realistic View</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

