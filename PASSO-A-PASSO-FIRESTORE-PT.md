# 📋 Passo a Passo - Configuração do Firestore para Limite de Sessões (PORTUGUÊS)

## 🎯 Objetivo
Configurar o Firestore para permitir que o sistema limite cada usuário a 3 dispositivos logados simultaneamente.

---

## 📝 PASSO 1: Acessar o Firebase Console

1. Abra seu navegador e acesse: **https://console.firebase.google.com/**
2. Faça login com sua conta Google
3. Selecione o projeto do seu marketplace (ou crie um novo se ainda não tiver)

---

## 📝 PASSO 2: Criar o Índice Composto (OBRIGATÓRIO)

O índice é necessário para que a consulta que busca as sessões do usuário funcione corretamente.

### 2.1. Acessar a seção de Índices

1. No menu lateral esquerdo, clique em **"Firestore Database"** (Banco de dados Firestore)
2. Clique na aba **"Índices"** (no topo da página, ao lado de "Dados" e "Regras")
3. Você verá uma tabela com os índices existentes
4. Clique no botão azul **"Adicionar índice"** no canto superior direito

### 2.2. Configurar o Índice

Na tela que abrir, você verá:

1. **Código da coleção**: Digite `user_sessions`
2. Deixe o **Escopo da consulta** como **"Coleta"** (padrão)
3. Clique em **"Avançar"** ou **"Próximo"**

### 2.3. Adicionar os Campos do Índice

Você verá uma tabela para adicionar campos. Adicione os seguintes campos:

**Campo 1:**
- Clique em **"Adicionar campo"** ou **"Adicionar"**
- **Caminho do campo**: Digite `userId`
- **Tipo de ordenação**: Selecione **"Ascendente"** (seta para cima ↑)
- Clique em **"Confirmar"** ou **"OK"**

**Campo 2:**
- Clique em **"Adicionar campo"** novamente
- **Caminho do campo**: Digite `lastActivity`
- **Tipo de ordenação**: Selecione **"Descendente"** (seta para baixo ↓)
- Clique em **"Confirmar"** ou **"OK"**

### 2.4. Finalizar o Índice

1. Verifique se os dois campos aparecem na lista:
   - `userId` (Ascendente)
   - `lastActivity` (Descendente)
2. Clique no botão **"Criar"** ou **"Criar índice"**
3. Você será redirecionado para a lista de índices
4. O status do índice aparecerá como **"Criando"** (pode levar até 5 minutos)
5. Aguarde até o status mudar para **"Ativado"** (verde)

**⚠️ IMPORTANTE**: 
- Não feche a página enquanto o índice está sendo criado
- Não tente usar o sistema enquanto o status está "Criando"
- Você pode recarregar a página para verificar o status

**📸 Como deve ficar:**
```
Código da coleção: user_sessions
Campos indexados: 
  - userId (↑ Ascendente)
  - lastActivity (↓ Descendente)
Escopo da consulta: Coleta
Status: Ativado (verde)
```

---

## 📝 PASSO 3: Adicionar Regras de Segurança (RECOMENDADO)

As regras de segurança garantem que apenas o próprio usuário possa gerenciar suas sessões.

### 3.1. Acessar as Regras

1. Na página do Firestore Database, clique na aba **"Regras"** (no topo, ao lado de "Dados" e "Índices")
2. Você verá um editor de código com as regras atuais

### 3.2. Adicionar a Regra para `user_sessions`

Encontre a seção que começa com `match /databases/{database}/documents {` e adicione a seguinte regra ANTES do fechamento `}` final:

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

1. Clique no botão **"Publicar"** (geralmente no canto superior direito)
2. Aguarde a confirmação de que as regras foram publicadas
3. Você verá uma mensagem de sucesso

**Exemplo completo de como deve ficar (se você já tem outras regras):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... suas regras existentes (usuários, pedidos, chats, etc.) ...
    
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
2. Volte ao Firebase Console
3. Vá até **Firestore Database** → aba **"Dados"**
4. Você deve ver uma nova coleção chamada **`user_sessions`**
5. Clique em `user_sessions` para expandir
6. Dentro dela, deve haver um documento com um ID (o sessionId criado)

### 4.2. Verificar a Estrutura do Documento

Clique no documento para ver os campos. Cada documento deve ter:

- **userId**: O ID do usuário (ex: "abc123...")
- **sessionId**: O ID único da sessão (ex: "1234567890-xyz...")
- **createdAt**: Timestamp de criação
- **lastActivity**: Timestamp da última atividade
- **userAgent**: Informações do navegador (ex: "Mozilla/5.0...")

### 4.3. Testar o Limite de 3 Dispositivos

1. Faça login em 3 dispositivos diferentes com o mesmo usuário
2. Volte ao Firestore → aba **"Dados"** → coleção `user_sessions`
3. Verifique que existem 3 documentos diferentes
4. Todos devem ter o mesmo `userId`, mas `sessionId` diferentes
5. Tente fazer login em um 4º dispositivo
6. A sessão mais antiga deve ser automaticamente removida
7. O dispositivo com a sessão removida será deslogado automaticamente após 5 minutos

---

## 🐛 Resolução de Problemas

### Problema: "A consulta requer um índice"

**Solução**: Você precisa criar o índice composto (PASSO 2). O Firebase geralmente mostra um link para criar o índice automaticamente. Clique no link e siga as instruções.

### Problema: "Permissão negada" ou "Permission denied"

**Solução**: 
1. Verifique se você adicionou as regras de segurança (PASSO 3)
2. Verifique se clicou em **"Publicar"** após adicionar as regras
3. Aguarde alguns segundos e tente novamente

### Problema: Índice não aparece na lista ou está "Criando" há muito tempo

**Solução**: 
- Aguarde mais alguns minutos (pode levar até 5 minutos)
- Recarregue a página (F5)
- Verifique se você digitou corretamente o nome da coleção (`user_sessions`)
- Se passou mais de 10 minutos, tente criar o índice novamente

### Problema: Sessões não estão sendo criadas

**Solução**:
1. Verifique se o usuário está autenticado (fez login)
2. Abra o console do navegador (F12 → aba "Console") e procure por erros
3. Verifique se as regras de segurança permitem criação
4. Verifique se o índice está com status "Ativado" (não "Criando")

### Problema: Não consigo encontrar a aba "Índices"

**Solução**: 
- Certifique-se de que está na página **"Firestore Database"**
- As abas ficam no topo: "Dados", "Regras", "Índices", etc.
- Se não aparecer, pode ser que seu projeto não tenha Firestore habilitado ainda

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Índice composto criado com status **"Ativado"** (verde)
- [ ] Regras de segurança adicionadas e **publicadas**
- [ ] Coleção `user_sessions` aparece quando você faz login
- [ ] Documentos são criados com os campos corretos (userId, sessionId, createdAt, lastActivity, userAgent)
- [ ] Teste de limite de 3 dispositivos funcionando

---

## 📸 Exemplo Visual do Índice

Quando você criar o índice, ele deve aparecer na lista assim:

```
Código da coleção: user_sessions
Campos indexados: userId (↑), lastActivity (↓)
Escopo da consulta: Coleta
ID do índice: [um ID gerado automaticamente]
Status: Ativado (verde)
```

---

## 🎉 Pronto!

Depois de completar estes passos, seu sistema de limitação de 3 sessões simultâneas estará funcionando perfeitamente!

Se tiver qualquer dúvida durante o processo, me avise que eu te ajudo! 😊

