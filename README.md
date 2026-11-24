# Fichas D&D (5e)

Gerenciador completo de fichas de personagem, grimório, compêndio de regras e mesa ao vivo para **Dungeons & Dragons 5ª Edição**, construído com **Expo (React Native)**, **Expo Router**, **Zustand** e **Firebase** para funcionar de forma unificada no **PC (Web)** e no **Celular (Android/iOS)**.

Desenvolvido por **Eduardo Cardoso Oliveira** ([Instagram @Edu0_22_](https://instagram.com/Edu0_22_)).

---

## Onde Acessar e Baixar

### 1. Versão Web (PC e Navegador)
Acesse diretamente pelo navegador (sem precisar instalar nada), com layout responsivo de 2 colunas no computador:
* **Site oficial:** https://fichas-5e.web.app

### 2. Aplicativo Android (.apk)
* **Download do APK (Google Drive):** <a href="https://drive.google.com/file/d/1RJ5Ufu94ekGsabk9pJpagazWOLECcK5Q/view?usp=sharing"  target="blank">Clique aqui!</a>
* **Como instalar no Android:**
  1. Baixe o arquivo `.apk` pelo link do Google Drive acima.
  2. Ao abrir o arquivo, caso o Android peça permissão, habilite **"Permitir instalação de fontes desconhecidas"** para o navegador ou gerenciador de arquivos.
  3. Conclua a instalação e abra o app **Fichas D&D**.
* **Atualizações Automáticas (OTA):**
  * Após instalar o `.apk`, novas telas, correções e livros são baixados automaticamente via **EAS Update** sempre que você abrir o aplicativo com internet.
  * Caso queira checar manualmente, abra o menu do seu avatar no canto superior direito e toque em **Verificar Atualizações**.

---

## Funcionalidades Principais

* **Criação Guiada de Personagens:**
  * Passo a passo com **Array Padrão**, **Compra por Pontos (27 pts)**, **Rolagem 4d6 (descartando o menor)** ou **Modo Homebrew/Customizado**.
  * Importação automática de bônus raciais, deslocamento, dados de vida, salvaguardas e traços iniciais.
* **Ficha Interativa para Uso na Mesa:**
  * Cabeçalho fixo de combate com **Pontos de Vida (+/- e segurar para +/-5)**, **CA**, **Iniciativa clicável**, **Inspiração**, **Concentração** (com aviso automático de TR de Constituição ao sofrer dano) e **Condições/Exaustão**.
  * **Toque para Rolar:** toque em qualquer atributo, salvaguarda, perícia ou ataque para rolar `1d20 + bônus` (segure para rolar com Vantagem) e rolar dano direto pelo banner de resultado.
  * Bandeja de dados livre flutuante (`d4` a `d100` e fórmulas customizadas como `8d6+3`).
  * Controle de **Recursos de Classe** (Fúria, Ki, Surto, etc.) com reset automático no **Descanso Curto** ou **Descanso Longo**.
  * Inventário com controle de **Sintonização (3/3)**, capacidade de carga, moedas (`PC, PP, PE, PO, PL`), criação rápida de ataque a partir de armas e card de **Companheiros / Familiar / Forma Selvagem**.
* **Grimório e Conjuração Inteligente:**
  * Cálculo automático de CD de Magia, Bônus de Ataque Mágico e espaços de magia por classe e nível.
  * Botão **Conjurar** com suporte a **Upcasting**, **Ritual**, desconto automático do espaço, ativação automática de Concentração e chips clicáveis para rolar os dados descritos na magia.
* **Compêndio D&D 5e Integrado (Busca Bilíngue PT-BR e EN):**
  * Consome dados em JSON diretamente dos repositórios do **5etools** (Oficiais WotC e Suplementos Famosos de Terceiros, incluindo **Humblewood**, **Tal'Dorei Reborn / Blood Hunter**, **Grim Hollow**, **Dungeons of Drakkenheim**, **Kobold Press: Tome of Heroes**, **Valda's Spire of Secrets** e **MCDM: Illrigger**).
  * Permite pesquisar termos em português (ex.: *Bola de Fogo*, *Corvo*, *Bruxo*) e adicionar Talentos, Itens e Criaturas do Bestiário direto para a ficha aberta.
* **Sala de Mesa ao Vivo e Escudo do Mestre:**
  * Compartilhe sua ficha em modo leitura com o Mestre ou conecte o grupo em uma sala pelo código (ex.: `MESA-D20`) para sincronizar **Ordem de Iniciativa** e **Feed de Rolagens** em tempo real.
* **Perfil Personalizável, Amigos Mútuos e Temas:**
  * Foto própria ou ícone vetorial, código de amigo (`D20-XXXXX`), sistema de **Solicitação de Amizade** mútua (enviar, aceitar e recusar), compartilhamento rápido de ficha e entrada direta na sala do amigo.
  * Suporte a **Modo Claro / Escuro / Sistema** e **5 Paletas de Cor Personalizáveis** (Carmesim, Arcano, Esmeralda, Dourado e Abissal).

---

## Estrutura de Pastas

```text
ficha-rpg-5e/
├── .github/workflows/       # Automacoes de CI, Deploy Web/OTA e Build Android
├── assets/images/           # Icone do app (d20), splash screen e favicon
├── public/fonts/            # Fontes de icones cacheadas para o build Web
├── scripts/                 # Scripts utilitarios do projeto
├── src/
│   ├── app/                 # Rotas do Expo Router (tabs, login, ficha/[id], modais)
│   ├── components/          # Componentes reutilizaveis (CombatHeader, AtributoCard, UserMenuButton, etc.)
│   ├── constants/           # Paletas de cores, tipografia, espacamentos e breakpoints (theme.ts)
│   ├── hooks/               # Hooks de tema e esquema de cores
│   ├── screens/             # Telas principais (Fichas, Principal, Magias, Lore, Compendio, Perfil, Login)
│   ├── services/            # Integracao Firebase (Auth, Firestore, Perfil, Mesa) e API JSON 5etools
│   ├── store/               # Gerenciamento de estado global com Zustand
│   ├── types/               # Tipagens TypeScript da ficha de D&D 5e
│   └── utils/               # Calculos de regras 5e, dicionario PT-BR/EN e exportacao PDF/HTML
├── app.json                 # Configuracao do Expo (nome, icone, pacote Android, EAS Update)
├── eas.json                 # Perfis de build do EAS (preview APK e production)
├── firebase.json            # Configuracao do Firebase Hosting e Firestore Rules
├── firestore.rules          # Regras de seguranca do Cloud Firestore
└── package.json             # Dependencias e scripts npm
```

---

## Como Rodar Localmente

### Pré-requisitos
* **Node.js** (v20 ou superior)
* **npm**
* Para testar no celular sem gerar `.apk`: aplicativo **Expo Go** instalado no Android ou iOS.

### 1. Instalar dependências
```powershell
npm install
```

### 2. Configurar variáveis de ambiente (Firebase)
Copie o arquivo `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Firebase:
```powershell
copy .env.example .env.local
```

### 3. Iniciar em modo desenvolvimento
```powershell
# Rodar o Site Web no navegador (PC)
npx expo start --web

# Rodar com QR Code para abrir no Expo Go (Celular)
npx expo start

# Limpar cache do Metro caso necessario
npx expo start --web --clear
```

---

## Validação e Deploy Manual

### Verificações de código
```powershell
npx tsc --noEmit        # Verificacao de tipos TypeScript
npx expo lint           # Lint (ESLint + regras Expo)
npx expo-doctor         # Diagnostico de dependencias do projeto
```

### Publicar Site Web e Regras do Firebase
```powershell
npx expo export --platform web
npx firebase-tools deploy --only firestore:rules,hosting
```

### Publicar Atualização OTA e Novo APK (EAS)
```powershell
# Enviar atualizacao rapida (JS/telas/regras) para quem ja tem o APK instalado
npx eas-cli@latest update --channel preview --message "Descricao da atualizacao"

# Gerar novo instalador .apk na nuvem da Expo
npx eas-cli@latest build -p android --profile preview
```

---

## Automação com GitHub Actions

O repositório conta com 3 workflows em `.github/workflows/`:
1. **`ci.yml`:** Roda `tsc` e `expo lint` automaticamente em todos os Pull Requests e pushes.
2. **`deploy.yml`:** Ao fazer push na branch `master` (ou `main`), valida o código, exporta o site Web, publica no **Firebase Hosting**, atualiza o **firestore.rules** e envia a atualização **OTA** via **EAS Update** automaticamente.
3. **`build-android.yml`:** Dispara o build de um novo `.apk` na nuvem da Expo ao criar uma tag de versão (ex.: `v1.1.0`) ou ao clicar em **Run workflow** na aba Actions do GitHub.

### Secrets necessários no GitHub (`Settings > Secrets and variables > Actions`)
Para que o `deploy.yml` e o `build-android.yml` funcionem automaticamente no GitHub, cadastre os seguintes secrets:
* `EXPO_TOKEN` (Token de acesso gerado em expo.dev)
* `FIREBASE_SERVICE_ACCOUNT` (JSON da conta de serviço do Firebase com permissão de Hosting e Firestore)
* `EXPO_PUBLIC_FIREBASE_API_KEY`
* `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
* `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
* `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
* `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
* `EXPO_PUBLIC_FIREBASE_APP_ID`
* `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

---

## Contribuindo com Ideias e Feedback

Sugestões de novos recursos, melhorias de usabilidade ou correções de bugs são muito bem-vindas, mesmo que você não programe.

### Como enviar sua ideia
1. Acesse a aba **Issues** aqui no repositório do GitHub.
2. Clique em **New issue** e selecione o modelo **Sugestão de Ideia ou Melhoria**.
3. Descreva o que você gostaria de ver no app ou no site e como isso ajudaria na sua mesa de RPG.

Se preferir contribuir com código, fique à vontade para abrir um Pull Request com a descrição da mudança.

---

## Licença

Consulte o arquivo [LICENSE](LICENSE) neste repositório.
