export const ATRIBUTOS = ['for', 'des', 'con', 'int', 'sab', 'car'] as const;
export type AtributoKey = (typeof ATRIBUTOS)[number];

export const ATRIBUTO_NOMES: Record<AtributoKey, string> = {
  for: 'Força',
  des: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  sab: 'Sabedoria',
  car: 'Carisma',
};

export const PERICIAS: { key: string; nome: string; atributo: AtributoKey }[] = [
  { key: 'acrobacia', nome: 'Acrobacia', atributo: 'des' },
  { key: 'adestrarAnimais', nome: 'Adestrar Animais', atributo: 'sab' },
  { key: 'arcanismo', nome: 'Arcanismo', atributo: 'int' },
  { key: 'atletismo', nome: 'Atletismo', atributo: 'for' },
  { key: 'atuacao', nome: 'Atuação', atributo: 'car' },
  { key: 'enganacao', nome: 'Enganação', atributo: 'car' },
  { key: 'furtividade', nome: 'Furtividade', atributo: 'des' },
  { key: 'historia', nome: 'História', atributo: 'int' },
  { key: 'intimidacao', nome: 'Intimidação', atributo: 'car' },
  { key: 'intuicao', nome: 'Intuição', atributo: 'sab' },
  { key: 'investigacao', nome: 'Investigação', atributo: 'int' },
  { key: 'medicina', nome: 'Medicina', atributo: 'sab' },
  { key: 'natureza', nome: 'Natureza', atributo: 'int' },
  { key: 'percepcao', nome: 'Percepção', atributo: 'sab' },
  { key: 'persuasao', nome: 'Persuasão', atributo: 'car' },
  { key: 'prestidigitacao', nome: 'Prestidigitação', atributo: 'des' },
  { key: 'religiao', nome: 'Religião', atributo: 'int' },
  { key: 'sobrevivencia', nome: 'Sobrevivência', atributo: 'sab' },
];

/** 0 = sem proficiência, 1 = proficiente, 2 = especialista */
export type Proficiencia = 0 | 1 | 2;

export interface MagiaRef {
  /** nome original (inglês) vindo do 5etools ou customizado (Homebrew) */
  nome: string;
  fonte: string;
  nivel: number;
  escola?: string;
  /** se a magia está preparada para o dia */
  preparada?: boolean;
  /** descrição manual para magias Homebrew */
  descricaoCustom?: string;
}

export interface Ataque {
  id: string;
  nome: string;
  bonus: string;
  dano: string;
  alcance?: string;
  tipoDano?: string;
}

export interface Moedas {
  pc: number;
  pp: number;
  pe: number;
  po: number;
  pl: number;
}

export const MOEDA_KEYS = ['pc', 'pp', 'pe', 'po', 'pl'] as const;
export type MoedaKey = (typeof MOEDA_KEYS)[number];
export const MOEDA_LABELS: Record<MoedaKey, { sigla: string; cor: string }> = {
  pc: { sigla: 'PC', cor: '#B87333' },
  pp: { sigla: 'PP', cor: '#9EA7B0' },
  pe: { sigla: 'PE', cor: '#607D8B' },
  po: { sigla: 'PO', cor: '#D4AF37' },
  pl: { sigla: 'PL', cor: '#7B9095' },
};

export interface ItemEquipamento {
  id: string;
  nome: string;
  qtd?: string;
  descricao?: string;
  equipado?: boolean;
  sintonizado?: boolean;
  peso?: number;
}

export interface Companheiro {
  id: string;
  nome: string;
  /** ex.: Forma Selvagem, Familiar, Companheiro Animal, Montaria */
  tipo?: string;
  ca: number;
  pvAtual: number;
  pvTotal: number;
  deslocamento?: string;
  descricao?: string;
}

export interface NotaSessao {
  id: string;
  titulo: string;
  texto: string;
}

export interface Caracteristica {
  id: string;
  nome: string;
  /** ex.: Raça, Classe, Talento, Antecedente */
  origem?: string;
  descricao?: string;
}

export interface RecursoClasse {
  id: string;
  nome: string;
  total: number;
  usados: number;
  descanso: 'curto' | 'longo';
}

