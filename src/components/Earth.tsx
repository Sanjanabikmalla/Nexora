import { useRef, useMemo, Suspense, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* Stylized Nexora Earth — procedural shader, no external textures. */

const earthVertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragment = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  uniform float uTime;

  // Simple hash + noise
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = mix(
      mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos);
    float continents = fbm(p * 2.2);
    float landMask = smoothstep(0.52, 0.58, continents);

    vec3 ocean = mix(vec3(0.02, 0.05, 0.18), vec3(0.05, 0.25, 0.55), 0.5 + 0.5 * sin(uTime * 0.2 + p.y * 4.0));
    vec3 land = mix(vec3(0.05, 0.25, 0.18), vec3(0.55, 0.35, 0.75), continents);
    vec3 base = mix(ocean, land, landMask);

    // City lights on night side
    float cityNoise = fbm(p * 12.0);
    float cities = smoothstep(0.62, 0.7, cityNoise) * landMask;
    base += vec3(1.0, 0.7, 0.3) * cities * 0.6;

    // Rim / Fresnel glow
    float fres = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    base += vec3(0.4, 0.5, 1.0) * fres * 0.8;

    gl_FragColor = vec4(base, 1.0);
  }
`;

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(0.4, 0.55, 1.0, 1.0) * intensity;
  }
`;

function EarthMesh({ markers = [], spin = 0.05 }: { markers?: { lat: number; lng: number; color?: string }[]; spin?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * spin;
    if (matRef.current) (matRef.current.uniforms.uTime.value as number) += delta;
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={ref}>
        <sphereGeometry args={[1.6, 96, 96]} />
        <shaderMaterial ref={matRef} vertexShader={earthVertex} fragmentShader={earthFragment} uniforms={uniforms} />
        {/* Markers as children rotate with earth */}
        {markers.map((m, i) => (
          <Marker key={i} lat={m.lat} lng={m.lng} color={m.color ?? "#00e5ff"} />
        ))}
      </mesh>
      {/* Atmosphere */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent
        />
      </mesh>
    </group>
  );
}

function latLngToVec3(lat: number, lng: number, radius = 1.62): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function Marker({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  const pos = useMemo(() => latLngToVec3(lat, lng), [lat, lng]);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (ringRef.current) {
      const k = 1 + (Math.sin(t * 2) * 0.5 + 0.5) * 0.6;
      ringRef.current.scale.set(k, k, k);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - (k - 1) / 0.6;
    }
  });
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.06, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={color} intensity={2} distance={0.6} />
    </group>
  );
}

export function NexoraEarth({
  markers,
  className = "",
  interactive = false,
  spin = 0.05,
}: {
  markers?: { lat: number; lng: number; color?: string }[];
  className?: string;
  interactive?: boolean;
  spin?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className={className} aria-hidden />;
  }
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Stars radius={50} depth={50} count={3000} factor={4} fade speed={1} />
          <EarthMesh markers={markers} spin={spin} />
        </Suspense>
        {interactive && <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} />}
      </Canvas>
    </div>
  );
}