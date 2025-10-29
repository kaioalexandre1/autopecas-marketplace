# 🚀 Guia Rápido - AutoPeças Maringá

## 📦 Instalação Express (5 minutos)

```bash
# 1. Entre na pasta do projeto
cd autopecas-marketplace

# 2. Instale as dependências
npm install

# 3. Configure o Firebase
# Copie o arquivo de exemplo e edite com suas credenciais
cp .env.local.example .env.local
# Edite .env.local com as credenciais do Firebase

# 4. Inicie o servidor
npm run dev

# 5. Acesse http://localhost:3000
```

## 🔥 Configuração Firebase (10 minutos)

### Passo 1: Criar Projeto
1. Acesse https://console.firebase.google.com/
2. "Adicionar projeto" → Nome: `autopecas-maringa`
3. Desabilite Analytics → "Criar projeto"

### Passo 2: Configurar Serviços

**Authentication:**
- Menu → Authentication → Começar
- Ativar "E-mail/senha"

**Firestore:**
- Menu → Firestore Database → Criar
- Modo teste → Local: São Paulo

**Storage:**
- Menu → Storage → Começar
- Modo teste

### Passo 3: Copiar Credenciais
1. ⚙️ → Configurações do projeto
2. "Seus aplicativos" → Ícone Web (</>)
3. Registrar app → Copiar config
4. Colar no `.env.local`

## ☁️ Deploy na Vercel (5 minutos)

```bash
# 1. Fazer push para GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. Acessar Vercel
# - Entre em https://vercel.com/
# - Importe o repositório
# - Adicione as variáveis de ambiente do .env.local
# - Deploy!

# 3. Pronto! URL: https://seu-projeto.vercel.app
```

## 🎯 Estrutura do Projeto

```
autopecas-marketplace/
├── app/                      # Páginas Next.js
│   ├── page.tsx             # Landing page
│   ├── login/page.tsx       # Login
│   ├── cadastro/page.tsx    # Cadastro
│   └── dashboard/           # Dashboard (autenticado)
│       ├── page.tsx         # Pedidos ao vivo
│       ├── chats/           # Sistema de chat
│       └── negocios-fechados/ # Histórico
├── components/              # Componentes reutilizáveis
│   ├── Navbar.tsx
│   └── EntregadoresModal.tsx
├── contexts/                # Context API (Auth)
│   └── AuthContext.tsx
├── lib/                     # Utilitários
│   ├── firebase.ts          # Configuração Firebase
│   └── utils.ts             # Funções auxiliares
├── types/                   # TypeScript types
│   └── index.ts
└── README.md                # Documentação completa
```

## 🔑 Funcionalidades Principais

### 1. Sistema de Pedidos (Oficinas)
- Criar pedido com detalhes do veículo
- Ver ofertas em tempo real
- Sistema de leilão reverso (menor preço destacado)

### 2. Sistema de Ofertas (Autopeças)
- Ver todos os pedidos ativos
- Fazer ofertas competitivas
- Chat automático ao fazer oferta

### 3. Chat em Tempo Real
- Mensagens instantâneas
- Upload de fotos (até 5MB)
- Botão para solicitar entregador

### 4. Entregadores
- Lista com valores de entrega
- Botão direto para WhatsApp
- Mensagem pré-pronta

### 5. Negócios Fechados
- Histórico do dia
- Estatísticas
- Sem exibição de valores (privacidade)

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção local
npm start

# Verificar erros
npm run lint
```

## 🎨 Tecnologias Usadas

- **Frontend:** Next.js 14, React, TypeScript
- **UI:** Tailwind CSS, Lucide Icons
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Hospedagem:** Vercel
- **Tempo Real:** Firestore Realtime Updates

## 🔐 Segurança

### Regras do Firestore

```javascript
// users: apenas próprio usuário
// pedidos: todos autenticados (leitura), oficinas (criação)
// chats: apenas participantes
// negocios_fechados: todos autenticados
```

### Regras do Storage

```javascript
// chats: apenas autenticados
// limite: 5MB por imagem
// tipo: apenas imagens
```

## 📱 Fluxo de Uso

### Oficina:
1. Cadastro/Login
2. "Novo Pedido" → Preencher dados
3. Aguardar ofertas em tempo real
4. Ver menor preço destacado
5. Entrar em chat com autopeça
6. Solicitar entregador
7. Marcar como fechado

### Autopeça:
1. Cadastro/Login
2. Ver pedidos ao vivo
3. "EU TENHO" → Informar preço
4. Chat criado automaticamente
5. Negociar detalhes
6. Enviar fotos da peça
7. Fechar negócio

### Entregador:
1. Cadastro com WhatsApp e valor
2. Aparecer na lista de entregadores
3. Receber contatos via WhatsApp

## 🐛 Problemas Comuns

**Erro: Firebase not initialized**
→ Verifique o `.env.local`

**Pedidos não atualizam**
→ Verifique regras do Firestore

**Imagem não envia**
→ Verifique regras do Storage (5MB max)

**Deploy falhou**
→ Verifique variáveis de ambiente na Vercel

## 📞 Suporte

- **README.md** → Documentação completa
- **DEPLOY.md** → Guia detalhado de deploy
- **GitHub Issues** → Reporte problemas

## 🚀 Próximas Melhorias

- [ ] Notificações push
- [ ] Painel admin
- [ ] App mobile
- [ ] Sistema de avaliações
- [ ] Múltiplas cidades
- [ ] Integração com pagamentos

---

**Desenvolvido para o mercado automotivo de Maringá-PR** 🚗💨

