'use client';

import { OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Figure, Nameplate, type ScenePlayer, labelHeight } from './Figure';
import { Atmosphere, type Blend, World } from './World';

export interface SceneLink {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}

export interface SceneProps {
  players: ScenePlayer[];
  night: boolean;
  speaker?: string | null;
  /** 夜晚仍睜著眼的玩家（自己行動時、狼隊友） */
  awake?: string[];
  selectable?: string[];
  selected?: string[];
  hovered?: string | null;
  /** 玩家之間的連線：投票結果、狼人的襲擊目標 */
  links?: SceneLink[];
  autoRotate?: boolean;
  /** 左右兩側被介面面板遮住的總寬度（px），鏡頭會退後到整圈玩家都看得見 */
  padX?: number;
  /** 把畫面中心水平位移（px），讓場景置中在沒被遮住的區域 */
  shiftX?: number;
  onPick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

interface Seat {
  p: ScenePlayer;
  x: number;
  z: number;
  facing: number;
}

type LabelMap = RefObject<Map<string, HTMLDivElement>>;

/** 座位圓圈的半徑，人越多圈越大 */
export const seatRadius = (n: number) => Math.max(3.1, n * 0.27 + 1.55);

const TARGET = new THREE.Vector3(0, 1.5, 0);

function Rig({ R, autoRotate, padX = 0, shiftX = 0 }: { R: number; autoRotate?: boolean; padX?: number; shiftX?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const first = useRef(true);

  // 依畫面比例調整視角與距離，確保整圈玩家都落在沒被面板遮住的範圍內
  const aspect = size.width / Math.max(1, size.height);
  const fov = aspect < 0.75 ? 60 : aspect < 1.15 ? 50 : 40;
  const usable = Math.max(0.4, (size.width - padX) / Math.max(1, size.width));
  const fit = (R + 1.3) / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect * usable);
  const dist = Math.max(R * 1.5 + 9.5, fit);

  useEffect(() => {
    camera.fov = fov;
    if (shiftX) camera.setViewOffset(size.width, size.height, -shiftX, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, fov, shiftX, size.width, size.height]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      const h = R * 0.5 + 3.4;
      camera.position.set(0, TARGET.y + h, Math.sqrt(Math.max(1, dist * dist - h * h)));
    } else {
      // 人數變動時保持視角方向，只調整距離
      const dir = camera.position.clone().sub(TARGET).normalize();
      camera.position.copy(TARGET).addScaledVector(dir, dist);
    }
    camera.lookAt(TARGET);
  }, [R, dist, camera]);
  return (
    <OrbitControls
      makeDefault
      target={TARGET}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={R + 3.2}
      maxDistance={Math.max(R * 2.4 + 20, dist * 1.5)}
      minPolarAngle={0.45}
      maxPolarAngle={1.5}
      autoRotate={autoRotate}
      autoRotateSpeed={0.45}
    />
  );
}

/** 每一幀把玩家頭頂的 3D 座標投影到螢幕，移動對應的名牌 */
function LabelProjector({ seats, labels }: { seats: Seat[]; labels: LabelMap }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const { p, x, z } of seats) {
      const el = labels.current.get(p.id);
      if (!el) continue;
      v.set(x, labelHeight(p), z);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = 'hidden';
        continue;
      }
      const s = THREE.MathUtils.clamp(14 / dist, 0.55, 1.2);
      const sy = (-v.y * 0.5 + 0.5) * size.height;
      // 靠近畫面邊緣時把名牌往內推，避免名字被切掉
      const half = (el.offsetWidth * s) / 2 + 4;
      let sx = (v.x * 0.5 + 0.5) * size.width;
      if (half * 2 < size.width) sx = THREE.MathUtils.clamp(sx, half, size.width - half);
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      el.style.zIndex = String(2000 - Math.round(dist * 20));
    }
  });
  return null;
}

function Stage({ seats, R, labels, ...props }: SceneProps & { seats: Seat[]; R: number; labels: LabelMap }) {
  const { night, speaker, awake, selectable, selected, hovered, links, onPick, onHover } = props;
  const blend = useMemo<Blend>(() => ({ v: night ? 1 : 0 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = useMemo(() => new Map(seats.map((l) => [l.p.id, l])), [seats]);

  return (
    <>
      <Atmosphere blend={blend} night={night} />
      <World blend={blend} clearing={R + 2.1} />
      {seats.map(({ p, x, z, facing }) => (
        <Figure
          key={p.id}
          p={p}
          x={x}
          z={z}
          facing={facing}
          blend={blend}
          awake={!!awake?.includes(p.id)}
          speaking={speaker === p.id}
          selectable={!!selectable?.includes(p.id)}
          selected={!!selected?.includes(p.id)}
          hovered={hovered === p.id}
          onPick={onPick}
          onHover={onHover}
        />
      ))}
      {links?.map((l, i) => {
        const a = pos.get(l.from);
        const b = pos.get(l.to);
        if (!a || !b || l.from === l.to) return null;
        const mid: [number, number, number] = [(a.x + b.x) * 0.3, 4.4, (a.z + b.z) * 0.3];
        return (
          <group key={`${l.from}-${l.to}-${i}`}>
            <QuadraticBezierLine
              start={[a.x, 2.15, a.z]}
              end={[b.x, 2.3, b.z]}
              mid={mid}
              color={l.color}
              lineWidth={3.5}
              dashed={l.dashed}
              dashScale={4}
              transparent
              opacity={0.92}
            />
            <mesh position={[b.x, 2.3, b.z]}>
              <sphereGeometry args={[0.11, 12, 8]} />
              <meshBasicMaterial color={l.color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      <LabelProjector seats={seats} labels={labels} />
      <Rig R={R} autoRotate={props.autoRotate} padX={props.padX} shiftX={props.shiftX} />
    </>
  );
}

/** 3D 村莊廣場：玩家圍著營火而坐，隨遊戲進行切換日夜 */
export default function Scene(props: SceneProps) {
  const { players, speaker, selected, hovered } = props;
  const labels = useRef(new Map<string, HTMLDivElement>());
  const R = seatRadius(players.length);

  const seats = useMemo<Seat[]>(() => {
    const sorted = [...players].sort((a, b) => a.seat - b.seat);
    const n = Math.max(sorted.length, 1);
    const mine = Math.max(0, sorted.findIndex((p) => p.isMe));
    // 自己固定坐在最靠近鏡頭的位置，號碼順時針遞增
    return sorted.map((p, i) => {
      const a = Math.PI / 2 + ((i - mine) / n) * Math.PI * 2;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      return { p, x, z, facing: Math.atan2(-x, -z) };
    });
  }, [players, R]);

  return (
    <div className="relative isolate h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ fov: 40, near: 0.1, far: 500, position: [0, 7, 16] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        fallback={<div className="grid h-full place-items-center text-sm text-white/60">你的瀏覽器不支援 WebGL，無法顯示 3D 場景</div>}
      >
        <Stage {...props} seats={seats} R={R} labels={labels} />
      </Canvas>
      {/* 名牌層：疊在畫布上方的一般 DOM，文字永遠清晰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {seats.map(({ p }) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) labels.current.set(p.id, el);
              else labels.current.delete(p.id);
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ visibility: 'hidden', transformOrigin: '50% 100%' }}
          >
            <Nameplate p={p} speaking={speaker === p.id} selected={!!selected?.includes(p.id)} hovered={hovered === p.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
