import {
  Background5e,
  Class5e,
  Race5e,
  bonusRacialFixo,
  deslocamentoEmMetros,
  extrairTracosEntries,
} from '@/services/5etools';
import { ATRIBUTOS, AtributoKey, Ficha, novaFicha } from '@/types/ficha';

import { calcularSlotsPorClasseNivel, modificador, uid } from './calc';

const MAPA_ATRIBUTO: Record<string, AtributoKey> = {
  str: 'for',
  dex: 'des',
  con: 'con',
  int: 'int',
  wis: 'sab',
  cha: 'car',
};

export const atributoDe5etools = (k?: string): AtributoKey | '' => (k ? (MAPA_ATRIBUTO[k] ?? '') : '');

export interface DadosCriacao {
  nomePersonagem: string;
  nomeJogador: string;
  raca: Race5e | null;
  classe: Class5e | null;
  antecedente?: Background5e | null;
  atributos: Record<AtributoKey, number>;
  aplicarBonusRacial?: boolean;
  /** Campos opcionais para Homebrew */
  racaCustom?: string;
  classeCustom?: string;
  facesCustom?: number;
  habilidadeConjCustom?: AtributoKey | '';
  antecedenteCustom?: string;
}

/** Compila as escolhas do assistente no documento inicial no formato de ficha.ts. */
export function montarFicha(userId: string, email: string, d: DadosCriacao): Omit<Ficha, 'id'> {
  const f = novaFicha(userId, email, d.nomePersonagem.trim());
  const attrs = { ...d.atributos };

  if (d.aplicarBonusRacial && d.raca) {
    const bonus = bonusRacialFixo(d.raca);
    for (const k of ATRIBUTOS) {
      if (bonus[k]) attrs[k] = Math.min(30, attrs[k] + (bonus[k] ?? 0));
    }
  }

  const faces = d.classe?.hd?.faces ?? d.facesCustom ?? 8;
  const pvInicial = Math.max(1, faces + modificador(attrs.con));

  f.jogador = d.nomeJogador.trim();
  f.raca = d.racaCustom?.trim() || d.raca?.name || '';
  f.classe = d.classeCustom?.trim() || d.classe?.name || '';
  f.antecedente = d.antecedenteCustom?.trim() || d.antecedente?.name || '';
  f.atributos = attrs;
  f.ca = 10 + modificador(attrs.des);
  f.deslocamento = d.raca ? deslocamentoEmMetros(d.raca) : 9;
  f.dadosVida = { faces, total: 1, usados: 0 };
  f.pv = { atual: pvInicial, total: pvInicial, temp: 0 };

  for (const p of d.classe?.proficiency ?? []) {
    const k = MAPA_ATRIBUTO[p];
    if (k) f.salvaguardas[k] = true;
  }

  const habilidade = d.habilidadeConjCustom ?? atributoDe5etools(d.classe?.spellcastingAbility);
  if (habilidade) {
    f.conjurador.classe = f.classe;
    f.conjurador.habilidade = habilidade;
    const slotsIniciais = calcularSlotsPorClasseNivel(f.classe, f.nivel, f.conjurador.slots);
    if (slotsIniciais) f.conjurador.slots = slotsIniciais;
  }

  // Extrai traços raciais e de antecedente do 5etools como cards expansíveis
  const tracosRaca = extrairTracosEntries(d.raca?.entries, `Raça (${f.raca})`);
  const tracosBg = extrairTracosEntries(d.antecedente?.entries, `Antecedente (${f.antecedente})`);
  f.caracteristicas = [...tracosRaca, ...tracosBg].map((t) => ({ id: uid(), ...t }));

  return f;
}

export const ATRIBUTOS_PADRAO: Record<AtributoKey, number> = { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 };
/** Distribuição padrão (standard array) na ordem for, des, con, int, sab, car. */
export const ARRAY_PADRAO = [15, 14, 13, 12, 10, 8];
export const aplicarArrayPadrao = (): Record<AtributoKey, number> =>
  Object.fromEntries(ATRIBUTOS.map((k, i) => [k, ARRAY_PADRAO[i]])) as Record<AtributoKey, number>;
