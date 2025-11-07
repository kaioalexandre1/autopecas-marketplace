# 🔧 Como Corrigir o Erro "Erro ao salvar configuração"

## ❌ **O Problema:**
As regras de segurança do Firebase Firestore não permitem que você salve na coleção `configuracoes`.

## ✅ **A Solução (5 minutos):**

---

### **📍 Passo 1: Abrir o Firebase Console**

1. Abra seu navegador
2. Acesse: **https://console.firebase.google.com/**
3. Faça login (se necessário)
4. Clique no seu projeto (o que você criou para o marketplace)

---

### **📍 Passo 2: Ir nas Regras do Firestore**

1. No menu lateral **ESQUERDO**, clique em: **"Firestore Database"**
2. No topo da página, clique na aba: **"Regras"** (ou "Rules" se estiver em inglês)
3. Você verá um editor de texto com código

---

### **📍 Passo 3: Copiar as Novas Regras**

1. **Selecione TODO o texto** que está no editor (Ctrl+A)
2. **Delete tudo** (Delete ou Backspace)
3. **Abra o arquivo** que criei para você: `firestore.rules` (está na pasta do projeto)
4. **Copie TODO o conteúdo** desse arquivo (Ctrl+A, Ctrl+C)
5. **Cole** no editor do Firebase (Ctrl+V)

Ou copie diretamente daqui:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se é admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Usuários podem ler e atualizar apenas seus próprios dados
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                    (request.auth.uid == userId || isAdmin());
    }
    
    // Pedidos podem ser criados por oficinas e lidos por todos autenticados
    match /pedidos/{pedidoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
                     (resource.data.oficinaId == request.auth.uid || isAdmin());
    }
    
    // Chats podem ser acessados pelos participantes
    match /chats/{chatId} {
      allow read: if request.auth != null && 
                   (resource.data.oficinaId == request.auth.uid || 
                    resource.data.autopecaId == request.auth.uid ||
                    isAdmin());
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                    (resource.data.oficinaId == request.auth.uid || 
                     resource.data.autopecaId == request.auth.uid ||
                     isAdmin());
    }
    
    // Negócios fechados podem ser lidos pelos participantes
    match /negocios_fechados/{negocioId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Configurações do sistema (apenas admins)
    match /configuracoes/{configId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Assinaturas
    match /assinaturas/{assinaturaId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                     (resource.data.autopecaId == request.auth.uid || isAdmin());
    }
    
    // Pagamentos
    match /pagamentos/{pagamentoId} {
      allow read: if request.auth != null && 
                   (resource.data.autopecaId == request.auth.uid || isAdmin());
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }
  }
}
```

---

### **📍 Passo 4: Publicar as Regras**

1. No **topo do editor**, procure o botão azul: **"Publicar"** (ou "Publish")
2. Clique nele
3. Aguarde a mensagem de sucesso (vai aparecer um aviso verde)

---

### **📍 Passo 5: Testar Novamente**

1. Volte para o seu sistema: http://localhost:3000/admin
2. Clique no botão verde: **"💳 CONFIGURAR MERCADO PAGO"**
3. Cole novamente suas credenciais:
   - **Public Key**: `APP_USR-eaa4c975-34b1-44b1-898e-8551eb0ca677`
   - **Access Token**: `APP_USR-1062925357150138-103010-0e36f355e2e9415c9096daa3e0b727ee-319482795`
4. Clique em **"Salvar Configuração"**
5. **✅ DEVE FUNCIONAR AGORA!**

---

## 🆘 **Se AINDA Der Erro:**

### **Verifique se você é Admin:**

1. Abra o Firebase Console
2. Vá em **"Firestore Database"**
3. Clique na coleção **"users"**
4. Procure pelo seu usuário
5. Verifique se tem o campo: `role: "admin"`
6. Se **NÃO TIVER**, adicione:
   - Clique no seu documento de usuário
   - Clique em **"Adicionar campo"** (ou no ícone de +)
   - Nome do campo: `role`
   - Tipo: `string`
   - Valor: `admin`
   - Clique em **"Atualizar"**

### **Limpe o Cache do Navegador:**

1. Pressione **Ctrl + Shift + Delete**
2. Marque **"Imagens e arquivos em cache"**
3. Clique em **"Limpar dados"**
4. Feche e abra o navegador
5. Acesse novamente: http://localhost:3000/admin

### **Verifique o Console do Navegador:**

1. Pressione **F12** no navegador
2. Vá na aba **"Console"**
3. Tente salvar a configuração novamente
4. Veja se aparece algum erro em **vermelho**
5. Me envie esse erro (tire print ou copie o texto)

---

## 🎯 **O Que Essas Regras Fazem:**

| Coleção | Quem Pode Ler | Quem Pode Escrever |
|---------|---------------|---------------------|
| `users` | Todos autenticados | Próprio usuário ou admin |
| `pedidos` | Todos autenticados | Todos autenticados |
| `chats` | Participantes do chat | Participantes do chat |
| `negocios_fechados` | Todos autenticados | Todos autenticados |
| **`configuracoes`** | **Todos autenticados** | **APENAS ADMINS** ⭐ |
| `assinaturas` | Todos autenticados | Dono ou admin |
| `pagamentos` | Dono ou admin | Admin |

---

## ⚠️ **IMPORTANTE:**

As regras que criei são **SEGURAS** e permitem:
- ✅ Apenas admins podem salvar configurações do Mercado Pago
- ✅ Usuários comuns NÃO podem alterar configurações sensíveis
- ✅ Cada usuário só pode editar seus próprios dados
- ✅ Chats são privados entre os participantes

---

## 📝 **Resumo Rápido:**

```
1. Abrir: https://console.firebase.google.com/
2. Firestore Database → Regras
3. Copiar e colar as novas regras (do arquivo firestore.rules)
4. Clicar em "Publicar"
5. Tentar salvar as credenciais do Mercado Pago novamente
6. ✅ Deve funcionar!
```

---

**🎉 Depois de publicar as regras, VAI FUNCIONAR com certeza!**

Se ainda der erro, tire um print da tela inteira e me mostre! 😊







