# 📋 Passo a Passo - Configuração do Firestore para Limite de Sessões

## 🎯 Objetivo
Configurar o Firestore para permitir que o sistema limite cada usuário a 3 dispositivos logados simultaneamente.

---

## 📝 PASSO 1: Acessar o Firebase Console

1. Abra seu navegador e acesse: **https://console.firebase.google.com/**
2. Faça login com sua conta Google
3. Selecione o projeto do seu marketplace (ou crie um novo se ainda não tiver)

---

## 📝 PASSO 2: Criar o Índice Composto (OBRIGATÓRIO)

O índice é necessário para que a query que busca as sessões do usuário funcione corretamente.

### 2.1. Acessar a seção de Índices

1. No menu lateral esquerdo, clique em **"Firestore Database"**
2. Clique na aba **"Indexes"** (Índices)
3. Se não aparecer automaticamente, clique em **"Create Index"** (Criar Índice)

### 2.2. Configurar o Índice

1. **Collection ID**: Digite `user_sessions`
2. **Query scope**: Selecione **"Collection"**
3. Clique em **"Next"** (Próximo)

### 2.3. Adicionar os Campos do Índice

Você verá uma tabela com campos. Adicione os seguintes campos:

**Campo 1:**
- **Field path**: `userId`
- **Order**: `Ascending` (Ascendente)
- Clique em **"Add field"** (Adicionar campo)

**Campo 2:**
- **Field path**: `lastActivity`
- **Order**: `Descending` (Descendente)

### 2.4. Finalizar o Índice

1. Clique em **"Create"** (Criar)
2. Aguarde alguns minutos até o índice ser criado (pode levar até 5 minutos)
3. Você verá o status mudar de "Building" (Construindo) para "Enabled" (Habilitado)

**⚠️ IMPORTANTE**: Não tente usar o sistema enquanto o índice está sendo criado, pois as queries podem falhar.

---

## 📝 PASSO 3: Adicionar Regras de Segurança (RECOMENDADO)

As regras de segurança garantem que apenas o próprio usuário possa gerenciar suas sessões.

### 3.1. Acessar as Regras

1. Na página do Firestore Database, clique na aba **"Rules"** (Regras)
2. Você verá um editor de código com as regras atuais

### 3.2. Adicionar a Regra para `user_sessions`

Encontre a seção que começa com `match /databases/{database}/documents {` e adicione a seguinte regra ANTES do fechamento `}`:

```javascript
// Sessões de usuário - limite de 3 dispositivos
match /user_sessions/{sessionId} {
  // Usuários podem ler e criar suas próprias sessões
  allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  
  // Usuários podem atualizar apenas suas próprias sessões
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
  
  // Usuários podem deletar apenas suas próprias sessões
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

### 3.3. Publicar as Regras

1. Clique em **"Publish"** (Publicar)
2. Aguarde a confirmação de que as regras foram publicadas

**Exemplo completo de como deve ficar:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... suas regras existentes ...
    
    // Sessões de usuário - limite de 3 dispositivos
    match /user_sessions/{sessionId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 📝 PASSO 4: Verificar se Está Funcionando

### 4.1. Testar o Sistema

1. Faça login no seu sistema em um dispositivo
2. Vá até o Firestore Database → **"Data"** (Dados)
3. Você deve ver uma nova coleção chamada **`user_sessions`**
4. Dentro dela, deve haver um documento com o sessionId criado

### 4.2. Estrutura do Documento

Cada documento em `user_sessions` deve ter esta estrutura:

```
user_sessions/
  └── [sessionId]/
      ├── userId: "abc123..."
      ├── sessionId: "1234567890-xyz..."
      ├── createdAt: Timestamp
      ├── lastActivity: Timestamp
      └── userAgent: "Mozilla/5.0..."
```

### 4.3. Testar o Limite

1. Faça login em 3 dispositivos diferentes com o mesmo usuário
2. Verifique no Firestore que existem 3 documentos em `user_sessions` para esse `userId`
3. Tente fazer login em um 4º dispositivo
4. A sessão mais antiga deve ser automaticamente removida
5. O dispositivo com a sessão removida será deslogado automaticamente após 5 minutos

---

## 🐛 Resolução de Problemas

### Problema: "The query requires an index"

**Solução**: Você precisa criar o índice composto (PASSO 2). O Firebase geralmente mostra um link para criar o índice automaticamente. Clique no link e siga as instruções.

### Problema: "Permission denied"

**Solução**: Verifique se você adicionou as regras de segurança (PASSO 3) e se publicou corretamente.

### Problema: Índice não aparece na lista

**Solução**: 
- Aguarde alguns minutos (pode levar até 5 minutos)
- Recarregue a página
- Verifique se você digitou corretamente o nome da coleção (`user_sessions`)

### Problema: Sessões não estão sendo criadas

**Solução**:
- Verifique se o usuário está autenticado
- Verifique o console do navegador para erros
- Verifique se as regras de segurança permitem criação

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Índice composto criado e status "Enabled" (Habilitado)
- [ ] Regras de segurança adicionadas e publicadas
- [ ] Coleção `user_sessions` aparece quando você faz login
- [ ] Documentos são criados com os campos corretos
- [ ] Teste de limite de 3 dispositivos funcionando

---

## 📞 Precisa de Ajuda?

Se encontrar algum problema:
1. Verifique o console do navegador (F12) para erros
2. Verifique os logs do Firebase Console
3. Certifique-se de que todas as configurações foram feitas corretamente

---

## 🎉 Pronto!

Depois de completar estes passos, seu sistema de limitação de 3 sessões simultâneas estará funcionando perfeitamente!

---

## 🚚 (NEW) Automatic freight requests

To allow workshops and auto parts stores to trigger freight requests and couriers to see them, add this extra configuration.

### Security rule

```javascript
    match /pedidosFrete/{pedidoId} {
      allow create: if request.auth != null &&
        ((get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo == 'autopeca' &&
          request.resource.data.autopecaId == request.auth.uid) ||
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo == 'oficina' &&
          request.resource.data.oficinaId == request.auth.uid));
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo == 'entregador';
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tipo == 'entregador' &&
        resource.data.status == 'aberto' &&
        request.resource.data.status == 'aceito' &&
        request.resource.data.aceitoPor == request.auth.uid;
      allow delete: if false;
    }
```

### Composite indexes

Create the following indexes:

```
Collection ID: pedidosFrete
Fields: status (Ascending ↑), criadoEm (Descending ↓)
Scope: Collection
```

To prevent duplicate jobs per chat, also create:

```
Collection ID: pedidosFrete
Fields: chatId (Ascending ↑), status (Ascending ↓)
Scope: Collection
```

Optional (recommended) to show accepted jobs:

```