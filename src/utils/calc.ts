import { AtributoKey, Ficha, PERICIAS, Slot } from '@/types/ficha';

export const modificador = (valor: number) => Math.floor((valor - 10) / 2);
export const bonusProficiencia = (nivel: number) => 2 + Math.floor((Math.max(1, nivel) - 1) / 4);
export const fmt = (n: number) => (n >= 0 ? `+${n}` : String(n));

/** Modificador do atributo + proficiência (0, 1 ou 2 = especialista) x bônus de proficiência. */
export const bonusComProf = (valorAtributo: number, nivel: number, prof: number) =>
  modificador(valorAtributo) + prof * bonusProficiencia(nivel);

export function bonusPericia(f: Ficha, key: string) {
  const p = PERICIAS.find((x) => x.key === key)!;
  const prof = f.pericias[key] ?? 0;
  return modificador(f.atributos[p.atributo]) + prof * bonusProficiencia(f.nivel);
}

export function bonusSalvaguarda(f: Ficha, a: AtributoKey) {
  return modificador(f.atributos[a]) + (f.salvaguardas[a] ? bonusProficiencia(f.nivel) : 0);
}

export const percepcaoPassiva = (f: Ficha) => 10 + bonusPericia(f, 'percepcao');
export const intuicaoPassiva = (f: Ficha) => 10 + bonusPericia(f, 'intuicao');
export const iniciativa = (f: Ficha) => modificador(f.atributos.des) + f.iniciativaExtra;

export function cdMagia(f: Ficha) {
  const h = f.conjurador.habilidade;
  return h ? 8 + bonusProficiencia(f.nivel) + modificador(f.atributos[h]) : 0;
}
export function ataqueMagia(f: Ficha) {
  const h = f.conjurador.habilidade;
  return h ? bonusProficiencia(f.nivel) + modificador(f.atributos[h]) : 0;
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const toInt = (s: string, fallback = 0) => {
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10);
  return Number.isNaN(n) ? fallback : n;
};
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Tabela oficial de espaços de magia por nível de conjurador pleno (1..20)
const TABELA_CONJURADOR_PLENO: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const PLENOS = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard', 'bardo', 'clérigo', 'clerigo', 'druida', 'feiticeiro', 'mago'];
const MEIOS = ['paladin', 'ranger', 'artificer', 'paladino', 'patrulheiro', 'artífice', 'artifice'];
const BRUXOS = ['warlock', 'bruxo'];

/** Calcula os espaços totais de magia para uma classe e nível segundo o D&D 5e. */
export function calcularSlotsPorClasseNivel(
  classe: string,
  nivel: number,
  atuais?: Record<string, Slot>,
): Record<string, Slot> | null {
  const c = classe.trim().toLowerCase();
  const nv = clamp(nivel, 1, 20);
  const out: Record<string, Slot> = {};
  for (let i = 1; i <= 9; i++) {
    out[String(i)] = { total: 0, usados: atuais?.[String(i)]?.usados ?? 0 };
  }

  if (BRUXOS.some((b) => c.includes(b))) {
    const nivelSlot = nv >= 9 ? 5 : Math.ceil(nv / 2);
    const qtd = nv === 1 ? 1 : nv < 11 ? 2 : nv < 17 ? 3 : 4;
    out[String(nivelSlot)].total = qtd;
    out[String(nivelSlot)].usados = Math.min(out[String(nivelSlot)].usados, qtd);
    return out;
  }

  let nivelConjurador = 0;
  if (PLENOS.some((p) => c.includes(p))) {
    nivelConjurador = nv;
  } else if (MEIOS.some((m) => c.includes(m))) {
    const isArtificer = c.includes('artific');
    if (nv < 2 && !isArtificer) return out;
    nivelConjurador = isArtificer ? Math.ceil(nv / 2) : Math.floor(nv / 2);
  } else {
    return null;
  }

  const linha = TABELA_CONJURADOR_PLENO[clamp(nivelConjurador, 1, 20) - 1] ?? [];
  for (let i = 1; i <= 9; i++) {
    const total = linha[i - 1] ?? 0;
    out[String(i)].total = total;
    out[String(i)].usados = Math.min(out[String(i)].usados, total);
  }
  return out;
}
