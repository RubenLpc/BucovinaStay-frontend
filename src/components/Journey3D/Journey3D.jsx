import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html } from "@react-three/drei";

function Trail({ progress = 0.4 }) {
  const geom = useMemo(() => {
    // potecă ca o curbă 3D
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-2.2, 0.15, 1.6),
        new THREE.Vector3(-1.2, 0.10, 0.6),
        new THREE.Vector3(0.0, 0.08, 0.1),
        new THREE.Vector3(1.3, 0.12, -0.7),
        new THREE.Vector3(2.2, 0.18, -1.6),
      ],
      false,
      "catmullrom",
      0.8
    );

    // tub pentru potecă
    return new THREE.TubeGeometry(curve, 120, 0.10, 16, false);
  }, []);

  // “progress” highlight: afișăm 2 tube-uri suprapuse (track + highlight)
  // highlight-ul e simulat prin material + clipping plane (simplu și performant)
  const clipPlane = useMemo(() => {
    // plan care taie în funcție de progress pe axa Z (aproximativ)
    const z = THREE.MathUtils.lerp(2.2, -2.2, progress);
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
  }, [progress]);

  return (
    <group>
      {/* track */}
      <mesh geometry={geom} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={"#dfe7e2"}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* highlight */}
      <mesh geometry={geom} position={[0, 0.001, 0]}>
        <meshStandardMaterial
          color={"#2f855a"}
          roughness={0.6}
          metalness={0.05}
          emissive={"#2f855a"}
          emissiveIntensity={0.25}
          clippingPlanes={[clipPlane]}
          clipIntersection={false}
        />
      </mesh>
    </group>
  );
}

function Mountain({ pos = [0, 0, 0], scale = 1, color = "#d7dfda" }) {
  // low-poly “munte”: icosahedron + noise mic
  const ref = useRef();
  const geom = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = (Math.sin(x * 3) + Math.cos(z * 3)) * 0.05;
      p.setXYZ(i, x, y + n, z);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh ref={ref} geometry={geom} position={pos} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function Pin({ label, pos, active }) {
  return (
    <group position={pos}>
      <Float speed={2} floatIntensity={0.25} rotationIntensity={0.12}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.35, 16]} />
          <meshStandardMaterial
            color={active ? "#2f855a" : "#111827"}
            roughness={0.45}
            metalness={0.1}
            emissive={active ? "#2f855a" : "#000000"}
            emissiveIntensity={active ? 0.2 : 0}
          />
        </mesh>

        <mesh position={[0, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.10, 18, 18]} />
          <meshStandardMaterial
            color={active ? "#2f855a" : "#ffffff"}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>

        {/* etichetă (HTML) — discret */}
        <Html
          position={[0.22, 0.33, 0]}
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: active ? "#2f855a" : "#111827",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(17,24,39,0.10)",
            padding: "4px 8px",
            borderRadius: "999px",
            backdropFilter: "blur(10px)",
            whiteSpace: "nowrap",
            boxShadow: "0 10px 24px rgba(17,24,39,0.08)",
          }}
          transform
          occlude
        >
          {label}
        </Html>
      </Float>
    </group>
  );
}

function Scene({ activeIndex = 0, stepsCount = 5 }) {
  const group = useRef();

  // progres 0..1 pe baza pasului activ
  const progress = stepsCount <= 1 ? 1 : activeIndex / (stepsCount - 1);

  useFrame((state) => {
    // mișcare super subtilă, ca produs real
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.25) * 0.08;
      group.current.rotation.x = Math.sin(t * 0.18) * 0.03;
    }
  });

  // poziții pini pe traseu (aproximativ)
  const pinPositions = useMemo(
    () => [
      [-2.1, 0.22, 1.5],
      [-1.0, 0.18, 0.6],
      [0.0, 0.16, 0.1],
      [1.2, 0.18, -0.7],
      [2.1, 0.22, -1.5],
    ],
    []
  );

  return (
    <group ref={group}>
      {/* lumină */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* teren */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={"#ffffff"} roughness={1} />
      </mesh>

      {/* munți */}
      <Mountain pos={[-2.6, 0.9, -1.6]} scale={1.6} color="#dfe7e2" />
      <Mountain pos={[-1.2, 0.75, -2.3]} scale={1.15} color="#e7efe9" />
      <Mountain pos={[2.4, 0.85, -1.9]} scale={1.45} color="#dde6e0" />
      <Mountain pos={[1.0, 0.65, -2.7]} scale={1.05} color="#e9f1eb" />

      {/* potecă */}
      <Trail progress={progress} />

      {/* pini */}
      {pinPositions.slice(0, stepsCount).map((p, i) => (
        <Pin key={i} label={`Pas ${i + 1}`} pos={p} active={i === activeIndex} />
      ))}

      {/* environment soft */}
      <Environment preset="city" />
    </group>
  );
}

export default function Journey3D({
  activeIndex = 0,
  stepsCount = 5,
  height = 420,
}) {
  return (
    <div style={{ height, width: "100%" }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.4, 4.2], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <Scene activeIndex={activeIndex} stepsCount={stepsCount} />
      </Canvas>
    </div>
  );
}
