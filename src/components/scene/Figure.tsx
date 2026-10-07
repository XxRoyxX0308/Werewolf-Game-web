'use client';

import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { type CSSProperties, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { textOn } from '@/lib/client/color';
import type { Blend } from './World';

export interface Chip {
  text: string;
  tone?: 'wolf' | 'good' | 'gold' | 'mark' | 'pink' | 'dim';
}

export interface ScenePlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  seat: number;
  alive: boolean;
  isMe: boolean;
  sheriff: boolean;
  chips: Chip[];
}

const texCache = new Map<string, THREE.Texture>();
function emojiTexture(emoji: string): THREE.Texture {
  const hit = texCache.get(emoji);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(emoji, tex);
  return tex;
}

let starGeo: THREE.ExtrudeGeometry | null = null;
function star(): THREE.ExtrudeGeometry {
  if (starGeo) return starGeo;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.085 : 0.2;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  starGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  starGeo.center();
  return starGeo;
}

const GOLD = new THREE.Color('#ffcf4a');
const WHITE = new THREE.Color('#ffffff');
const WARM = new THREE.Color('#ffe9a8');

interface Props {
  p: ScenePlayer;
  x: number;
  z: number;
  facing: number;
  blend: Blend;
  awake: boolean;
  speaking: boolean;
  selectable: boolean;
  selected: boolean;
  hovered: boolean;
  onPick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

/** 圍坐在營火旁的玩家：披風是專屬顏色、臉上戴著頭像面具、頭上有號碼名牌 */
export function Figure({ p, x, z, facing, blend, awake, speaking, selectable, selected, hovered, onPick, onHover }: Props) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tomb = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const badge = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => emojiTexture(p.avatar), [p.avatar]);
  const dark = useMemo(() => new THREE.Color(p.color).multiplyScalar(0.5), [p.color]);
  const phase = p.seat * 1.7;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const d = Math.min(delta, 0.1);
    const damp = THREE.MathUtils.damp;
    const asleep = blend.v > 0.5 && !awake;

    if (body.current) {
      const s = damp(body.current.scale.x, p.alive ? (hovered || selected ? 1.09 : 1) : 0, 8, d);
      body.current.scale.setScalar(Math.max(s, 0.0001));
      body.current.visible = s > 0.02;
      body.current.rotation.x = damp(body.current.rotation.x, asleep ? 0.16 : 0, 4, d);
      body.current.position.y = speaking ? Math.abs(Math.sin(t * 5)) * 0.08 : Math.sin(t * 1.3 + phase) * 0.012;
    }
    if (head.current) {
      head.current.rotation.x = damp(head.current.rotation.x, asleep ? 0.5 : 0, 4, d);
      head.current.rotation.y = damp(head.current.rotation.y, asleep ? 0 : Math.sin(t * 0.55 + phase) * 0.22, 3, d);
    }
    if (tomb.current) {
      const k = damp(tomb.current.scale.y, p.alive ? 0 : 1, 5, d);
      tomb.current.scale.setScalar(Math.max(k, 0.0001));
      tomb.current.visible = k > 0.02;
    }
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      const target = selected ? 0.95 : selectable ? 0.4 + Math.sin(t * 4 + phase) * 0.22 : speaking ? 0.7 : 0;
      m.opacity = damp(m.opacity, target, 10, d);
      m.color.copy(selected ? GOLD : speaking && !selectable ? WARM : WHITE);
      ring.current.visible = m.opacity > 0.02;
      ring.current.rotation.z = t * 0.5;
    }
    if (beam.current) {
      const m = beam.current.material as THREE.MeshBasicMaterial;
      m.opacity = damp(m.opacity, speaking && p.alive ? 0.13 : 0, 6, d);
      beam.current.visible = m.opacity > 0.01;
    }
    if (badge.current) badge.current.rotation.y = t * 1.6;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover?.(p.id);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    onHover?.(null);
    document.body.style.cursor = '';
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // 拖曳旋轉鏡頭時不算點擊
    onPick?.(p.id);
  };

  return (
    <group position={[x, 0, z]} rotation-y={facing}>
      {/* 木樁座位 */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.44, 0.5, 0.4, 10]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.403, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.44, 10]} />
        <meshStandardMaterial color="#b08a5c" roughness={1} />
      </mesh>

      {/* 地面光環：可選取 / 已選取 / 發言中 */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} visible={false}>
        <ringGeometry args={[0.74, 0.94, 40, 1, 0, Math.PI * 1.75]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 發言者的聚光 */}
      <mesh ref={beam} position={[0, 4.2, 0]} visible={false}>
        <coneGeometry args={[1.25, 8.4, 24, 1, true]} />
        <meshBasicMaterial
          color="#fff0b8"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={body}>
        <mesh position={[0, 0.98, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.48, 1.16, 16]} />
          <meshStandardMaterial color={p.color} roughness={0.72} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 12]} />
          <meshStandardMaterial color={p.color} roughness={0.72} />
        </mesh>
        <group ref={head} position={[0, 1.84, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 22, 16]} />
            <meshStandardMaterial color="#f3d9bd" roughness={0.8} />
          </mesh>
          <mesh rotation-x={-0.42} castShadow>
            <sphereGeometry args={[0.338, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={dark} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.03, 0.306]}>
            <circleGeometry args={[0.215, 24]} />
            <meshBasicMaterial map={tex} transparent toneMapped={false} />
          </mesh>
        </group>
        {p.sheriff && (
          <mesh ref={badge} position={[0.46, 1.62, 0.12]} geometry={star()} castShadow>
            <meshStandardMaterial color="#ffd24a" emissive="#ffae00" emissiveIntensity={1.1} metalness={0.55} roughness={0.3} />
          </mesh>
        )}
      </group>

      {/* 出局後留下的墓碑 */}
      <group ref={tomb} position={[0, 0.4, 0]} scale={0.0001} visible={false}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.62, 0.8, 0.18]} />
          <meshStandardMaterial color="#9aa1ad" roughness={1} />
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.31, 0.31, 0.18, 18]} />
          <meshStandardMaterial color="#9aa1ad" roughness={1} />
        </mesh>
        <mesh position={[0, 0.62, 0.095]}>
          <boxGeometry args={[0.09, 0.36, 0.02]} />
          <meshStandardMaterial color="#5b616d" roughness={1} />
        </mesh>
        <mesh position={[0, 0.69, 0.095]}>
          <boxGeometry args={[0.26, 0.09, 0.02]} />
          <meshStandardMaterial color="#5b616d" roughness={1} />
        </mesh>
      </group>

      {/* 透明的點擊範圍 */}
      <mesh position={[0, 1.15, 0]} onClick={click} onPointerOver={over} onPointerOut={out}>
        <cylinderGeometry args={[0.62, 0.62, 2.4, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

    </group>
  );
}

