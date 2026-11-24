import AsyncStorage from '@react-native-async-storage/async-storage';

import { ATRIBUTO_NOMES, AtributoKey } from '@/types/ficha';

/**
 * Dados de regras vêm direto do 5etools (espelho público em GitHub, que serve JSON com CORS).
 * Nada é guardado em banco próprio: apenas cache local (memória + AsyncStorage).
 */
export const BASE_URL =
  process.env.EXPO_PUBLIC_5ETOOLS_URL ??
  'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data';

export const HOMEBREW_BASE_URL =
  'https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master';

/** Catálogo completo de códigos de livros (Oficiais WotC + Third-Party famosos) para tags de filtro. */
export const NOMES_LIVROS: Record<string, string> = {
  // Core & Expansões Oficiais WotC
  PHB: 'PHB (Livro do Jogador)',
  XPHB: 'XPHB (Jogador 2024)',
  TCE: 'TCE (Tasha)',
  XGE: 'XGE (Xanathar)',
  DMG: 'DMG (Guia do Mestre)',
  MM: 'MM (Manual dos Monstros)',
  MPMM: 'MPMM (Multiverso)',
  VGM: 'VGM (Volo)',
  MTF: 'MTF (Mordenkainen)',
  // Cenários Oficiais WotC
  VRGR: 'VRGR (Ravenloft)',
  FTD: 'FTD (Fizban / Dragões)',
  AAG: 'AAG (Spelljammer)',
  BAM: 'BAM (Spelljammer Monstros)',
  SCC: 'SCC (Strixhaven)',
  ERLW: 'ERLW (Eberron)',
  EGW: 'EGW (Wildemount)',
  MOT: 'MOT (Theros)',
  GGR: 'GGR (Ravnica)',
  SCAG: 'SCAG (Costa da Espada)',
  WBTW: 'WBtW (Witchlight)',
  DSOTDQ: 'DSotDQ (Dragonlance)',
  SATO: 'SatO (Planescape)',
  BMT: 'BMT (Book of Many Things)',
  BGG: 'BGG (Bigby / Gigantes)',
  IDROTF: 'IDRotF (Icewind Dale)',
  AI: 'AI (Acquisitions Inc.)',
  EEPC: 'EEPC (Mal Elemental)',
  LLK: 'LLK (Kwalish)',
  // Cenários Famosos de Terceiros (5etools Homebrew)
  HWCS: 'HWCS (Humblewood)',
  HWT: 'HWT (Humblewood Tales)',
  TDCSR: "TDCSR (Tal'Dorei / Critical Role)",
  BH2022: 'BH (Blood Hunter / Critical Role)',
  GHPG: 'GHPG (Grim Hollow)',
  DODK: 'DoDk (Drakkenheim)',
  SCGTD: 'SCGtD (Drakkenheim: Sebastian Crowe)',
  TOH: 'ToH (Kobold Press: Tome of Heroes)',
  VSS: "VSS (Valda's Spire of Secrets)",
  ILLR: 'ILLR (MCDM: Illrigger)',
};

const CACHE_PREFIX = '5etools:v2:';
const memory = new Map<string, unknown>();

async function getJSONFromUrl<T>(fullUrl: string, cacheKey: string): Promise<T> {
  if (memory.has(cacheKey)) return memory.get(cacheKey) as T;
  const key = CACHE_PREFIX + cacheKey;
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (cached) {
    const parsed = JSON.parse(cached) as T;
    memory.set(cacheKey, parsed);
    return parsed;
  }
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`5etools: ${res.status} em ${cacheKey}`);
  const text = await res.text();
  const parsed = JSON.parse(text) as T;
  memory.set(cacheKey, parsed);
  AsyncStorage.setItem(key, text).catch(() => {});
  return parsed;
}

async function getJSON<T>(path: string): Promise<T> {
  return getJSONFromUrl<T>(`${BASE_URL}/${path}`, path);
}

interface HomebrewBundle {
  code: string;
  path: string;
}