export const CONDICOES_5E = [
  'Abalado',
  'Agarrado',
  'Amedrontado',
  'Atordoado',
  'Caído',
  'Cego',
  'Enfeitiçado',
  'Envenenado',
  'Impedido',
  'Incapacitado',
  'Inconsciente',
  'Invisível',
  'Paralisado',
  'Petrificado',
  'Surdo',
] as const;

export interface Slot {
  total: number;
  usados: number;
}

export interface Lore {
  nome: string;
  idade: string;
  altura: string;
  peso: string;
  olhos: string;
  pele: string;
  cabelos: string;
  aparencia: string;
  /** data URI JPEG pequeno (<= ~30KB) guardado direto no documento */
  avatar: string;
  historia: string;
  aliados: string;
  outras: string;
  tesouro: string;
}

export interface Ficha {
  id: string;
  ownerId: string;
  ownerEmail: string;
  /** e-mails (minúsculos) com acesso de LEITURA, ex.: o mestre */
  sharedWithEmails: string[];
  /** duplicado do lore.nome para listagens */
  titulo: string;
  jogador?: string;
  classe: string;
  subclasse?: string;
  multiclasse?: string;
  raca: string;
  antecedente?: string;
  nivel: number;
  atributos: Record<AtributoKey, number>;
  ca: number;
  iniciativaExtra: number;
  deslocamento: number;
  pv: { atual: number; total: number; temp: number };
  dadosVida: { faces: number; total: number; usados: number };
  morte: { sucessos: number; falhas: number };
  salvaguardas: Record<AtributoKey, boolean>;
  pericias: Record<string, Proficiencia>;
  inspiracao?: boolean;
  concentrando?: string;
  condicoes?: string[];
  exaustao?: number;
  recursos?: RecursoClasse[];
  ataques: Ataque[];
  moedas?: Moedas;
  itensEquipamento?: ItemEquipamento[];
  caracteristicas?: Caracteristica[];
  companheiros?: Companheiro[];
  diario?: NotaSessao[];
  equipamento: string;
  idiomasProf: string;
  personalidade: { tracos: string; ideais: string; ligacoes: string; defeitos: string };
  lore: Lore;
  conjurador: {
    classe: string;
    habilidade: AtributoKey | '';
    truques: MagiaRef[];
    /** chave "1".."9" */
    slots: Record<string, Slot>;
    magias: Record<string, MagiaRef[]>;
  };
  createdAt: number;
  updatedAt: number;
}

export function novaFicha(ownerId: string, ownerEmail: string, titulo: string): Omit<Ficha, 'id'> {
  const slots: Record<string, Slot> = {};
  const magias: Record<string, MagiaRef[]> = {};
  for (let i = 1; i <= 9; i++) {
    slots[String(i)] = { total: 0, usados: 0 };
    magias[String(i)] = [];
  }
  const now = Date.now();
  return {
    ownerId,
    ownerEmail: ownerEmail.toLowerCase(),
    sharedWithEmails: [],
    titulo,
    classe: '',
    subclasse: '',
    multiclasse: '',
    raca: '',
    antecedente: '',
    nivel: 1,
    atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
    ca: 10,
    iniciativaExtra: 0,
    deslocamento: 9,
    pv: { atual: 10, total: 10, temp: 0 },
    dadosVida: { faces: 8, total: 1, usados: 0 },
    morte: { sucessos: 0, falhas: 0 },
    salvaguardas: { for: false, des: false, con: false, int: false, sab: false, car: false },
    pericias: {},
    inspiracao: false,
    concentrando: '',
    condicoes: [],
    exaustao: 0,
    recursos: [],
    ataques: [],
    moedas: { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 },
    itensEquipamento: [],
    caracteristicas: [],
    companheiros: [],
    diario: [],
    equipamento: '',
    idiomasProf: '',
    personalidade: { tracos: '', ideais: '', ligacoes: '', defeitos: '' },
    lore: {
      nome: titulo,
      idade: '',
      altura: '',
      peso: '',
      olhos: '',
      pele: '',
      cabelos: '',
      aparencia: '',
      avatar: '',
      historia: '',
      aliados: '',
      outras: '',
      tesouro: '',
    },
    conjurador: { classe: '', habilidade: '', truques: [], slots, magias },
    createdAt: now,
    updatedAt: now,
  };
}
