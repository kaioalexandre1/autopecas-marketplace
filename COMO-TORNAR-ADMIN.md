# 🛡️ Como se tornar Administrador

## **MÉTODO 1 - Pelo Firebase Console (Recomendado)**

### **Passo 1: Acesse o Firebase Console**
1. Vá para: https://console.firebase.google.com
2. Faça login com sua conta Google
3. Selecione o projeto: **autopecas-marketplace**

### **Passo 2: Abra o Firestore Database**
1. No menu lateral esquerdo, clique em **Firestore Database**
2. Você verá a lista de coleções

### **Passo 3: Encontre seu usuário**
1. Clique na coleção **`users`**
2. Você verá uma lista de documentos (usuários)
3. Procure pelo seu documento (pode ser identificado pelo **nome** ou **email**)
   - Se não encontrar facilmente, use **Ctrl+F** e procure por "kaioxander" ou "WRX"

### **Passo 4: Adicione o campo `role`**
1. Clique no documento do seu usuário
2. Você verá todos os campos (nome, email, tipo, etc.)
3. Clique em **+ Adicionar campo** (botão no canto superior direito do documento)
4. Preencha:
   - **Campo:** `role`
   - **Tipo:** `string`
   - **Valor:** `admin`
5. Clique em **Salvar** ou **Update**

### **Passo 5: Faça logout e login novamente**
1. No seu site, clique em **Sair**
2. Faça login novamente com: **kaioxander@gmail.com**
3. Você verá um novo botão **"Admin"** no Navbar! 🎉

---

## **MÉTODO 2 - Pelo Console do Navegador (Mais Rápido)**

### **Passo 1: Abra seu site**
1. Acesse: http://localhost:3000
2. Faça login com: **kaioxander@gmail.com**

### **Passo 2: Abra o Console do Navegador**
1. Pressione **F12** (ou Ctrl+Shift+I)
2. Vá para a aba **Console**

### **Passo 3: Execute o código**
Cole e execute este código:

```javascript
// Importar Firebase
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// Pegar o UID do usuário atual
const currentUserId = auth.currentUser.uid;

// Atualizar para admin
const userRef = doc(db, 'users', currentUserId);
await updateDoc(userRef, {
  role: 'admin'
});

console.log('✅ Você agora é ADMINISTRADOR!');
alert('✅ Você agora é ADMINISTRADOR! Faça logout e login novamente.');
```

### **Passo 4: Recarregue a página**
1. Pressione **F5** ou **Ctrl+R**
2. Você verá o botão **"Admin"** no Navbar! 🎉

---

## **MÉTODO 3 - Manualmente pelo Firestore (Se os outros não funcionarem)**

### **Encontre seu UID (User ID):**
1. Vá para: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Encontre seu email: **kaioxander@gmail.com**
5. Copie o **UID** (uma string longa tipo: `t4qJnX2O0RgCXaKHOYxJZGt0Nea2`)

### **Atualize no Firestore:**
1. Vá em **Firestore Database**
2. Coleção **`users`** → Documento com o **UID** que você copiou
3. Adicione o campo:
   - Campo: `role`
   - Tipo: `string`
   - Valor: `admin`
4. Salve

---

## **📌 APÓS SE TORNAR ADMIN:**

Você terá acesso ao **Painel Administrativo** com:

✅ **Visão Geral do Sistema:**
- Total de Oficinas cadastradas
- Total de Autopeças cadastradas
- Total de Entregadores cadastrados
- Pedidos ativos no momento

✅ **Estatísticas de Negócios:**
- Faturamento total (hoje, semana, mês)
- Total de vendas fechadas
- Ranking de autopeças por faturamento

✅ **Lista Completa de Usuários:**
- Nome, tipo, cidade, telefone, documento
- Filtro por tipo (oficinas, autopeças, entregadores)
- Data de cadastro

✅ **Controle Total:**
- Visualizar todos os dados do sistema
- Acompanhar performance de cada autopeça
- Ver todas as vendas e faturamento

---

## **🆘 Problemas?**

Se o botão "Admin" não aparecer após adicionar o campo `role`:

1. **Limpe o cache do navegador:**
   - Pressione **Ctrl+Shift+Del**
   - Marque "Cookies e dados de sites" e "Imagens e arquivos em cache"
   - Clique em "Limpar dados"

2. **Faça logout e login novamente:**
   - Clique em "Sair" no site
   - Faça login novamente

3. **Verifique se o campo foi salvo corretamente:**
   - Vá no Firebase Console
   - Firestore Database → users → seu documento
   - Confirme que existe: `role: "admin"`

4. **Reinicie o servidor:**
   - No terminal, pressione **Ctrl+C**
   - Execute: `npm run dev`
   - Acesse o site novamente

---

**✨ Pronto! Agora você é o ADMINISTRADOR PRINCIPAL do sistema!** 🛡️🎉