/**
 * 名牌錨點的高度。墓碑比坐著的人矮；自己坐在最靠近鏡頭的位置，
 * 名牌改貼在背上，才不會擋住畫面中央的其他玩家。
 */
export const labelHeight = (p: ScenePlayer) => (p.isMe ? 1.5 : p.alive ? 2.55 : 1.85);

interface NameplateProps {
  p: ScenePlayer;
  speaking: boolean;
  selected: boolean;
  hovered: boolean;
}

/**
 * 玩家頭上的名牌：座位號碼（底色為專屬顏色）、頭像、暱稱與狀態標籤。
 * 這是一般的 DOM 元素，由場景每一幀把 3D 座標投影到螢幕後定位。
 */
export function Nameplate({ p, speaking, selected, hovered }: NameplateProps) {
  const cn = ['np', !p.alive && 'dead', p.isMe && 'me', speaking && 'speaking', selected && 'pick', hovered && 'hover']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cn} style={{ '--c': p.color, '--on': textOn(p.color) } as CSSProperties}>
      {p.chips.length > 0 && (
        <div className="np-chips">
          {p.chips.map((c, i) => (
            <span key={i} className={`np-chip ${c.tone ?? ''}`}>
              {c.text}
            </span>
          ))}
        </div>
      )}
      <div className="np-main">
        <span className="np-seat">{p.seat}</span>
        <span className="np-avatar">{p.alive ? p.avatar : '💀'}</span>
        <span className="np-name">{p.name}</span>
        {p.sheriff && <span>⭐</span>}
      </div>
    </div>
  );
}
