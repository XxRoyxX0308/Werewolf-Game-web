'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/** 日夜混合值：0 = 白天，1 = 黑夜。每一幀平滑過渡，場景各處共用 */
export interface Blend {
  v: number;
}

const C = (hex: string) => new THREE.Color(hex);
const DAY = {
  top: C('#2f7fd8'),
  bottom: C('#d3e9fb'),
  fog: C('#bdd9f2'),
  amb: C('#fff4e0'),
  sun: C('#fff0d0'),
  hemiSky: C('#cfe4ff'),
  hemiGround: C('#5c6b3a'),
};
const NIGHT = {
  top: C('#03051a'),
  bottom: C('#1c2660'),
  fog: C('#0a1030'),
  amb: C('#8296f0'),
  sun: C('#a9bcff'),
  hemiSky: C('#4a5cc0'),
  hemiGround: C('#10162e'),
};
const SUN_POS = new THREE.Vector3(16, 30, 12);
const MOON_POS = new THREE.Vector3(-18, 26, -16);
const lerp = THREE.MathUtils.lerp;

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 天空、星月、霧與主要光源 */
export function Atmosphere({ blend, night }: { blend: Blend; night: boolean }) {
  const scene = useThree((s) => s.scene);
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moonMat = useRef<THREE.MeshBasicMaterial>(null);
  const moonGlow = useRef<THREE.SpriteMaterial>(null);
  const sunMat = useRef<THREE.MeshBasicMaterial>(null);
  const sunGlow = useRef<THREE.SpriteMaterial>(null);
  const starMat = useRef<THREE.PointsMaterial>(null);
  const glow = useMemo(glowTexture, []);
  const fog = useMemo(() => new THREE.Fog('#0a1030', 20, 85), []);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: { top: { value: NIGHT.top.clone() }, bottom: { value: NIGHT.bottom.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          varying vec3 vPos;
          void main() {
            float h = clamp(normalize(vPos).y * 1.6 + 0.05, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, pow(h, 0.65)), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );

  const stars = useMemo(() => {
    const rnd = mulberry32(7);
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(rnd() * 0.98);
      const r = 170;
      pos[i * 3] = r * Math.sin(v) * Math.cos(u);
      pos[i * 3 + 1] = r * Math.cos(v) + 4;
      pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((_, dt) => {
    blend.v = THREE.MathUtils.damp(blend.v, night ? 1 : 0, 1.8, Math.min(dt, 0.1));
    const k = blend.v;
    skyMat.uniforms.top.value.lerpColors(DAY.top, NIGHT.top, k);
    skyMat.uniforms.bottom.value.lerpColors(DAY.bottom, NIGHT.bottom, k);
    fog.color.lerpColors(DAY.fog, NIGHT.fog, k);
    fog.near = lerp(34, 20, k);
    fog.far = lerp(150, 88, k);
    if (amb.current) {
      amb.current.color.lerpColors(DAY.amb, NIGHT.amb, k);
      amb.current.intensity = lerp(1.15, 0.62, k);
    }
    if (hemi.current) {
      hemi.current.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, k);
      hemi.current.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, k);
      hemi.current.intensity = lerp(0.9, 0.75, k);
    }
    if (sun.current) {
      sun.current.color.lerpColors(DAY.sun, NIGHT.sun, k);
      sun.current.intensity = lerp(2.7, 1.25, k);
      sun.current.position.lerpVectors(SUN_POS, MOON_POS, k);
    }
    if (moonMat.current) moonMat.current.opacity = k;
    if (moonGlow.current) moonGlow.current.opacity = k * 0.55;
    if (sunMat.current) sunMat.current.opacity = 1 - k;
    if (sunGlow.current) sunGlow.current.opacity = (1 - k) * 0.7;
    if (starMat.current) starMat.current.opacity = k * 0.95;
  });

  return (
    <>
      <mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[190, 32, 16]} />
      </mesh>
      <points geometry={stars} renderOrder={-9} frustumCulled={false}>
        <pointsMaterial
          ref={starMat}
          size={1.7}
          sizeAttenuation={false}
          color="#ffffff"
          transparent
          depthWrite={false}
          fog={false}
        />
      </points>

      <group position={[-52, 46, -120]}>
        <mesh renderOrder={-8}>
          <sphereGeometry args={[8, 32, 16]} />
          <meshBasicMaterial ref={moonMat} color="#fdf4d2" transparent fog={false} toneMapped={false} />
        </mesh>
        <sprite scale={[60, 60, 1]} renderOrder={-8}>
          <spriteMaterial
            ref={moonGlow}
            map={glow}
            color="#c9d6ff"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      </group>
      <group position={[60, 58, -115]}>
        <mesh renderOrder={-8}>
          <sphereGeometry args={[7, 24, 12]} />
          <meshBasicMaterial ref={sunMat} color="#fff7d6" transparent fog={false} toneMapped={false} />
        </mesh>
        <sprite scale={[80, 80, 1]} renderOrder={-8}>
          <spriteMaterial
            ref={sunGlow}
            map={glow}
            color="#ffe9a8"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      </group>

      <ambientLight ref={amb} intensity={0.6} />
      <hemisphereLight ref={hemi} args={['#4a5cc0', '#10162e', 0.7]} />
      <directionalLight
        ref={sun}
        position={[-18, 26, -16]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
    </>
  );
}

function Trees() {
  const data = useMemo(() => {
    const rnd = mulberry32(42);
    const out: { x: number; z: number; s: number; tint: number }[] = [];
    while (out.length < 110) {
      const a = rnd() * Math.PI * 2;
      const r = 15.5 + rnd() * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      out.push({ x, z, s: 0.9 + rnd() * 1.1, tint: rnd() });
    }
    return out;
  }, []);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const l1 = useRef<THREE.InstancedMesh>(null);
  const l2 = useRef<THREE.InstancedMesh>(null);
  const l3 = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    const layers = [
      { ref: l1, y: 1.55, k: 1 },
      { ref: l2, y: 2.45, k: 0.8 },
      { ref: l3, y: 3.25, k: 0.58 },
    ];
    data.forEach((t, i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.tint * 6);
      m.compose(v.set(t.x, 0.5 * t.s, t.z), q, sc.set(t.s, t.s, t.s));
      trunk.current?.setMatrixAt(i, m);
      for (const L of layers) {
        m.compose(v.set(t.x, L.y * t.s, t.z), q, sc.set(t.s * L.k, t.s, t.s * L.k));
        L.ref.current?.setMatrixAt(i, m);
        col.setHSL(0.36 + t.tint * 0.06, 0.42, 0.2 + t.tint * 0.09 + (L.k < 0.7 ? 0.04 : 0));
        L.ref.current?.setColorAt(i, col);
      }
    });
    for (const r of [trunk, l1, l2, l3]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    }
  }, [data]);

  const n = data.length;
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, n]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1, 6]} />
        <meshStandardMaterial color="#5b3a22" roughness={1} />
      </instancedMesh>
      {[l1, l2, l3].map((ref, i) => (
        <instancedMesh key={i} ref={ref} args={[undefined, undefined, n]} castShadow>
          <coneGeometry args={[1.25, 1.7, 7]} />
          <meshStandardMaterial roughness={1} flatShading />
        </instancedMesh>
      ))}
    </>
  );
}

