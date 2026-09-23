"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { areaPosition, caseOffset } from "@/lib/pulse/layout";
import { markerColorForCase } from "@/lib/pulse/marker-color";
import type { AreaConfig } from "@/lib/schema/community";
import type { PublicCase } from "@/lib/schema/report";
import { useTheme } from "@/lib/theme/use-theme";
import type { Theme } from "@/lib/theme/theme";

// WebGL can't read CSS variables, so the scene keeps its own light/dark copies of the tokens.
const SCENE_COLORS = {
  light: { background: "#faf8f3", ground: "#f4f1ea", zone: "#dff1ec" },
  dark: { background: "#121a21", ground: "#2a3a47", zone: "#1f4a45" },
} as const;

type Marker = { caseItem: PublicCase; position: [number, number, number]; color: string };

function buildMarkers(cases: PublicCase[], areas: AreaConfig[], theme: Theme): Marker[] {
  const areaIndexById = new Map(areas.map((a, i) => [a.id, i]));
  return cases.map((caseItem) => {
    const areaIndex = areaIndexById.get(caseItem.approximateArea.areaId ?? "") ?? areas.length;
    const [baseX, , baseZ] = areaPosition(areaIndex, areas.length + 1); // +1 slot for "no area"
    const [dx, dz] = caseOffset(caseItem.id);
    return {
      caseItem,
      position: [baseX + dx, 0.35, baseZ + dz],
      color: markerColorForCase(caseItem, theme),
    };
  });
}

function AreaZone({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.2, 24]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function CaseMarker({ marker, onSelect }: { marker: Marker; onSelect: (c: PublicCase) => void }) {
  return (
    <mesh
      position={marker.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(marker.caseItem);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[0.32, 16, 16]} />
      <meshStandardMaterial color={marker.color} roughness={0.5} />
    </mesh>
  );
}

/**
 * Only ever mounted when both WebGL is supported and the visitor hasn't asked for reduced
 * motion (gated by the parent, `CommunityPulse.tsx`) — matching this project's own established
 * pattern (see Concord's landing hero) of never trying to build a "partially reduced" 3D
 * scene, just showing the plain list fallback instead. Nothing here auto-rotates or animates
 * on its own; every camera movement is user-initiated.
 */
export function CommunityPulseScene({
  cases,
  areas,
  onSelect,
}: {
  cases: PublicCase[];
  areas: AreaConfig[];
  onSelect: (c: PublicCase) => void;
}) {
  const { theme } = useTheme();
  const sceneTheme: Theme = theme === "dark" ? "dark" : "light";
  const colors = SCENE_COLORS[sceneTheme];
  const markers = useMemo(() => buildMarkers(cases, areas, sceneTheme), [cases, areas, sceneTheme]);
  const zonePositions = useMemo(
    () => areas.map((_, i) => areaPosition(i, areas.length + 1)),
    [areas],
  );

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 9, 13], fov: 45 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color={colors.ground} roughness={1} />
      </mesh>

      {zonePositions.map((pos, i) => (
        <AreaZone key={areas[i]?.id ?? i} position={pos} color={colors.zone} />
      ))}

      {markers.map((marker) => (
        <CaseMarker key={marker.caseItem.id} marker={marker} onSelect={onSelect} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={6}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate={false}
      />
    </Canvas>
  );
}
