'use client';

import { useState } from 'react';
import { PRESETS, ROLES, ROLE_GROUPS } from '@/game/roles';
import type { ClientAction, ClientView, Config, RoleId } from '@/game/types';
import { Button, Toggle, cls } from '../ui';
import { RoleChip, campTone } from './common';

const MULTI: RoleId[] = ['werewolf', 'villager'];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{label}</div>
        {hint && <div className="text-[11px] leading-snug text-white/45">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const hit = options.find(([v]) => String(v) === e.target.value);
        if (hit) onChange(hit[0]);
      }}
      className="rounded-lg border border-white/15 bg-ink-800 px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-gold disabled:opacity-60"
    >
      {options.map(([v, label]) => (
        <option key={String(v)} value={String(v)}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** 大廳的房間設定：邀請連結、牌組（板子）與規則 */
export function LobbyPanel({ view, send, onCopied }: { view: ClientView; send: (a: ClientAction) => void; onCopied: () => void }) {
  const isHost = view.meId === view.hostId;
  const c = view.config;
  const n = view.players.length;
  const [showRoles, setShowRoles] = useState(false);
  const set = (config: Partial<Config>) => send({ type: 'config', config });

  const count = (id: RoleId) => c.roles.filter((r) => r === id).length;
  const change = (id: RoleId, delta: number) => {
    const roles = [...c.roles];
    if (delta > 0) roles.push(id);
    else {
      const i = roles.lastIndexOf(id);
      if (i >= 0) roles.splice(i, 1);
    }
    set({ roles });
  };

  const need = n + (c.roles.includes('thief') ? 2 : 0);
  const summary = ROLE_GROUPS.flatMap((g) => g.ids).filter((id) => count(id) > 0);
  const wolves = c.roles.filter((r) => ROLES[r].camp === 'wolf').length;

  const copy = async () => {
    const url = `${location.origin}/room/${view.code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('複製這個連結傳給朋友', url);
    }
    onCopied();
  };

  return (
    <div className="space-y-4 p-3">
      <section className="rounded-xl bg-gradient-to-br from-gold/20 to-transparent p-3 ring-1 ring-gold/40">
        <div className="text-xs font-bold text-white/60">房間代碼</div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-3xl font-black tracking-[0.3em] text-gold-soft">{view.code}</div>
          <Button tone="primary" size="sm" onClick={copy}>
            🔗 複製邀請連結
          </Button>
        </div>
        <div className="mt-1 text-[11px] text-white/50">把連結傳給朋友，打開就能加入（最多 18 人）</div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base font-black text-white">牌組</h3>
          <span className={cls('text-xs font-black', c.roles.length === need ? 'text-emerald-300' : 'text-blood-soft')}>
            {c.roles.length} / {need} 張 ・ {wolves} 狼
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summary.map((id) => (
            <span key={id} className="inline-flex items-center">
              <RoleChip role={id} />
              {count(id) > 1 && <span className="ml-0.5 text-xs font-black text-white/70">×{count(id)}</span>}
            </span>
          ))}
        </div>

        {isHost && (
          <div className="mt-3 space-y-2">
            <Row label="依人數自動配置" hint="人數變動時自動換成標準牌組">
              <Toggle label="依人數自動配置" checked={c.auto} onChange={(v) => set({ auto: v })} />
            </Row>
            <Row label="套用板子" hint="經典的角色組合">
              <Select
                value=""
                options={[
                  ['', '選擇板子…'],
                  ...PRESETS.map((p) => [p.id, `${p.name}（${p.players} 人）`] as [string, string]),
                ]}
                onChange={(id) => id && send({ type: 'preset', id })}
              />
            </Row>
            <Button size="sm" className="w-full" onClick={() => setShowRoles((v) => !v)}>
              {showRoles ? '▲ 收起自訂角色' : '▼ 自訂角色（共 31 種）'}
            </Button>
          </div>
        )}

        {isHost && showRoles && (
          <div className="mt-2 space-y-3">
            {ROLE_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="mb-1 text-xs font-black text-white/50">{g.title}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.ids.map((id) => {
                    const k = count(id);
                    const multi = MULTI.includes(id);
                    const t = campTone(id);
                    return (
                      <div
                        key={id}
                        title={ROLES[id].short}
                        className={cls('flex items-center gap-1 rounded-lg px-1.5 py-1 ring-1 transition', k ? cls(t.bg, t.ring) : 'bg-white/5 ring-white/10')}
                      >
                        <span className="text-base">{ROLES[id].icon}</span>
                        <span className={cls('min-w-0 flex-1 truncate text-xs font-bold', k ? t.text : 'text-white/50')}>{ROLES[id].name}</span>
                        {multi ? (
                          <span className="flex items-center gap-0.5">
                            <button onClick={() => change(id, -1)} disabled={!k} className="h-5 w-5 rounded bg-white/15 text-xs font-black disabled:opacity-30">
                              −
                            </button>
                            <span className="w-4 text-center text-xs font-black tabular-nums">{k}</span>
                            <button onClick={() => change(id, 1)} className="h-5 w-5 rounded bg-white/15 text-xs font-black">
                              ＋
                            </button>
                          </span>
                        ) : (
                          <input type="checkbox" checked={k > 0} onChange={() => change(id, k ? -1 : 1)} className="h-4 w-4 accent-gold" aria-label={ROLES[id].name} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 font-display text-base font-black text-white">規則</h3>
        <div className="divide-y divide-white/5">
          <Row label="警長競選" hint="第一天選出警長，擁有 1.5 票">
            <Toggle label="警長競選" checked={c.sheriff} disabled={!isHost} onChange={(v) => set({ sheriff: v })} />
          </Row>
          <Row label="狼人勝利條件">
            <Select
              value={c.winMode}
              disabled={!isHost}
              options={[
                ['edge', '屠邊（殺光神或民）'],
                ['all', '屠城（殺光好人）'],
              ]}
              onChange={(v) => set({ winMode: v })}
            />
          </Row>
          <Row label="女巫自救">
            <Select
              value={c.witchSelfSave}
              disabled={!isHost}
              options={[
                ['first', '僅第一晚可自救'],
                ['always', '全程可自救'],
                ['never', '不可自救'],
              ]}
              onChange={(v) => set({ witchSelfSave: v })}
            />
          </Row>
          <Row label="夜晚出局的遺言">
            <Select
              value={c.lastWords}
              disabled={!isHost}
              options={[
                ['first', '僅第一晚有遺言'],
                ['always', '每晚都有遺言'],
                ['none', '沒有遺言'],
              ]}
              onChange={(v) => set({ lastWords: v })}
            />
          </Row>
          <Row label="同守同救" hint="同時被守衛守護與女巫解藥救，仍會死亡">
            <Toggle label="同守同救" checked={c.guardSaveClash} disabled={!isHost} onChange={(v) => set({ guardSaveClash: v })} />
          </Row>
          <Row label="出局者上帝視角" hint="出局後可以看到所有人的身分">
            <Toggle label="出局者上帝視角" checked={c.deadSeeAll} disabled={!isHost} onChange={(v) => set({ deadSeeAll: v })} />
          </Row>
          <Row label="文字發言限制" hint="只有輪到發言的人能在公開頻道打字">
            <Toggle label="文字發言限制" checked={c.strictChat} disabled={!isHost} onChange={(v) => set({ strictChat: v })} />
          </Row>
          <Row label="發言時間">
            <Select
              value={c.speechSec}
              disabled={!isHost}
              options={[30, 60, 90, 120, 180, 240].map((s) => [s, `${s} 秒`] as [number, string])}
              onChange={(v) => set({ speechSec: v })}
            />
          </Row>
          <Row label="夜晚行動時間">
            <Select
              value={c.actionSec}
              disabled={!isHost}
              options={[15, 20, 30, 45, 60].map((s) => [s, `${s} 秒`] as [number, string])}
              onChange={(v) => set({ actionSec: v })}
            />
          </Row>
          <Row label="投票時間">
            <Select
              value={c.voteSec}
              disabled={!isHost}
              options={[15, 20, 30, 45, 60].map((s) => [s, `${s} 秒`] as [number, string])}
              onChange={(v) => set({ voteSec: v })}
            />
          </Row>
        </div>
        {!isHost && <div className="mt-2 text-center text-[11px] text-white/40">只有房主可以修改設定</div>}
      </section>
    </div>
  );
}