const HOUSES = [
  { a: 0.35, r: 11.8, wall: '#d8c6a2', roof: '#7c2f2a', s: 1 },
  { a: 1.2, r: 12.6, wall: '#c9b08a', roof: '#3f5a78', s: 1.15 },
  { a: 2.15, r: 11.6, wall: '#e0d3b4', roof: '#6b3d24', s: 0.95 },
  { a: 3.1, r: 12.4, wall: '#cdb999', roof: '#7c2f2a', s: 1.1 },
  { a: 4.0, r: 11.9, wall: '#d6c3a0', roof: '#4a6b4a', s: 1 },
  { a: 5.45, r: 12.8, wall: '#dccbaa', roof: '#6b3d24', s: 1.2 },
];

function House({ a, r, wall, roof, s, blend }: (typeof HOUSES)[number] & { blend: Blend }) {
  const win = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3b2f1c', emissive: '#ffc566', emissiveIntensity: 0.1 }),
    [],
  );
  useFrame(() => {
    win.emissiveIntensity = 0.05 + blend.v * 2.4;
  });
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  return (
    <group position={[x, 0, z]} rotation-y={Math.atan2(-x, -z)} scale={s}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 1.9, 2.3]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[2.35, 1.5, 4]} />
        <meshStandardMaterial color={roof} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.75, 2.9, -0.3]} castShadow>
        <boxGeometry args={[0.34, 0.9, 0.34]} />
        <meshStandardMaterial color="#6a5a4a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.6, 1.16]}>
        <planeGeometry args={[0.62, 1.2]} />
        <meshStandardMaterial color="#4a2f1a" roughness={1} />
      </mesh>
      {[-0.85, 0.85].map((wx) => (
        <mesh key={wx} position={[wx, 1.15, 1.16]} material={win}>
          <planeGeometry args={[0.5, 0.5]} />
        </mesh>
      ))}
      <mesh position={[1.36, 1.15, 0]} rotation-y={Math.PI / 2} material={win}>
        <planeGeometry args={[0.5, 0.5]} />
      </mesh>
    </group>
  );
}

