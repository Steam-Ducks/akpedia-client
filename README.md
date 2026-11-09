# akpedia-client

Repositório destinado ao **frontend** do projeto **Akpedia**, construído com
**Vue 3 + TypeScript** e **Vite**.

O client é a interface do usuário: login, upload de documentos, cadastro de
metadados, consulta e busca semântica.

---

## Requisitos

- **Só Docker** (recomendado): [Docker](https://www.docker.com/) + Docker Compose.
- **Desenvolvimento local**: Node.js 20+. O `npm` acompanha o Node.

---

## Rodando com Docker (qualquer máquina)

Buildar e servir a aplicação (Nginx servindo os estáticos):

```bash
docker compose up --build
```

- App disponível em `http://localhost:5173`
- A URL do backend é definida em build via `VITE_API_BASE_URL`
  (default `http://localhost:8080`). Copie `.env.example` para `.env` para ajustar.

Para parar:

```bash
docker compose down
```

---

## Estrutura

```bash
akpedia-client/
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js # regras de lint (ESLint)
├── .prettierrc.json # formatação (Prettier)
├── Dockerfile # multi-stage: build Node → runtime Nginx
├── docker-compose.yml
├── nginx.conf # fallback SPA
├── .dockerignore
├── .gitignore
├── .env.example
├── index.html
├── README.md
└── src/
    ├── main.ts # bootstrap da aplicação Vue
    ├── App.vue # componente raiz
    ├── config/api.ts # base URL do akpedia-server (VITE_API_BASE_URL)
    ├── services/auth.ts # login no Keycloak e dados do usuário logado
    ├── services/api.ts # fetch para a API com o token do usuário
    └── components/
        ├── HealthStatus.vue # verifica a conexão com o backend
        └── __tests__/ # testes (Vitest)
```

---

## Configuração

A aplicação lê a URL do backend a partir de variável de ambiente (com default para dev):

| Variável                  | Default                 | Descrição                           |
| ------------------------- | ----------------------- | ----------------------------------- |
| `VITE_API_BASE_URL`       | `http://localhost:8080` | URL base da API do `akpedia-server` |
| `VITE_KEYCLOAK_URL`       | `<origem do app>/auth`  | Keycloak onde o usuário faz login   |
| `VITE_KEYCLOAK_REALM`     | `akpedia`               | Realm do Keycloak                   |
| `VITE_KEYCLOAK_CLIENT_ID` | `akpedia-client`        | Client público do realm             |

> Variáveis `VITE_*` são resolvidas em **tempo de build**, ao usar Docker, ela é passada como build arg no `docker-compose.yml`.

---

## Login

A aplicação só abre com o usuário logado. Ao entrar, o navegador vai para a tela de login do
Keycloak (client `akpedia-client`, com PKCE) e volta logado; o Keycloak e os usuários de teste
estão no README do `akpedia-server`.

- Toda chamada à API leva o token do usuário (`src/services/api.ts`), renovado antes de expirar.
  Se o servidor recusar o token (401), o navegador volta para o login.
- O nome, o e-mail e o setor aparecem no menu do avatar, no cabeçalho, com o botão **Sair**,
  que encerra a sessão também no Keycloak.
- Cada página declara os papéis que a abrem, com `definePage({ meta: { roles } })`: `/review`
  para `APPROVER` e `ADMIN`, `/admin/*` só para `ADMIN`. O menu mostra só o que o papel usa, e
  quem abre uma página dessas pela URL sem o papel vai para `/no-permission`, que explica o
  motivo (`src/route-access.ts`). O servidor recusa essas rotas de qualquer forma.
- **Termos de uso**: depois do login, quem ainda não aceitou a versão atual vê os termos antes de
  qualquer tela. **Aceitar** libera o app; **Recusar e sair** encerra a sessão. Enquanto não houver
  aceite, o servidor recusa as outras chamadas (403 `terms_not_accepted`), e se uma versão nova
  for publicada com o usuário no app, a tela de termos volta. Os administradores (`ADMIN`)
  publicam as versões em **Administração › Termos de uso** (`/admin/terms`), partindo do texto
  da versão atual; cada publicação vira uma nova versão que todos, o admin incluído, precisam
  aceitar. Enquanto nenhuma versão for publicada, ninguém precisa aceitar nada.
- **Administração › Usuários** (`/admin/users`): busca por nome ou e-mail, filtros por setor e
  por papel, e status com o `AkStatusChip`. Salvar papéis, salvar os dados de alguém e
  desativar ou reativar pedem confirmação, e o erro do servidor aparece na tela (por exemplo,
  `last_admin` ao desativar o único administrador ativo, ou `cpf_taken`).
- **Administração › Permissões** (`/admin/permissions`): a grade de setores por categorias, com
  uma caixa por célula, salva por setor. Vale a partir da próxima busca.
- O login exige um contexto seguro (`localhost` ou HTTPS): fora dele o navegador não oferece
  o Web Crypto que o PKCE usa.

---

## Comandos úteis

```bash
npm run dev # dev server
npm run build # type-check + build de produção em dist/
npm run preview # serve o build de produção localmente
npm run test # roda os testes (Vitest)
npm run lint # ESLint + Prettier (--check)
npm run format # aplica a formatação do Prettier
```

---

## Rodando testes e lint localmente

Antes de abrir um PR, rode localmente as mesmas checagens do CI.

### Testes de qualidade

Os testes rodam com **Vitest** e não dependem de backend nem de banco:

```bash
npm run test
```

### Lint (ESLint + Prettier)

```bash
npm run lint
```

> O ESLint apenas **aponta** as violações; o Prettier cuida da formatação. Use `npm run format` para aplicar a formatação automaticamente.

---

## Padrões de contribuição (CI)

Todo Pull Request com destino à branch `develop` passa por um pipeline no GitHub
Actions (`.github/workflows/ci.yml`). O merge só é liberado após o pipeline passar
**e** a aprovação de outro membro da equipe.

### Nome da branch

Deve seguir o padrão `AKP-<número>`:

```text
AKP-12
```

### Mensagens de commit

Conventional Commits com o escopo do ticket — `type(AKP-<número>): descrição`:

```text
feat(AKP-12): adiciona tela de login
fix(AKP-15): corrige validação do formulário de upload
```

Tipos aceitos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, `revert`.

### O que o pipeline verifica

| Etapa                             | O que faz                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------- |
| **Padrão de branch & commits**    | Valida o nome da branch (`AKP-<número>`) e o padrão dos commits. Roda sempre. |
| **Lint (ESLint + Prettier)**      | Roda o lint. Executa apenas quando há mudanças em `src/**`.                   |
| **Testes de qualidade**           | Roda `npm run test` (Vitest). Executa apenas quando há mudanças em `src/**`.  |
| **Solicitar aprovação da equipe** | Após tudo passar, solicita a revisão de um membro da equipe.                  |

> Commits que só alteram configuração/estrutura (fora de `src/**`) não disparam lint nem testes de qualidade.

### Abrindo o PR

A descrição do PR é pré-preenchida pelo template em `.github/PULL_REQUEST_TEMPLATE.md`.
Preencha os campos e marque o checklist antes de solicitar revisão.