const PACOTES_TERCEIROS: HomebrewBundle[] = [
  { code: 'HWCS', path: 'collection/Hit Point Press; Humblewood Campaign Setting.json' },
  { code: 'HWT', path: 'collection/Hit Point Press; Humblewood Tales.json' },
  { code: 'TDCSR', path: "collection/Darrington Press; Tal'Dorei Campaign Setting Reborn.json" },
  { code: 'GHPG', path: "collection/Ghostfire Gaming; Grim Hollow - Player's Guide - 2014.json" },
  { code: 'DODK', path: 'collection/Ghostfire Gaming; Dungeons of Drakkenheim.json' },
  { code: 'SCGTD', path: "collection/Ghostfire Gaming; Sebastian Crowe's Guide to Drakkenheim.json" },
  { code: 'TOH', path: 'collection/Kobold Press; Tome of Heroes.json' },
  { code: 'VSS', path: "collection/Mage Hand Press; Valda's Spire of Secrets - 2014.json" },
  { code: 'BH2022', path: 'class/Matthew Mercer; Blood Hunter (2022).json' },
  { code: 'ILLR', path: 'class/MCDM Productions; The Illrigger Revised.json' },
];

interface RawHomebrewData {
  code: string;
  race?: Race5e[];
  subrace?: (Race5e & { raceName?: string })[];
  class?: Class5e[];
  spell?: (Spell5e & { classes?: unknown })[];
  feat?: Feat5e[];
  item?: Item5e[];
  background?: Background5e[];
  monster?: Monster5e[];
}

let homebrewPromise: Promise<RawHomebrewData[]> | null = null;

function carregarPacotesTerceiros(): Promise<RawHomebrewData[]> {
  if (homebrewPromise) return homebrewPromise;
  homebrewPromise = Promise.all(
    PACOTES_TERCEIROS.map(async (p) => {
      try {
        const url = `${HOMEBREW_BASE_URL}/${encodeURI(p.path)}`;
        const raw = await getJSONFromUrl<Omit<RawHomebrewData, 'code'>>(url, `hb:${p.code}`);
        return { ...raw, code: p.code };
      } catch {
        return { code: p.code };
      }
    }),
  );
  return homebrewPromise;
}

