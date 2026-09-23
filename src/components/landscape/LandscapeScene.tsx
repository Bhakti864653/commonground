"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  ISLAND_RADIUS,
  UNASSIGNED_POSITION,
  markerPosition,
  neighborhoodFor,
  type Vec2,
} from "@/lib/landscape/layout";
import { markerColorForCase } from "@/lib/pulse/marker-color";
import type { AreaConfig } from "@/lib/schema/community";
import type { PublicCase } from "@/lib/schema/report";
import type { Theme } from "@/lib/theme/theme";

/** WebGL can't read CSS variables, so the scene keeps its own copies of the palette tokens. */
const PALETTE = {
  light: {
    sky: "#fbf6ea",
    meadow: "#b7d69c",
    meadowEdge: "#9fc184",
    soil: "#d9c7a3",
    street: "#f3e9d2",
    plaza: "#f6ecd2",
    water: "#3fb3a6",
    zone: "#0e5e57",
    walls: ["#fffaf0", "#f4ead3", "#e3eef2"],
    roofs: ["#2e5b3b", "#0e5e57", "#c99a3a"],
    hallRoof: "#0e5e57",
    trunk: "#8a6a48",
    canopy: ["#2e5b3b", "#3f7a4b"],
    label: "#13261f",
    hemiSky: "#fffaf0",
    hemiGround: "#9fc184",
  },
  dark: {
    sky: "#0f1a16",
    meadow: "#2b4a33",
    meadowEdge: "#223d2a",
    soil: "#3d372a",
    street: "#566457",
    plaza: "#5d6a52",
    water: "#45c9bb",
    zone: "#5cc2b4",
    walls: ["#d9d3c2", "#c7c0ab", "#b7c7cc"],
    roofs: ["#4d8a5a", "#2f7d73", "#b8913e"],
    hallRoof: "#2f7d73",
    trunk: "#5c4a36",
    canopy: ["#3f6e49", "#4f8559"],
    label: "#e8efe9",
    hemiSky: "#9fb8c9",
    hemiGround: "#2b4a33",
  },
} as const;

type Palette = (typeof PALETTE)[Theme];

/** The slice of drei's OrbitControls instance this scene touches. */
type OrbitControlsLike = { target: THREE.Vector3; update: () => void };

export type LandscapeArea = { area: AreaConfig; center: Vec2; label: string; count: number };

/* ------------------------------------------------------------------ geometry helpers */

/** An organic parcel of land: a circle whose radius breathes with a few slow harmonics. */
function islandShape(): THREE.Shape {
  const points: THREE.Vector2[] = [];
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = ISLAND_RADIUS * (1 + 0.06 * Math.sin(a * 3 + 0.6) + 0.035 * Math.cos(a * 5 + 1.3));
    points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  shape.splineThru([...points.slice(1), points[0]]);
  return shape;
}

/** A flat ribbon following a curve on the ground — streets and the drainage channel. */
function ribbonGeometry(curve: THREE.Curve<THREE.Vector3>, width: number, segments = 48): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
    positions.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
    if (i < segments) {
      const k = i * 2;
      // Wound counter-clockwise seen from above, so the ribbon faces up (not back-face culled).
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Hand-built geometries aren't disposed automatically when passed as a prop (only JSX-declared
 * ones are), so build once per input and dispose on change/unmount.
 */
function useDisposeOnChange(value: { dispose: () => void }) {
  useEffect(() => () => value.dispose(), [value]);
}

const GROUND_Y = 0.02;

/* ------------------------------------------------------------------ scene pieces */

