FLUXBOX

Sistema web de controle de almoxarifado com autenticação, controle de estoque, movimentações, alertas, relatórios e mapa interativo.

Visão geral

O FLUXBOX foi desenvolvido para organizar o almoxarifado de ferramentas e insumos, reduzindo erros de estocagem, melhorando a rastreabilidade dos itens e facilitando a operação diária.

O sistema permite controlar entradas e saídas de materiais, identificar itens em uso, localizar ferramentas por setor/localização e acompanhar alertas de estoque baixo.

Funcionalidades

Login de usuários com autenticação

Controle de perfis (admin e user)

Cadastro, edição e exclusão de itens

Controle de estoque com quantidade total e disponível

Check-in e check-out de ferramentas

Alertas automáticos de estoque baixo

Histórico de movimentações

Relatórios com gráficos

Tela de ferramentas em uso

Mapa interativo do almoxarifado

Gestão de usuários (somente administrador)


Perfis de acesso

Administrador

Pode acessar:

Painel

Estoque

Em Uso

Mapa

Movimentações

Relatórios

Alertas

Usuários


Pode:

cadastrar itens

editar itens

excluir itens

alterar perfil de usuários

visualizar relatórios


Usuário comum

Pode acessar:

Painel

Em Uso

Mapa

Alertas


Não pode acessar:

Estoque

Movimentações

Relatórios

Usuários


Tecnologias utilizadas

Front-end

React

TypeScript

Vite

Tailwind CSS

Framer Motion / Motion

Lucide React

Recharts


Back-end / Banco

Supabase

PostgreSQL

Supabase Auth

Row Level Security (RLS)

Triggers SQL

Realtime


Estrutura principal do sistema

src/
├── components/
│   ├── Auth.tsx
│   └── ReportsView.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── App.tsx
└── types.ts

Banco de dados

O projeto utiliza as tabelas principais abaixo:

profiles

locations

items

movements

alerts


Resumo das tabelas

profiles

Armazena os usuários do sistema e seus perfis de acesso.

locations

Armazena os locais físicos do almoxarifado, usados no mapa interativo.

items

Armazena os itens do estoque com nome, código, categoria, quantidade, unidade e localização.

movements

Registra check-in e check-out realizados pelos usuários.

alerts

Armazena alertas automáticos gerados pelo sistema.

Regras de negócio principais

Cada item possui quantidade total e quantidade disponível.

O check-out não pode retirar mais do que há disponível.

O check-in não pode devolver mais do que a quantidade total do item.

Quando a quantidade disponível fica abaixo do mínimo, o sistema gera alerta.

O sistema registra quem movimentou cada item.

Administradores possuem permissões ampliadas.


Mapa do almoxarifado

O mapa interativo representa os racks e zonas do almoxarifado, permitindo visualizar:

onde o item está localizado

quantidade em uso

status visual por localização

detalhes dos itens por rack


Exemplos de locais usados no sistema:

A1, A2, A3

A11, A12, A13

B1, B7, B8, B9

C4, C6, C8, C10, C11, C12

RACK C

RACK D


Como rodar o projeto

1. Instalar dependências

npm install

2. Configurar variáveis de ambiente

Crie um arquivo .env com:

VITE_SUPABASE_URL=SUASUPABASEURL
VITE_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY

3. Rodar em desenvolvimento

npm run dev

4. Build de produção

npm run build

Configuração do Supabase

1. Criar projeto no Supabase


2. Rodar o schema SQL do projeto


3. Configurar as variáveis de ambiente


4. Confirmar as policies e triggers


5. Cadastrar localizações do almoxarifado



Fluxo de uso

Administrador

1. Faz login


2. Cadastra os locais do almoxarifado


3. Cadastra itens no estoque


4. Acompanha alertas


5. Gere usuários e relatórios



Usuário comum

1. Faz login


2. Consulta painel


3. Verifica ferramentas em uso


4. Consulta mapa do almoxarifado


5. Acompanha alertas



Situação atual do projeto

O sistema já possui:

autenticação

controle de estoque

edição e exclusão de itens

check-in / check-out

alertas

histórico

relatórios com gráfico

gestão de usuários

mapa interativo

tela de ferramentas em uso


Melhorias futuras

exportação de relatórios em PDF/Excel

filtros avançados por período

notificações mais detalhadas

melhoria visual do mapa

auditoria avançada de movimentações

versão PWA / web app


Objetivo do projeto

O FLUXBOX busca melhorar a organização e a eficiência do almoxarifado, oferecendo controle digital sobre ferramentas e insumos usados na manutenção, com foco em rastreabilidade, localização, estoque e produtividade.

Autor:Gabriel Silva Passos

Projeto FLUXBOX.

