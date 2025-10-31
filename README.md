# 🚗 AutoPeças Maringá - Marketplace em Tempo Real

Marketplace de autopeças em tempo real conectando oficinas, lojas de autopeças e entregadores em Maringá-PR.

## 🎯 Funcionalidades

### Para Oficinas
- ✅ Criar pedidos de peças com informações detalhadas do veículo
- ✅ Visualizar ofertas em tempo real (sistema de leilão reverso)
- ✅ Chat direto com autopeças
- ✅ Histórico de negócios fechados
- ✅ Solicitar entregadores

### Para Autopeças
- ✅ Ver pedidos ao vivo em tempo real
- ✅ Fazer ofertas competitivas
- ✅ Chat com upload de fotos
- ✅ Histórico de vendas
- ✅ Sistema de notificações

### Para Entregadores
- ✅ Cadastro simples
- ✅ Integração com WhatsApp
- ✅ Definir valores de entrega

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14 + React + TypeScript
- **Estilização**: Tailwind CSS
- **Backend/Banco de Dados**: Firebase
  - Authentication (autenticação)
  - Firestore (banco de dados em tempo real)
  - Storage (armazenamento de imagens)
- **Hospedagem**: Vercel (gratuita)

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Firebase (gratuita)
- Conta na Vercel (gratuita)

## 🚀 Instalação e Configuração

### 1. Clone ou use este projeto

```bash
cd autopecas-marketplace
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Firebase

#### 3.1. Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Dê um nome ao projeto (ex: "autopecas-maringa")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

#### 3.2. Configurar Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Ative o método "E-mail/senha"

#### 3.3. Configurar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar em modo de teste" (ou produção com regras personalizadas)
4. Escolha a localização "southamerica-east1" (São Paulo)

#### 3.4. Configurar Storage

1. No menu lateral, clique em "Storage"
2. Clique em "Começar"
3. Escolha "Iniciar em modo de teste"
4. A localização será a mesma do Firestore

#### 3.5. Obter credenciais

1. Clique no ícone de engrenagem (⚙️) > "Configurações do projeto"
2. Role até "Seus aplicativos" e clique no ícone da web (</>)
3. Registre um apelido para o app (ex: "webapp")
4. Copie as credenciais que aparecem

### 4. Configure as variáveis de ambiente

1. Copie o arquivo de exemplo:
```bash
cp .env.local.example .env.local
```

2. Edite `.env.local` e cole suas credenciais do Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

### 5. Execute o projeto localmente

```bash
npm run dev
```

Acesse http://localhost:3000 no navegador

## 🌐 Deploy na Vercel (Hospedagem Gratuita)

### 1. Prepare o projeto

Certifique-se de que tudo está funcionando localmente.

### 2. Faça upload para GitHub (opcional, mas recomendado)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/autopecas-maringa.git
git push -u origin main
```

### 3. Deploy na Vercel

#### Opção A: Via GitHub (recomendado)

1. Acesse [Vercel](https://vercel.com/)
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - Adicione todas as variáveis do `.env.local`
5. Clique em "Deploy"

#### Opção B: Via CLI

```bash
npm install -g vercel
vercel
```

Siga as instruções e adicione as variáveis de ambiente quando solicitado.

### 4. Seu site estará no ar! 🎉

A Vercel fornecerá uma URL como: `https://seu-projeto.vercel.app`

## 🔐 Regras de Segurança do Firebase

### Firestore Rules

Adicione estas regras no Firestore para segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler e atualizar apenas seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Pedidos podem ser criados por oficinas e lidos por todos autenticados
    match /pedidos/{pedidoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Chats podem ser acessados pelos participantes
    match /chats/{chatId} {
      allow read: if request.auth != null && 
                   (resource.data.oficinaId == request.auth.uid || 
                    resource.data.autopecaId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                    (resource.data.oficinaId == request.auth.uid || 
                     resource.data.autopecaId == request.auth.uid);
      allow delete: if request.auth != null && 
                    (resource.data.oficinaId == request.auth.uid || 
                     resource.data.autopecaId == request.auth.uid);
    }
    
    // Negócios fechados podem ser lidos pelos participantes
    match /negocios_fechados/{negocioId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules

Adicione estas regras no Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chats/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 📱 Como Usar

### Para Oficinas:

1. **Cadastre-se** como Oficina
2. Faça **login**
3. Clique em **"Novo Pedido"**
4. Preencha os dados da peça (nome, marca, modelo, ano)
5. Aguarde **ofertas em tempo real**
6. Entre em **chat** com as autopeças
7. **Feche o negócio** e solicite um entregador

### Para Autopeças:

1. **Cadastre-se** como Autopeça
2. Faça **login**
3. Visualize **pedidos ao vivo**
4. Clique em **"EU TENHO"** para fazer uma oferta
5. Digite seu **preço**
6. Aguarde a oficina **entrar em contato**
7. Use o **chat** para negociar e enviar fotos

### Para Entregadores:

1. **Cadastre-se** como Entregador
2. Seu contato ficará disponível para oficinas e autopeças
3. Receba solicitações via **WhatsApp**

## 🎨 Personalização

### Cores

Edite `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#2563eb', // Azul principal
      secondary: '#10b981', // Verde secundário
    },
  },
}
```

### Logo

Substitua o texto "AutoPeças Maringá" por uma imagem de logo nos arquivos:
- `app/page.tsx`
- `components/Navbar.tsx`

## 🐛 Solução de Problemas

### Erro: "Firebase: Error (auth/invalid-api-key)"
- Verifique se copiou corretamente as credenciais do Firebase
- Certifique-se de que o `.env.local` está na raiz do projeto

### Erro de CORS no Storage
- Verifique as regras de segurança do Firebase Storage
- Certifique-se de que está autenticado

### Pedidos não aparecem em tempo real
- Verifique se o Firestore está configurado corretamente
- Verifique as regras de segurança do Firestore
- Abra o console do navegador para ver erros

## 📈 Próximos Passos

- [ ] Sistema de notificações push
- [ ] App mobile (React Native)
- [ ] Painel administrativo
- [ ] Análise de métricas
- [ ] Sistema de avaliações
- [ ] Integração com pagamentos
- [ ] Expansão para outras cidades

## 📄 Licença

Este projeto é livre para uso pessoal e comercial.

## 👨‍💻 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato pelo email

---

**Desenvolvido com ❤️ para o mercado automotivo de Maringá-PR**

