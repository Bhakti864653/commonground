"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { areaPosition, caseOffset } from "@/lib/pulse/layout";
import { markerColorForCase } from "@/lib/pulse/marker-color";
import type { AreaConfig } from "@/lib/schema/community";
import type { PublicCase } from "@/lib/schema/report";

type Marker = { caseItem: PublicCase; position: [number, number, number]; color: string };

function buildMarkers(cases: PublicCase[], areas: AreaConfig[]): Marker[] {
  const areaIndexById = new Map(areas.map((a, i) => [a.id, i]));
  return cases.map((caseItem) => {
    const areaIndex = areaIndexById.get(caseItem.approximateArea.areaId ?? "") ?? areas.length;
    const [baseX, , baseZ] = areaPosition(areaIndex, areas.length + 1); // +1 slot for "no area"
    const [dx, dz] = caseOffset(caseItem.id);
    return {
      caseItem,
      position: [baseX + dx, 0.35, baseZ + dz],
      color: markerColorForCase(caseItem),
    };
  });
}

function AreaZone({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.2, 24]} />
      <meshStandardMaterial color="#dff1ec" roughness={1} />
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
  const markers = useMemo(() => buildMarkers(cases, areas), [cases, areas]);
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
      <color attach="background" args={["#faf8f3"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color="#f4f1ea" roughness={1} />
      </mesh>

      {zonePositions.map((pos, i) => (
        <AreaZone key={areas[i]?.id ?? i} position={pos} />
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
