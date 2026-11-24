import { clamp } from '@/utils/calc';

import { useDiceStore } from './useDiceStore';
import { setField, useFichaStore } from './useFichaStore';

/** Altera os PV atuais; dano consome PV temporários primeiro e dispara lembrete de Concentração se ativo. */
export function alterarPv(delta: number) {
  const f = useFichaStore.getState().ficha;
  if (!f || useFichaStore.getState().readOnly) return;
  const danoOriginal = delta < 0 ? -delta : 0;

  let { atual } = f.pv;
  const { temp, total } = f.pv;
  if (delta < 0 && temp > 0) {
    const absorvido = Math.min(temp, -delta);
    setField('pv.temp', temp - absorvido);
    delta += absorvido;
  }
  atual = clamp(atual + delta, 0, total);
  setField('pv.atual', atual);

  if (danoOriginal > 0 && f.concentrando?.trim()) {
    useDiceStore.getState().dispararAlertaConcentracao(danoOriginal, f.concentrando.trim());
  }
}

/**
 * Descanso Curto:
 * - Restaura todos os Recursos de Classe marcados como 'curto'.
 * - Se for Bruxo (Warlock), restaura também os espaços de magia de Pacto.
 */
export function descansoCurto() {
  const f = useFichaStore.getState().ficha;
  if (!f || useFichaStore.getState().readOnly) return;

  if (f.recursos?.length) {
    setField(
      'recursos',
      f.recursos.map((r) => (r.descanso === 'curto' ? { ...r, usados: 0 } : r)),
    );
  }

  const classeNome = `${f.classe} ${f.conjurador.classe}`.toLowerCase();
  if (classeNome.includes('warlock') || classeNome.includes('bruxo')) {
    for (let n = 1; n <= 9; n++) {
      const s = f.conjurador.slots?.[String(n)];
      if (s && s.usados > 0) {
        setField(`conjurador.slots.${n}.usados`, 0);
      }
    }
  }
}

/**
 * Descanso Longo (regras D&D 5e):
 * - Recupera todos os PV (pv.atual = pv.total) e zera PV temporários.
 * - Recupera Dados de Vida gastos até metade do nível total (mínimo 1).
 * - Restaura todos os espaços de magia usados (níveis 1 a 9).
 * - Restaura todos os Recursos de Classe (curto e longo).
 * - Reduz o nível de Exaustão em 1 e zera testes contra a morte.
 */
export function descansoLongo() {
  const f = useFichaStore.getState().ficha;
  if (!f || useFichaStore.getState().readOnly) return;

  setField('pv.atual', f.pv.total);
  setField('pv.temp', 0);

  const recuperaDv = Math.max(1, Math.floor(f.nivel / 2));
  const novosUsados = Math.max(0, f.dadosVida.usados - recuperaDv);
  setField('dadosVida.usados', novosUsados);

  setField('morte', { sucessos: 0, falhas: 0 });

  if ((f.exaustao ?? 0) > 0) {
    setField('exaustao', Math.max(0, (f.exaustao ?? 0) - 1));
  }

  if (f.recursos?.length) {
    setField(
      'recursos',
      f.recursos.map((r) => ({ ...r, usados: 0 })),
    );
  }

  for (let n = 1; n <= 9; n++) {
    const s = f.conjurador.slots?.[String(n)];
    if (s && s.usados > 0) {
      setField(`conjurador.slots.${n}.usados`, 0);
    }
  }
}