// ---------- Tipos mínimos ----------
export interface Spell5e {
  name: string;
  source: string;
  level: number;
  school: string; // letra: A,C,D,E,V,I,N,T
  time?: { number: number; unit: string }[];
  range?: { type: string; distance?: { type: string; amount?: number } };
  components?: { v?: boolean; s?: boolean; m?: unknown };
  duration?: { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[];
  entries?: unknown[];
  entriesHigherLevel?: unknown[];
  meta?: { ritual?: boolean };
  /** preenchido pelo serviço a partir do lookup de classes */
  classes?: string[];
}

export const ESCOLAS: Record<string, string> = {
  A: 'Abjuração',
  C: 'Conjuração',
  D: 'Adivinhação',
  E: 'Encantamento',
  V: 'Evocação',
  I: 'Ilusão',
  N: 'Necromancia',
  T: 'Transmutação',
};

// ---------- Magias ----------
const FONTES_MAGIA = [
  'phb',
  'xge',
  'tce',
  'ftd',
  'scc',
  'aag',
  'egw',
  'ggr',
  'sato',
  'bmt',
  'idrotf',
  'ai',
  'llk',
  'xphb',
];

type SpellLookup = Record<string, Record<string, { class?: Record<string, Record<string, boolean>> }>>;

let spellsPromise: Promise<Spell5e[]> | null = null;

export function carregarMagias(fontes: string[] = FONTES_MAGIA): Promise<Spell5e[]> {
  if (spellsPromise) return spellsPromise;
  spellsPromise = (async () => {
    const [arquivos, lookup, pacotesHb] = await Promise.all([
      Promise.all(
        fontes.map((s) =>
          getJSON<{ spell: Spell5e[] }>(`spells/spells-${s}.json`).catch(() => ({ spell: [] })),
        ),
      ),
      getJSON<SpellLookup>('generated/gendata-spell-source-lookup.json').catch(() => null),
      carregarPacotesTerceiros(),
    ]);
    const oficiais = arquivos.flatMap((a) => a.spell ?? []);
    for (const sp of oficiais) {
      const info = lookup?.[sp.source.toLowerCase()]?.[sp.name.toLowerCase()];
      const set = new Set<string>();
      Object.values(info?.class ?? {}).forEach((byClass) => Object.keys(byClass).forEach((c) => set.add(c)));
      sp.classes = [...set].sort();
    }

    const terceiros: Spell5e[] = [];
    for (const p of pacotesHb) {
      for (const rawSp of p.spell ?? []) {
        const rawClasses = rawSp.classes as
          | string[]
          | { fromClassList?: { name?: string }[] }
          | undefined;
        let listaClasses: string[] = [];
        if (Array.isArray(rawClasses)) {
          listaClasses = rawClasses;
        } else if (rawClasses && Array.isArray(rawClasses.fromClassList)) {
          listaClasses = [...new Set(rawClasses.fromClassList.map((c) => c.name ?? '').filter(Boolean))];
        }
        terceiros.push({
          ...rawSp,
          source: p.code,
          classes: listaClasses,
        });
      }
    }

    const todas = [...oficiais, ...terceiros];
    return todas.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  })().catch((e) => {
    spellsPromise = null; // permite nova tentativa
    throw e;
  });
  return spellsPromise;
}

// ---------- Classes, raças, itens, talentos, antecedentes ----------
export interface Class5e {
  name: string;
  source: string;
  hd?: { number: number; faces: number };
  /** str | dex | con | int | wis | cha */
  spellcastingAbility?: string;
  /** proficiência em salvaguardas, ex.: ["int","wis"] */
  proficiency?: string[];
}

export interface Race5e {
  name: string;
  source: string;
  speed?: number | { walk?: number };
  ability?: Record<string, unknown>[];
  entries?: unknown[];
}

export interface Item5e {
  name: string;
  source: string;
  type?: string;
  rarity?: string;
  weight?: number;
  entries?: unknown[];
}

export interface Feat5e {
  name: string;
  source: string;
  entries?: unknown[];
}

export interface Background5e {
  name: string;
  source: string;
  entries?: unknown[];
}

export interface Monster5e {
  name: string;
  source: string;
  size?: string[];
  type?: string | { type?: string };
  ac?: (number | { ac?: number })[];
  hp?: { average?: number; formula?: string };
  speed?: Record<string, unknown>;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  cr?: string | { cr?: string };
  trait?: { name?: string; entries?: unknown[] }[];
  action?: { name?: string; entries?: unknown[] }[];
}

const CLASSES_OFICIAIS = [
  'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter',
  'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
];
const FONTES_CLASSE = ['PHB', 'TCE', 'XPHB'];
const FONTES_RACA_IGNORADAS = new Set(['PSA', 'PSD', 'PSI', 'PSK', 'PSX', 'PSZ']);

/** Classes oficiais (PHB, Tasha, 2024) + Classes Famosas de Terceiros (Blood Hunter, Apothecary, Illrigger, Valda's). */
export const listarClasses = async (): Promise<Class5e[]> => {
  const [idx, pacotesHb] = await Promise.all([
    getJSON<Record<string, string>>('class/index.json'),
    carregarPacotesTerceiros(),
  ]);
  const files = CLASSES_OFICIAIS.filter((c) => idx[c]).map((c) => idx[c]);
  const data = await Promise.all(files.map((f) => getJSON<{ class?: Class5e[] }>(`class/${f}`)));
  const oficiais = data
    .flatMap((d) => d.class ?? [])
    .filter((c) => FONTES_CLASSE.includes(c.source));

  const terceiros: Class5e[] = [];
  for (const p of pacotesHb) {
    for (const c of p.class ?? []) {
      terceiros.push({ ...c, source: p.code });
    }
  }

  const vistos = new Set<string>();
  return [...oficiais, ...terceiros]
    .filter((c) => {
      const k = `${c.name}|${c.source}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

function mesclarAbility(
  base?: Record<string, unknown>[],
  sub?: Record<string, unknown>[],
): Record<string, unknown>[] | undefined {
  if (!base && !sub) return undefined;
  if (!base) return sub;
  if (!sub) return base;
  return [{ ...(base[0] ?? {}), ...(sub[0] ?? {}) }];
}

/** Raças de todos os cenários oficiais WotC + cenários famosos de terceiros (Humblewood, Grim Hollow, Kobold Press, Valda's). */
export const listarRacas = async (): Promise<Race5e[]> => {
  const [{ race }, pacotesHb] = await Promise.all([
    getJSON<{ race: Race5e[] }>('races.json'),
    carregarPacotesTerceiros(),
  ]);

  const oficiais = (race ?? []).filter((r) => !FONTES_RACA_IGNORADAS.has(r.source));

  const terceiros: Race5e[] = [];
  for (const p of pacotesHb) {
    const baseMap = new Map<string, Race5e>();
    for (const r of p.race ?? []) {
      const item: Race5e = { ...r, source: p.code };
      terceiros.push(item);
      baseMap.set(r.name.toLowerCase(), item);
    }
    for (const sr of p.subrace ?? []) {
      if (!sr.name || !sr.raceName) continue;
      const parent = baseMap.get(sr.raceName.toLowerCase());
      terceiros.push({
        name: `${sr.raceName} (${sr.name})`,
        source: p.code,
        speed: sr.speed ?? parent?.speed ?? 30,
        ability: mesclarAbility(parent?.ability, sr.ability),
        entries: [...(parent?.entries ?? []), ...(sr.entries ?? [])],
      });
    }
  }

  const vistos = new Set<string>();
  return [...oficiais, ...terceiros]
    .filter((r) => {
      const k = `${r.name}|${r.source}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

/** Deslocamento de caminhada em metros (pés ÷ 5 × 1,5). */
export function deslocamentoEmMetros(r?: Race5e): number {
  const ft = typeof r?.speed === 'number' ? r.speed : (r?.speed?.walk ?? 30);
  return Math.round((ft / 5) * 1.5 * 2) / 2;
}

const MAPA_5E_ATTR: Record<string, AtributoKey> = {
  str: 'for',
  dex: 'des',
  con: 'con',
  int: 'int',
  wis: 'sab',
  cha: 'car',
};

/** Bônus fixos de atributo de uma raça (ex.: { des: 2, int: 1 }). */
export function bonusRacialFixo(r?: Race5e): Partial<Record<AtributoKey, number>> {
  const out: Partial<Record<AtributoKey, number>> = {};
  const first = r?.ability?.[0];
  if (!first || typeof first !== 'object') return out;
  for (const [k, v] of Object.entries(first)) {
    const attr = MAPA_5E_ATTR[k];
    if (attr && typeof v === 'number') out[attr] = v;
  }
  return out;
}

/** Texto resumido dos bônus raciais (ex.: "Destreza +2, Inteligência +1" ou "+2/+1 à escolha"). */
export function textoBonusRacial(r?: Race5e): string {
  const first = r?.ability?.[0];
  if (!first || typeof first !== 'object') return 'Bônus flexível (+2/+1 ou +1/+1/+1)';
  const partes: string[] = [];
  for (const [k, v] of Object.entries(first)) {
    const attr = MAPA_5E_ATTR[k];
    if (attr && typeof v === 'number') {
      partes.push(`${ATRIBUTO_NOMES[attr]} ${v >= 0 ? `+${v}` : v}`);
    } else if (k === 'choose' && v && typeof v === 'object') {
      const c = v as { count?: number; amount?: number };
      partes.push(`+${c.amount ?? 1} em ${c.count ?? 1} atributo(s) à escolha`);
    }
  }
  return partes.length ? partes.join(' · ') : 'Bônus flexível (+2/+1 à escolha)';
}

export const listarItens = async (): Promise<Item5e[]> => {
  const [{ item }, pacotesHb] = await Promise.all([
    getJSON<{ item: Item5e[] }>('items.json'),
    carregarPacotesTerceiros(),
  ]);
  const terceiros = pacotesHb.flatMap((p) => (p.item ?? []).map((it) => ({ ...it, source: p.code })));
  return [...(item ?? []), ...terceiros].sort((a, b) => a.name.localeCompare(b.name));
};

export const listarTalentos = async (): Promise<Feat5e[]> => {
  const [{ feat }, pacotesHb] = await Promise.all([
    getJSON<{ feat: Feat5e[] }>('feats.json'),
    carregarPacotesTerceiros(),
  ]);
  const terceiros = pacotesHb.flatMap((p) => (p.feat ?? []).map((f) => ({ ...f, source: p.code })));
  return [...(feat ?? []), ...terceiros].sort((a, b) => a.name.localeCompare(b.name));
};

export const listarAntecedentes = async (): Promise<Background5e[]> => {
  const [{ background }, pacotesHb] = await Promise.all([
    getJSON<{ background: Background5e[] }>('backgrounds.json'),
    carregarPacotesTerceiros(),
  ]);
  const terceiros = pacotesHb.flatMap((p) =>
    (p.background ?? []).map((bg) => ({ ...bg, source: p.code })),
  );
  return [...(background ?? []), ...terceiros].sort((a, b) => a.name.localeCompare(b.name));
};

const FONTES_BESTIARIO_OFICIAIS = [
  'mm',
  'mpmm',
  'vgm',
  'mtf',
  'ftd',
  'vrgr',
  'aag',
  'bam',
  'erlw',
  'egw',
  'mot',
  'ggr',
  'scc',
  'wbtw',
  'dsotdq',
  'bgg',
  'bmt',
  'sato',
];

let monstrosPromise: Promise<Monster5e[]> | null = null;

export const listarMonstros = async (): Promise<Monster5e[]> => {
  if (monstrosPromise) return monstrosPromise;
  monstrosPromise = (async () => {
    const [arquivosOficiais, pacotesHb] = await Promise.all([
      Promise.all(
        FONTES_BESTIARIO_OFICIAIS.map((f) =>
          getJSON<{ monster: Monster5e[] }>(`bestiary/bestiary-${f}.json`).catch(() => ({ monster: [] })),
        ),
      ),
      carregarPacotesTerceiros(),
    ]);
    const oficiais = arquivosOficiais.flatMap((a) => a.monster ?? []);
    const terceiros = pacotesHb.flatMap((p) =>
      (p.monster ?? []).map((m) => ({ ...m, source: p.code })),
    );
    return [...oficiais, ...terceiros].sort((a, b) => a.name.localeCompare(b.name));
  })().catch((e) => {
    monstrosPromise = null;
    throw e;
  });
  return monstrosPromise;
};

export function resumoMonstro(m: Monster5e) {
  const acRaw = m.ac?.[0];
  const ca = typeof acRaw === 'number' ? acRaw : (acRaw?.ac ?? 10);
  const pv = m.hp?.average ?? 10;
  const cr = typeof m.cr === 'string' ? m.cr : (m.cr?.cr ?? '0');
  const tipo = typeof m.type === 'string' ? m.type : (m.type?.type ?? 'criatura');
  return { ca, pv, cr, tipo };
}

export function detalhesMonstro(m: Monster5e): string {
  const r = resumoMonstro(m);
  const hpTxt = m.hp?.formula ? `${r.pv} (${m.hp.formula})` : `${r.pv}`;
  const cabecalho = `CA ${r.ca}  ·  PV ${hpTxt}  ·  ND ${r.cr}`;
  const attrs = `FOR ${m.str ?? 10}  |  DES ${m.dex ?? 10}  |  CON ${m.con ?? 10}  |  INT ${m.int ?? 10}  |  SAB ${m.wis ?? 10}  |  CAR ${m.cha ?? 10}`;
  const tracos = (m.trait ?? [])
    .map((t) => `• ${limparTags(t.name ?? '')}: ${entriesParaTexto(t.entries)}`)
    .join('\n\n');
  const acoes = (m.action ?? [])
    .map((a) => `• ${limparTags(a.name ?? '')}: ${entriesParaTexto(a.entries)}`)
    .join('\n\n');

  const blocos: string[] = [cabecalho, attrs];
  if (tracos) blocos.push(`TRACOS\n${tracos}`);
  if (acoes) blocos.push(`ACOES\n${acoes}`);
  return blocos.join('\n\n');
}

/** Extrai fórmulas de dados (ex.: "8d6", "1d8", "3d4+3") de uma descrição de magia ou ataque. */
export function extrairFormulasDados(texto: string): string[] {
  const regex = /\b(\d{1,2}d(?:4|6|8|10|12|20)(?:\s*[+-]\s*\d{1,2})?)\b/gi;
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(texto)) !== null) {
    set.add(match[1].replace(/\s+/g, '').toLowerCase());
  }
  return [...set].slice(0, 6);
}

// ---------- Renderização de texto ----------
const MAPA_ATK: Record<string, string> = {
  mw: 'Ataque Corpo a Corpo com Arma:',
  rw: 'Ataque a Distancia com Arma:',
  'mw,rw': 'Ataque Corpo a Corpo ou a Distancia:',
  ms: 'Ataque Corpo a Corpo com Magia:',
  rs: 'Ataque a Distancia com Magia:',
  'ms,rs': 'Ataque com Magia:',
};

/** Converte todas as tags do 5etools ({@dice 1d6}, {@h}, {@atk mw}, {@hit 8}, {@dc 20}, {@spell ...}) em texto legível. */
export function limparTags(s: string): string {
  return s
    .replace(/\{@h\}/g, 'Acerto: ')
    .replace(/\{@atk ([^}]+)\}/g, (_, code: string) => MAPA_ATK[code.trim()] ?? 'Ataque:')
    .replace(/\{@hit ([^}|]+)(?:\|[^}]*)?\}/g, (_, n: string) => {
      const limpo = n.trim();
      return limpo.startsWith('+') || limpo.startsWith('-') ? limpo : `+${limpo}`;
    })
    .replace(/\{@dc ([^}|]+)(?:\|[^}]*)?\}/g, (_, n: string) => `CD ${n.trim()}`)
    .replace(/\{@recharge(?:\s+([^}|]+))?(?:\|[^}]*)?\}/g, (_, n?: string) =>
      n && n.trim() !== '6' ? `(Recarga ${n.trim()}-6)` : '(Recarga 6)',
    )
    .replace(/\{@\w+\s+([^}|]*)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function entriesParaTexto(entries: unknown[] | undefined): string {
  if (!entries) return '';
  const out: string[] = [];
  const walk = (e: unknown) => {
    if (typeof e === 'string') {
      const limpo = limparTags(e);
      if (limpo) out.push(limpo);
    } else if (Array.isArray(e)) {
      e.forEach(walk);
    } else if (e && typeof e === 'object') {
      const o = e as {
        name?: string;
        entries?: unknown[];
        items?: unknown[];
        entry?: unknown;
        rows?: unknown[][];
        colLabels?: string[];
      };
      if (o.name && o.entries) {
        const sub = entriesParaTexto(o.entries);
        out.push(`${limparTags(o.name)}: ${sub}`);
      } else {
        if (o.name) out.push(`${limparTags(o.name)}:`);
        if (o.entries) walk(o.entries);
        if (o.entry) walk(o.entry);
        if (o.items) walk(o.items);
      }
      if (Array.isArray(o.rows)) {
        for (const row of o.rows) {
          if (Array.isArray(row)) {
            out.push(row.map((cell) => (typeof cell === 'string' ? limparTags(cell) : '')).filter(Boolean).join(' | '));
          }
        }
      }
    }
  };
  walk(entries);
  return out.join('\n\n');
}

const TRACOS_IGNORADOS = new Set(['age', 'alignment', 'size', 'speed']);

/** Extrai sub-entradas nomeadas (ex.: traços de raça ou antecedente) como cards estruturados. */
export function extrairTracosEntries(
  entries: unknown[] | undefined,
  origem: string,
): { nome: string; origem: string; descricao: string }[] {
  if (!entries) return [];
  const out: { nome: string; origem: string; descricao: string }[] = [];
  for (const e of entries) {
    if (e && typeof e === 'object' && 'name' in e) {
      const o = e as { name?: string; entries?: unknown[] };
      if (o.name) {
        const limpo = limparTags(o.name);
        if (TRACOS_IGNORADOS.has(limpo.trim().toLowerCase())) continue;
        out.push({
          nome: limpo,
          origem,
          descricao: entriesParaTexto(o.entries),
        });
      }
    }
  }
  return out;
}

export function resumoMagia(sp: Spell5e) {
  const t = sp.time?.[0];
  const r = sp.range?.distance;
  const d = sp.duration?.[0];
  return {
    tempo: t ? `${t.number} ${t.unit}` : '-',
    alcance: r ? `${r.amount ?? ''} ${r.type}`.trim() : (sp.range?.type ?? '-'),
    duracao: d ? (d.concentration ? 'Concentração' : d.type) : '-',
    ritual: !!sp.meta?.ritual,
  };
}
