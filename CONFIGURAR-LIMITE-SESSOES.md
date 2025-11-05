# Configuração do Limite de 3 Sessões Simultâneas

## Funcionalidade Implementada

O sistema agora limita cada usuário a **3 dispositivos logados simultaneamente**. Quando um 4º dispositivo tenta fazer login, a sessão mais antiga é automaticamente removida.

## Como Funciona

1. **Ao fazer login**: O sistema cria uma sessão única no Firestore (`user_sessions`)
2. **Verificação de limite**: Se já existem 3 sessões ativas, a mais antiga é removida
3. **Validação contínua**: A cada 5 minutos, o sistema verifica se a sessão ainda é válida
4. **Ao fazer logout**: A sessão é removida do Firestore

## Configuração Necessária no Firestore

### 1. Criar Índice Composto

No Firebase Console, vá em **Firestore Database > Indexes** e crie um índice composto:

**Collection**: `user_sessions`
**Fields**:
- `userId` (Ascending)
- `lastActivity` (Descending)

### 2. Regras de Segurança (Opcional, mas recomendado)

Adicione as seguintes regras no Firestore Security Rules:

```javascript
match /user_sessions/{sessionId} {
  // Usuários podem ler e criar suas próprias sessões
  allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  
  // Usuários podem atualizar apenas suas próprias sessões
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
  
  // Usuários podem deletar apenas suas próprias sessões
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

## Estrutura da Coleção `user_sessions`

Cada documento na coleção `user_sessions` contém:

```typescript
{
  userId: string;           // ID do usuário
  sessionId: string;        // ID único da sessão
  createdAt: Timestamp;     // Data de criação
  lastActivity: Timestamp;  // Última atividade (atualizado a cada 5 minutos)
  userAgent: string;        // Informações do navegador/dispositivo
}
```

## Comportamento

- **Limite**: Máximo de 3 sessões simultâneas por usuário
- **Expiração**: Sessões inativas por mais de 24 horas são automaticamente removidas
- **Remoção automática**: Quando o limite é atingido, a sessão mais antiga (menor `lastActivity`) é removida
- **Notificações**: O usuário recebe uma notificação quando uma sessão antiga é removida ou quando sua sessão é encerrada

## Teste

Para testar a funcionalidade:

1. Faça login em 3 dispositivos diferentes
2. Tente fazer login em um 4º dispositivo
3. O sistema deve remover a sessão mais antiga e permitir o novo login
4. O dispositivo com a sessão removida será deslogado automaticamente na próxima verificação (a cada 5 minutos)