function Mountains() {
  const data = useMemo(() => {
    const rnd = mulberry32(99);
    return Array.from({ length: 13 }, (_, i) => {
      const a = (i / 13) * Math.PI * 2 + rnd() * 0.3;
      const r = 100 + rnd() * 22;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 14 + rnd() * 16, w: 20 + rnd() * 14, rot: rnd() * 3 };
    });
  }, []);
  return (
    <>
      {data.map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2 - 1, m.z]} rotation-y={m.rot}>
          <coneGeometry args={[m.w, m.h, 5]} />
          <meshStandardMaterial color="#27324f" roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

function Campfire({ blend }: { blend: Blend }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flick = 0.82 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.05;
    if (light.current) {
      light.current.intensity = lerp(14, 85, blend.v) * flick;
      light.current.position.x = Math.sin(t * 7) * 0.06;
      light.current.position.z = Math.cos(t * 9) * 0.06;
    }
    flames.current?.children.forEach((f, i) => {
      const s = 1 + Math.sin(t * (7 + i * 2.3) + i) * 0.16;
      f.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      f.rotation.y = t * (1.2 + i * 0.4);
    });
  });
  const stones = useMemo(() => Array.from({ length: 11 }, (_, i) => (i / 11) * Math.PI * 2), []);
  return (
    <group>
      {stones.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95]} rotation={[a, a * 2, 0]} castShadow>
          <dodecahedronGeometry args={[0.2 + (i % 3) * 0.035]} />
          <meshStandardMaterial color="#7d7f86" roughness={1} flatShading />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.2, 0]} rotation={[Math.PI / 2 - 0.25, 0, (i * Math.PI) / 3]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 1.5, 7]} />
          <meshStandardMaterial color="#4a2f1b" roughness={1} />
        </mesh>
      ))}
      <group ref={flames} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.42, 1.25, 7]} />
          <meshBasicMaterial color="#ff6a1a" transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh position={[0.08, 0.45, 0.05]}>
          <coneGeometry args={[0.3, 0.95, 6]} />
          <meshBasicMaterial color="#ffb02e" transparent opacity={0.9} toneMapped={false} />
        </mesh>
        <mesh position={[-0.05, 0.36, -0.04]}>
          <coneGeometry args={[0.17, 0.62, 5]} />
          <meshBasicMaterial color="#fff3b0" toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 1.25, 0]} color="#ff9440" distance={30} decay={1.7} intensity={60} />
      <Sparkles count={36} scale={[1.4, 3.6, 1.4]} position={[0, 2.2, 0]} size={3.5} speed={0.9} color="#ffb347" noise={1.2} />
    </group>
  );
}

function Fireflies({ blend }: { blend: Blend }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = blend.v > 0.45;
  });
  return (
    <group ref={ref}>
      <Sparkles count={70} scale={[34, 3.5, 34]} position={[0, 2.2, 0]} size={2.6} speed={0.25} color="#d8ff8a" opacity={0.8} />
    </group>
  );
}

/** 靜態的村莊場景：地面、營火、樹林、小屋與遠山 */
export function World({ blend, clearing }: { blend: Blend; clearing: number }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[160, 72]} />
        <meshStandardMaterial color="#47733f" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]} receiveShadow>
        <circleGeometry args={[clearing, 56]} />
        <meshStandardMaterial color="#7c6247" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[clearing, clearing + 0.9, 56]} />
        <meshStandardMaterial color="#5f7a45" roughness={1} />
      </mesh>
      <Campfire blend={blend} />
      <Trees />
      {HOUSES.map((h, i) => (
        <House key={i} {...h} blend={blend} />
      ))}
      <Mountains />
      <Fireflies blend={blend} />
    </>
  );
}
