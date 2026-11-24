import { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';

import {
  atualizarIniciativasMesa,
  DadosMesa,
  IniciativaItem,
  ouvirMesa,
  registrarRolagemNaMesa,
} from '@/services/mesa';

import { useFichaStore } from './useFichaStore';

export type ModoRolagem = 'normal' | 'vantagem' | 'desvantagem';

export interface ResultadoRolagem {
  id: string;
  titulo: string;
  formula: string;
  dados: number[];
  dadoEscolhido?: number;
  bonus: number;
  total: number;
  modo: ModoRolagem;
  critico: 'sucesso' | 'falha' | null;
  /** se veio de um ataque, permite rolar o dano direto do banner */
  danoFormula?: string;
  tipoDano?: string;
  ehTesteD20: boolean;
  timestamp: number;
}

interface DiceState {
  ultima: ResultadoRolagem | null;
  historico: ResultadoRolagem[];
  bandejaAberta: boolean;
  alertaConcentracao: { dano: number; cd: number; magia: string } | null;
  codigoMesa: string | null;
  dadosMesa: DadosMesa | null;
  conectarMesa: (codigo: string) => void;
  desconectarMesa: () => void;
  adicionarIniciativaManual: (nome: string, valor: number) => Promise<void>;
  avancarTurnoMesa: () => Promise<void>;
  limparIniciativasMesa: () => Promise<void>;
  rolarD20: (
    titulo: string,
    bonus: number,
    modo?: ModoRolagem,
    opcoes?: { danoFormula?: string; tipoDano?: string },
  ) => ResultadoRolagem;
  rolarFormula: (titulo: string, formula: string, criticoDobrarDados?: boolean) => ResultadoRolagem;
  fecharBanner: () => void;
  setBandejaAberta: (v: boolean) => void;
  dispararAlertaConcentracao: (dano: number, magia: string) => void;
  limparAlertaConcentracao: () => void;
}

const rollDie = (faces: number) => 1 + Math.floor(Math.random() * faces);
let unsubMesa: Unsubscribe | null = null;

export const useDiceStore = create<DiceState>((set, get) => {
  const enviarParaMesa = (res: ResultadoRolagem) => {
    const codigo = get().codigoMesa;
    if (!codigo) return;
    const personagem = useFichaStore.getState().ficha?.titulo || 'Mestre';
    void registrarRolagemNaMesa(
      codigo,
      {
        id: res.id,
        personagem,
        titulo: res.titulo,
        formula: res.formula,
        total: res.total,
        critico: res.critico,
        timestamp: res.timestamp,
      },
      res.titulo.toLowerCase().includes('iniciativa'),
    );
  };

  return {
    ultima: null,
    historico: [],
    bandejaAberta: false,
    alertaConcentracao: null,
    codigoMesa: null,
    dadosMesa: null,

    conectarMesa: (codigoRaw) => {
      const codigo = codigoRaw.trim().toUpperCase();
      if (!codigo) return;
      unsubMesa?.();
      set({ codigoMesa: codigo });
      unsubMesa = ouvirMesa(codigo, (dadosMesa) => set({ dadosMesa }));
    },

    desconectarMesa: () => {
      unsubMesa?.();
      unsubMesa = null;
      set({ codigoMesa: null, dadosMesa: null });
    },

    adicionarIniciativaManual: async (nome, valor) => {
      const { codigoMesa, dadosMesa } = get();
      if (!codigoMesa || !dadosMesa || !nome.trim()) return;
      const novo: IniciativaItem = {
        id: Math.random().toString(36).slice(2, 9),
        nome: nome.trim(),
        valor,
      };
      await atualizarIniciativasMesa(
        codigoMesa,
        [...dadosMesa.iniciativas, novo],
        dadosMesa.turnoIdx,
      );
    },

    avancarTurnoMesa: async () => {
      const { codigoMesa, dadosMesa } = get();
      if (!codigoMesa || !dadosMesa || dadosMesa.iniciativas.length === 0) return;
      const prox = (dadosMesa.turnoIdx + 1) % dadosMesa.iniciativas.length;
      await atualizarIniciativasMesa(codigoMesa, dadosMesa.iniciativas, prox);
    },

    limparIniciativasMesa: async () => {
      const { codigoMesa } = get();
      if (!codigoMesa) return;
      await atualizarIniciativasMesa(codigoMesa, [], 0);
    },

    rolarD20: (titulo, bonus, modo = 'normal', opcoes) => {
      const d1 = rollDie(20);
      const d2 = rollDie(20);
      const dados = modo === 'normal' ? [d1] : [d1, d2];
      const dadoEscolhido =
        modo === 'vantagem' ? Math.max(d1, d2) : modo === 'desvantagem' ? Math.min(d1, d2) : d1;
      const total = dadoEscolhido + bonus;
      const critico = dadoEscolhido === 20 ? 'sucesso' : dadoEscolhido === 1 ? 'falha' : null;
      const sinal = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      const res: ResultadoRolagem = {
        id: Math.random().toString(36).slice(2, 9),
        titulo,
        formula: `${modo === 'normal' ? '1d20' : '2d20'}${sinal}`,
        dados,
        dadoEscolhido,
        bonus,
        total,
        modo,
        critico,
        danoFormula: opcoes?.danoFormula,
        tipoDano: opcoes?.tipoDano,
        ehTesteD20: true,
        timestamp: Date.now(),
      };
      set({ ultima: res, historico: [res, ...get().historico].slice(0, 20) });
      enviarParaMesa(res);
      return res;
    },

    rolarFormula: (titulo, formulaRaw, criticoDobrarDados = false) => {
      const limpa = formulaRaw.replace(/\s+/g, '').toLowerCase();
      const match = limpa.match(/^(\d*)d(\d+)([+-]\d+)?$/);
      let qtd = match ? Math.max(1, parseInt(match[1] || '1', 10)) : 1;
      const faces = match ? Math.max(2, parseInt(match[2], 10)) : 6;
      const bonus = match && match[3] ? parseInt(match[3], 10) : 0;

      if (criticoDobrarDados) qtd *= 2;

      const dados = Array.from({ length: Math.min(qtd, 50) }, () => rollDie(faces));
      const somaDados = dados.reduce((acc, n) => acc + n, 0);
      const total = Math.max(0, somaDados + bonus);
      const sinal = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : '';

      const res: ResultadoRolagem = {
        id: Math.random().toString(36).slice(2, 9),
        titulo,
        formula: `${qtd}d${faces}${sinal}`,
        dados,
        bonus,
        total,
        modo: 'normal',
        critico: null,
        ehTesteD20: false,
        timestamp: Date.now(),
      };
      set({ ultima: res, historico: [res, ...get().historico].slice(0, 20) });
      enviarParaMesa(res);
      return res;
    },

    fecharBanner: () => set({ ultima: null }),
    setBandejaAberta: (bandejaAberta) => set({ bandejaAberta }),
    dispararAlertaConcentracao: (dano, magia) => {
      const cd = Math.max(10, Math.floor(Math.abs(dano) / 2));
      set({ alertaConcentracao: { dano: Math.abs(dano), cd, magia } });
    },
    limparAlertaConcentracao: () => set({ alertaConcentracao: null }),
  };
});
