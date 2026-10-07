import type { Metadata } from 'next';
import RoomClient from '@/components/room/RoomClient';

const norm = (raw: string) => decodeURIComponent(raw).trim().toUpperCase().slice(0, 8);

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const code = norm((await params).code);
  return { title: `房間 ${code}｜狼人殺 Online`, description: '朋友邀請你一起玩狼人殺，點開連結就能加入。' };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = norm((await params).code);
  return <RoomClient code={code} />;
}
