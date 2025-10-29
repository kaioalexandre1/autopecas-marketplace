# 🚀 Guia Completo de Deploy

Este guia irá ajudá-lo a colocar seu marketplace online de forma **100% gratuita**.

## 📋 Checklist Antes do Deploy

- [ ] Projeto funciona localmente (`npm run dev`)
- [ ] Firebase configurado e credenciais no `.env.local`
- [ ] Todas as funcionalidades testadas
- [ ] Regras de segurança do Firebase configuradas

## 🔥 Passo 1: Configurar Firebase (Backend)

### 1.1. Criar Projeto

1. Acesse https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `autopecas-maringa` (ou outro)
4. Desabilite Google Analytics (opcional)
5. Clique em **"Criar projeto"**

### 1.2. Configurar Authentication

1. Menu lateral → **Authentication**
2. Clique em **"Começar"**
3. Ative **"E-mail/senha"**
4. Salve

### 1.3. Configurar Firestore Database

1. Menu lateral → **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Modo: **"Iniciar em modo de teste"** (depois mudaremos)
4. Localização: **"southamerica-east1 (São Paulo)"**
5. Clique em **"Ativar"**

#### Configurar Regras de Segurança

Na aba **"Regras"**, substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Pedidos
    match /pedidos/{pedidoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
                    resource.data.oficinaId == request.auth.uid;
    }
    
    // Chats
    match /chats/{chatId} {
      allow read: if request.auth != null && 
                   (resource.data.oficinaId == request.auth.uid || 
                    resource.data.autopecaId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                    (resource.data.oficinaId == request.auth.uid || 
                     resource.data.autopecaId == request.auth.uid);
    }
    
    // Negócios Fechados
    match /negocios_fechados/{negocioId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

Clique em **"Publicar"**.

### 1.4. Configurar Storage

1. Menu lateral → **Storage**
2. Clique em **"Começar"**
3. Modo: **"Iniciar em modo de teste"**
4. Localização: mesma do Firestore
5. Clique em **"Concluído"**

#### Configurar Regras de Storage

Na aba **"Regras"**, substitua por:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chats/{chatId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Clique em **"Publicar"**.

### 1.5. Obter Credenciais

1. Clique no ícone ⚙️ (Configurações)
2. **"Configurações do projeto"**
3. Role até **"Seus aplicativos"**
4. Clique no ícone **</>** (Web)
5. Apelido do app: `webapp`
6. **NÃO** marque "Configure também o Firebase Hosting"
7. Clique em **"Registrar app"**
8. **Copie as credenciais** (você precisará delas)

## ☁️ Passo 2: Deploy na Vercel (Frontend/Hosting)

### 2.1. Criar Conta na Vercel

1. Acesse https://vercel.com/
2. Clique em **"Sign Up"**
3. Conecte com sua conta do **GitHub** (recomendado)

### 2.2. Preparar Repositório GitHub

Se ainda não tiver o código no GitHub:

```bash
# Na pasta do projeto
git init
git add .
git commit -m "Initial commit - AutoPeças Marketplace"

# Crie um repositório no GitHub e conecte
git remote add origin https://github.com/SEU-USUARIO/autopecas-maringa.git
git branch -M main
git push -u origin main
```

### 2.3. Importar Projeto na Vercel

1. No dashboard da Vercel, clique em **"Add New..."**
2. Selecione **"Project"**
3. Clique em **"Import"** no seu repositório
4. Configure o projeto:

#### Framework Preset
Será detectado automaticamente como **Next.js**

#### Root Directory
Deixe como `.` (raiz)

#### Build Command
```bash
npm run build
```

#### Output Directory
```
.next
```

### 2.4. Adicionar Variáveis de Ambiente

**IMPORTANTE:** Antes de fazer o deploy, adicione as variáveis de ambiente.

1. Na seção **"Environment Variables"**
2. Adicione cada variável do Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=SUA_API_KEY_AQUI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

3. Para cada variável:
   - Cole o **nome** (ex: `NEXT_PUBLIC_FIREBASE_API_KEY`)
   - Cole o **valor** (a credencial do Firebase)
   - Selecione **Production**, **Preview** e **Development**
   - Clique em **"Add"**

### 2.5. Fazer Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. ✅ **Deploy concluído!**

Você receberá uma URL como: `https://autopecas-maringa.vercel.app`

## 🔒 Passo 3: Configurar Domínio Autorizado no Firebase

Para evitar erros de CORS:

1. Volte ao **Firebase Console**
2. **Authentication** → **Settings** → **Authorized domains**
3. Clique em **"Add domain"**
4. Adicione seu domínio da Vercel: `seu-projeto.vercel.app`
5. Salve

## ✅ Passo 4: Testar o Deploy

1. Acesse sua URL da Vercel
2. Teste o cadastro de um usuário
3. Faça login
4. Crie um pedido (se for oficina)
5. Teste o chat
6. Envie uma imagem no chat

## 🎯 Passo 5: Configurações Adicionais (Opcional)

### Domínio Personalizado

Se você tiver um domínio próprio:

1. No dashboard da Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure os DNS conforme instruções da Vercel
4. Adicione o domínio também nos **Authorized domains** do Firebase

### Analytics

Para adicionar Google Analytics:

1. No Firebase, ative o Google Analytics
2. Copie o ID de medição
3. Adicione no Next.js usando o pacote `next/script`

## 🐛 Solução de Problemas

### ❌ "Firebase: Error (auth/invalid-api-key)"

**Solução:**
- Verifique se as variáveis de ambiente foram adicionadas corretamente na Vercel
- Certifique-se de que não há espaços extras nos valores
- Tente fazer um novo deploy: **Deployments** → **...** → **Redeploy**

### ❌ "CORS error" ao fazer upload de imagem

**Solução:**
- Adicione seu domínio Vercel nos **Authorized domains** do Firebase
- Verifique as regras do Firebase Storage

### ❌ "Permission denied" no Firestore

**Solução:**
- Verifique se as regras de segurança foram configuradas corretamente
- Certifique-se de que o usuário está autenticado
- No Firestore Console, veja a aba **"Rules"**

### ❌ Site lento ou não atualiza

**Solução:**
- A Vercel tem cache. Para forçar atualização:
  - **Deployments** → **...** → **Redeploy**
- Limpe o cache do navegador (Ctrl + Shift + R)

### ❌ "Error: Cannot find module" no build

**Solução:**
```bash
# Limpe e reinstale dependências
rm -rf node_modules
rm package-lock.json
npm install

# Teste localmente
npm run build
npm start

# Se funcionar, faça commit e push
git add .
git commit -m "Fix: reinstall dependencies"
git push
```

## 💰 Custos

### Plano Gratuito - Limites

#### Firebase (Spark Plan)
- ✅ **Firestore**: 50.000 leituras/dia
- ✅ **Authentication**: Ilimitado
- ✅ **Storage**: 1GB armazenamento, 10GB transferência/mês
- ⚠️ Para mais, upgrade para Blaze Plan (paga apenas o que usar)

#### Vercel (Hobby Plan)
- ✅ **Banda larga**: 100GB/mês
- ✅ **Build time**: 6.000 minutos/mês
- ✅ **Domínios**: Ilimitados
- ✅ **Projetos**: Ilimitados

**Para um marketplace pequeno/médio, o plano gratuito é MAIS DO QUE suficiente!**

## 📊 Monitoramento

### Ver Logs na Vercel

1. **Dashboard** → Seu projeto
2. Aba **"Deployments"**
3. Clique no deployment atual
4. Aba **"Logs"** (para ver erros em tempo real)

### Ver Uso no Firebase

1. **Firebase Console**
2. **"Usage and billing"**
3. Acompanhe:
   - Leituras/escritas do Firestore
   - Armazenamento usado
   - Transferência de dados

## 🎉 Pronto!

Seu marketplace está no ar! 🚀

**URL de Exemplo:** https://seu-projeto.vercel.app

Compartilhe com oficinas e autopeças de Maringá!

---

## 📞 Precisa de Ajuda?

Se tiver problemas:

1. Verifique os logs na Vercel
2. Verifique o Console do navegador (F12)
3. Consulte a documentação:
   - [Next.js](https://nextjs.org/docs)
   - [Firebase](https://firebase.google.com/docs)
   - [Vercel](https://vercel.com/docs)

**Boa sorte! 🍀**