function Island({ palette }: { palette: Palette }) {
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(islandShape(), {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.14,
      bevelSegments: 3,
      curveSegments: 64,
    });
    g.rotateX(-Math.PI / 2);
    // depth + bevelThickness puts the top face at y = 0, where streets and zones are drawn.
    g.translate(0, -0.82, 0);
    return g;
  }, []);
  useDisposeOnChange(geometry);

  return (
    <mesh geometry={geometry} receiveShadow>
      {/* ExtrudeGeometry groups: 0 = caps (the meadow top), 1 = sides (the soil edge). */}
      <meshStandardMaterial attach="material-0" color={palette.meadow} roughness={1} />
      <meshStandardMaterial attach="material-1" color={palette.soil} roughness={1} />
    </mesh>
  );
}

function Street({ from, to, bend, palette }: { from: Vec2; to: Vec2; bend: number; palette: Palette }) {
  const [fx, fz] = from;
  const [tx, tz] = to;
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3((fx + tx) / 2, GROUND_Y + 0.01, (fz + tz) / 2);
    mid.x += -(tz - fz) * bend;
    mid.z += (tx - fx) * bend;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fx, GROUND_Y + 0.01, fz),
      mid,
      new THREE.Vector3(tx, GROUND_Y + 0.01, tz),
    ]);
    return ribbonGeometry(curve, 0.55);
  }, [fx, fz, tx, tz, bend]);
  useDisposeOnChange(geometry);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={palette.street} roughness={1} />
    </mesh>
  );
}

/** The drainage channel: the reason half the reports here exist, so it's a real landmark. */
function DrainageChannel({ palette }: { palette: Palette }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        [-8.6, 0, -3.4],
        [-5.2, 0, -2.2],
        [-2.8, 0, -3.3],
        [1.6, 0, -2.4],
        [3.2, 0, 1.8],
        [2.4, 0, 3.6],
        [3.9, 0, 7.8],
      ].map(([x, y, z]) => new THREE.Vector3(x, GROUND_Y + 0.025 + y, z)),
    );
    return ribbonGeometry(curve, 0.42, 96);
  }, []);
  useDisposeOnChange(geometry);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={palette.water} roughness={0.25} metalness={0.1} />
    </mesh>
  );
}

