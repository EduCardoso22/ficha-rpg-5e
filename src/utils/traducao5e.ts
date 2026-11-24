/**
 * Dicionário PT-BR -> EN dos termos, magias, classes, raças, talentos e itens mais buscados no D&D 5e.
 * Permite pesquisar tanto em português quanto em inglês nas telas do Compêndio e Busca de Magias.
 */
const MAPA_PT_EN: Record<string, string> = {
  // Classes
  artifice: 'artificer',
  barbaro: 'barbarian',
  bardo: 'bard',
  bruxo: 'warlock',
  clerigo: 'cleric',
  druida: 'druid',
  feiticeiro: 'sorcerer',
  guerreiro: 'fighter',
  ladino: 'rogue',
  mago: 'wizard',
  monge: 'monk',
  paladino: 'paladin',
  patrulheiro: 'ranger',
  'cacador de sangue': 'blood hunter',
  apotecario: 'apothecary',
  alquimista: 'alchemist',
  pistoleiro: 'gunslinger',
  investigador: 'investigator',
  necromante: 'necromancer',
  bruxa: 'witch',
  guardiao: 'warden',

  // Raças (Oficiais + Humblewood + Cenários)
  anao: 'dwarf',
  elfo: 'elf',
  'meio-elfo': 'half-elf',
  'meio-orc': 'half-orc',
  humano: 'human',
  draconato: 'dragonborn',
  gnomo: 'gnome',
  pequenino: 'halfling',
  tiferino: 'tiefling',
  golias: 'goliath',
  tabaxi: 'tabaxi',
  goblin: 'goblin',
  kobold: 'kobold',
  vampiro: 'dhampir',
  dampiro: 'dhampir',
  renascido: 'reborn',
  plasmoide: 'plasmoid',
  fada: 'fairy',
  coelho: 'harengon',
  coruja: 'owlin',
  corvo: 'corvum',
  cervo: 'cervan',
  veado: 'cervan',
  galo: 'gallus',
  galinha: 'gallus',
  ourico: 'hedge',
  rato: 'jerbeen',
  pombo: 'luma',
  guaxinim: 'mapach',
  aguia: 'raptor',
  falcao: 'raptor',
  raposa: 'vulpin',
  centauro: 'centaur',
  minotauro: 'minotaur',
  satiro: 'satyr',
  leonino: 'leonin',
  loxodonte: 'loxodon',
  tartaruga: 'tortle',

  // Magias clássicas
  'bola de fogo': 'fireball',
  'misseis magicos': 'magic missile',
  'missil magico': 'magic missile',
  'curar ferimentos': 'cure wounds',
  'palavra curativa': 'healing word',
  'escudo arcano': 'shield',
  'escudo da fe': 'shield of faith',
  'passo nebuloso': 'misty step',
  contrafeitico: 'counterspell',
  'contra-magica': 'counterspell',
  relampago: 'lightning bolt',
  'rajada mistica': 'eldritch blast',
  bencao: 'bless',
  perdicao: 'bane',
  'marca do cacador': "hunter's mark",
  bruxaria: 'hex',
  invisibilidade: 'invisibility',
  voo: 'fly',
  voar: 'fly',
  revivificar: 'revivify',
  'onda trovejante': 'thunderwave',
  'maos flamejantes': 'burning hands',
  'raio de fogo': 'fire bolt',
  'raio de gelo': 'ray of frost',
  'toque chocante': 'shocking grasp',
  'raio guia': 'guiding bolt',
  'chama sagrada': 'sacred flame',
  'arma espiritual': 'spiritual weapon',
  'espiritos guardioes': 'spirit guardians',
  'dissipar magia': 'dispel magic',
  metamorfose: 'polymorph',
  banimento: 'banishment',
  'muralha de fogo': 'wall of fire',
  'cone de frio': 'cone of cold',
  teleporte: 'teleport',
  desejo: 'wish',
  'armadura arcana': 'mage armor',
  'maos magicas': 'mage hand',
  prestidigitacao: 'prestidigitation',
  taumaturgia: 'thaumaturgy',
  'ilusao menor': 'minor illusion',
  'zombaria viciosa': 'vicious mockery',
  'detectar magia': 'detect magic',
  identificar: 'identify',
  sono: 'sleep',
  'riso histérico de tasha': "tasha's hideous laughter",
  'imobilizar pessoa': 'hold person',
  silencio: 'silence',
  escuridao: 'darkness',
  velocidade: 'haste',
  lentidao: 'slow',
  'bola de fogo adiada': 'delayed blast fireball',
  'palavra de poder matar': 'power word kill',
  'palavra de poder curar': 'power word heal',

  // Itens e armas
  'espada longa': 'longsword',
  'espada curta': 'shortsword',
  'espada grande': 'greatsword',
  machado: 'axe',
  'machado grande': 'greataxe',
  adaga: 'dagger',
  rapiera: 'rapier',
  'arco longo': 'longbow',
  'arco curto': 'shortbow',
  besta: 'crossbow',
  cajado: 'quarterstaff',
  escudo: 'shield',
  'cota de malha': 'chain mail',
  'armadura de placas': 'plate armor',
  'armadura de couro': 'leather armor',
  'pocao de cura': 'potion of healing',
  'bolsa de armazenamento': 'bag of holding',

  // Talentos (Feats)
  sentinela: 'sentinel',
  'mestre de armas grandes': 'great weapon master',
  'atirador agucado': 'sharpshooter',
  'conjurador de guerra': 'war caster',
  sortudo: 'lucky',
  alerta: 'alert',
  robusto: 'tough',
  resiliente: 'resilient',
  observador: 'observant',
  mobilidade: 'mobile',
};

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Recebe um termo digitado pelo usuário (em PT-BR ou EN) e retorna uma lista de termos
 * normalizados para comparar contra o nome em inglês do 5etools.
 */
export function termosBuscaBilingue(q: string): string[] {
  const limpo = semAcento(q);
  if (!limpo) return [];
  const termos = new Set<string>([limpo, q.trim().toLowerCase()]);

  for (const [pt, en] of Object.entries(MAPA_PT_EN)) {
    if (pt.includes(limpo) || limpo.includes(pt)) {
      termos.add(en.toLowerCase());
    }
  }
  return [...termos];
}

/** Verifica se um nome em inglês do 5etools corresponde à busca (em inglês ou português). */
export function bateBuscaBilingue(nomeIngles: string, query: string): boolean {
  const termos = termosBuscaBilingue(query);
  if (termos.length === 0) return true;
  const alvo = nomeIngles.toLowerCase();
  return termos.some((t) => alvo.includes(t));
}