function House({ position, rotation, scale, wall, roof }: { position: Vec2; rotation: number; scale: number; wall: string; roof: string }) {
  return (
    <group position={[position[0], GROUND_Y, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.62, 0.56, 0.52]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.52, 0.4, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function Tree({ position, scale, canopy, trunk }: { position: Vec2; scale: number; canopy: string; trunk: string }) {
  return (
    <group position={[position[0], GROUND_Y, position[1]]} scale={scale}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.4, 6]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={canopy} roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Plaza({ palette, hallLabel, plazaLabel }: { palette: Palette; hallLabel: string; plazaLabel: string }) {
  return (
    <group>
      <mesh position={[0, GROUND_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.25, 40]} />
        <meshStandardMaterial color={palette.plaza} roughness={1} />
      </mesh>
      {/* A kiosk at the heart of the plaza — the same sunlit center as the logo. */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.6, 12]} />
        <meshStandardMaterial color={palette.walls[0]} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.5, 0.32, 12]} />
        <meshStandardMaterial color="#f2b92a" roughness={0.7} />
      </mesh>
      {/* Community hall, north-east of the plaza. */}
      <group position={[1.9, GROUND_Y, -1.45]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[1.5, 0.84, 0.9]} />
          <meshStandardMaterial color={palette.walls[1]} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 1.6, 3]} />
          <meshStandardMaterial color={palette.hallRoof} roughness={0.8} flatShading />
        </mesh>
        <Html position={[0, 1.7, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <span className="whitespace-nowrap rounded-full bg-surface/90 px-2 py-0.5 text-[11px] text-ink shadow-sm">
            {hallLabel}
          </span>
        </Html>
      </group>
      <Html position={[-1.4, 0.2, 0.9]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap text-[11px] font-medium text-ink/80">{plazaLabel}</span>
      </Html>
    </group>
  );
}

function Neighborhood({ area, palette }: { area: LandscapeArea; palette: Palette }) {
  const { houses, trees } = useMemo(
    () => neighborhoodFor(area.area.id, area.center, area.area.id === "centro" ? 0 : 7),
    [area.area.id, area.center],
  );
  return (
    <group>
      {houses.map((house, i) => (
        <House
          key={i}
          position={house.position}
          rotation={house.rotation}
          scale={house.scale}
          wall={palette.walls[house.tone]}
          roof={palette.roofs[house.tone]}
        />
      ))}
      {trees.map((tree, i) => (
        <Tree key={i} position={tree.position} scale={tree.scale} canopy={palette.canopy[i % 2]} trunk={palette.trunk} />
      ))}
    </group>
  );
}

function AreaZone({
  area,
  selected,
  palette,
  onSelect,
}: {
  area: LandscapeArea;
  selected: boolean;
  palette: Palette;
  onSelect: (areaId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const opacity = selected ? 0.3 : hovered ? 0.2 : 0.09;
  return (
    <group position={[area.center[0], GROUND_Y + 0.015, area.center[1]]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(area.area.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <circleGeometry args={[area.area.id === "centro" ? 1.7 : 2.9, 48]} />
        <meshBasicMaterial color={palette.zone} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[area.area.id === "centro" ? 1.62 : 2.8, area.area.id === "centro" ? 1.72 : 2.92, 64]} />
          <meshBasicMaterial color={palette.zone} />
        </mesh>
      )}
      <Html
        position={[0, 0.1, area.area.id === "centro" ? -2.1 : area.center[1] < 0 ? -3.3 : 3.3]}
        center
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${
            selected ? "bg-teal text-cream" : "bg-surface/90 text-ink"
          }`}
        >
          {area.label}
        </span>
      </Html>
    </group>
  );
}

function Marker({
  caseItem,
  position,
  theme,
  selected,
  dimmed,
  onSelect,
}: {
  caseItem: PublicCase;
  position: Vec2;
  theme: Theme;
  selected: boolean;
  dimmed: boolean;
  onSelect: (c: PublicCase) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = markerColorForCase(caseItem, theme);
  const lift = selected ? 0.25 : hovered ? 0.15 : 0;
  const scale = selected ? 1.35 : hovered ? 1.15 : 1;

  return (
    <group position={[position[0], GROUND_Y, position[1]]}>
      <mesh
        position={[0, 0.9 + lift, 0]}
        scale={scale}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(caseItem);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        {/* Shape carries meaning too, not just color: reports are round lanterns, proposals are seeds. */}
        {caseItem.type === "proposal" ? <octahedronGeometry args={[0.26, 0]} /> : <sphereGeometry args={[0.22, 20, 20]} />}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.55 : 0.25}
          roughness={0.35}
          transparent={dimmed}
          opacity={dimmed ? 0.35 : 1}
          flatShading={caseItem.type === "proposal"}
        />
      </mesh>
      <mesh position={[0, 0.4 + lift / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.8 + lift, 6]} />
        <meshStandardMaterial color={color} transparent opacity={dimmed ? 0.25 : 0.7} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.32, 0.42, 32]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Glides the orbit target toward the selected area — motion that answers a person's own click.
 * Pan is clamped so the town can never be dragged out of view.
 */
function CameraRig({ focus }: { focus: Vec2 | null }) {
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsLike | null;
  const invalidate = useThree((state) => state.invalidate);
  const goal = useMemo(() => new THREE.Vector3(focus?.[0] ?? 0, 0, focus?.[1] ?? 0), [focus]);
  // Glide only right after the selection changes — never fight a person who is panning.
  const gliding = useRef(false);

  useEffect(() => {
    gliding.current = true;
    invalidate();
  }, [goal, invalidate]);

  useFrame(() => {
    if (!controls || !gliding.current) return;
    const target = controls.target;
    if (target.distanceTo(goal) > 0.02) {
      target.lerp(goal, 0.14);
      controls.update();
      invalidate();
    } else {
      gliding.current = false;
    }
  });

  return null;
}

/**
 * Frames the whole island for the container's shape: a tall phone-width canvas needs the
 * camera further back than a wide desktop one. Runs only when the shape changes, never while
 * someone is orbiting.
 */
function CameraFit() {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const invalidate = useThree((state) => state.invalidate);
  const bucket = aspect < 0.9 ? "tall" : aspect < 1.4 ? "square" : "wide";

  useEffect(() => {
    const distance = bucket === "tall" ? 38 : bucket === "square" ? 31 : 24;
    camera.position.set(0, distance * 0.66, distance * 0.76);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [bucket, camera, invalidate]);

  return null;
}

/* ------------------------------------------------------------------ the scene */

export function LandscapeScene({
  areas,
  cases,
  theme,
  selectedAreaId,
  selectedCaseId,
  onSelectArea,
  onSelectCase,
  labels,
}: {
  areas: LandscapeArea[];
  cases: PublicCase[];
  theme: Theme;
  selectedAreaId: string | null;
  selectedCaseId: string | null;
  onSelectArea: (areaId: string | null) => void;
  onSelectCase: (c: PublicCase | null) => void;
  labels: { plaza: string; hall: string };
}) {
  const palette = PALETTE[theme];
  const controlsRef = useRef<OrbitControlsLike>(null);

  const centerById = useMemo(() => new Map(areas.map((a) => [a.area.id, a.center])), [areas]);
  const markers = useMemo(
    () =>
      cases.map((c) => {
        const center = (c.approximateArea.areaId && centerById.get(c.approximateArea.areaId)) || UNASSIGNED_POSITION;
        return { caseItem: c, position: markerPosition(c.id, center) };
      }),
    [cases, centerById],
  );
  const focus = selectedAreaId ? centerById.get(selectedAreaId) ?? null : null;

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [0, 12.5, 14.5], fov: 38 }}
      onPointerMissed={() => {
        onSelectCase(null);
      }}
      aria-hidden="true"
    >
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.sky, 26, 44]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, theme === "dark" ? 0.8 : 0.8]} />
      <CameraFit />
      <directionalLight
        position={[7, 12, 5]}
        intensity={theme === "dark" ? 0.95 : 1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />

      <Island palette={palette} />
      <DrainageChannel palette={palette} />
      {areas
        .filter((a) => a.area.id !== "centro")
        .map((a, i) => (
          <Street key={a.area.id} from={[0, 0]} to={a.center} bend={i % 2 === 0 ? 0.12 : -0.12} palette={palette} />
        ))}
      <Plaza palette={palette} hallLabel={labels.hall} plazaLabel={labels.plaza} />

      {areas.map((a) => (
        <group key={a.area.id}>
          <Neighborhood area={a} palette={palette} />
          <AreaZone
            area={a}
            selected={selectedAreaId === a.area.id}
            palette={palette}
            onSelect={(id) => onSelectArea(selectedAreaId === id ? null : id)}
          />
        </group>
      ))}

      {markers.map(({ caseItem, position }) => (
        <Marker
          key={caseItem.id}
          caseItem={caseItem}
          position={position}
          theme={theme}
          selected={selectedCaseId === caseItem.id}
          dimmed={selectedAreaId !== null && caseItem.approximateArea.areaId !== selectedAreaId}
          onSelect={onSelectCase}
        />
      ))}

      <OrbitControls
        // drei's ref type is the full three-stdlib class; this scene only needs target/update.
        ref={controlsRef as never}
        makeDefault
        enableDamping={false}
        enablePan
        screenSpacePanning={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.12}
        minDistance={9}
        maxDistance={34}
        onChange={() => {
          const target = controlsRef.current?.target;
          if (target && Math.hypot(target.x, target.z) > 6) {
            target.setLength(6);
          }
        }}
      />
      <CameraRig focus={focus} />
    </Canvas>
  );
}
