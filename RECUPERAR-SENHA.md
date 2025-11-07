# 🔐 Como Recuperar Senha no Grupão das Autopeças

## **✅ MÉTODO 1 - Usando a Página "Esqueci Minha Senha" (Recomendado)**

### **Passo 1: Acesse a página de recuperação**
1. Vá para: http://localhost:3000/esqueci-senha
   - **OU** na página de login, clique em **"Esqueci minha senha"**

### **Passo 2: Digite seu email**
1. Digite: **maringaautopecacaio@gmail.com**
2. Clique em: **"Enviar Link de Recuperação"**

### **Passo 3: Verifique seu email**
1. Abra o email: **maringaautopecacaio@gmail.com**
2. Procure por um email do Firebase/Google
   - **Assunto:** "Redefinir senha - Grupão das Autopeças" (ou similar)
   - **Verifique também a pasta SPAM!**

### **Passo 4: Clique no link**
1. Clique no link de recuperação no email
2. Você será redirecionado para uma página segura do Firebase

### **Passo 5: Defina nova senha**
1. Digite uma nova senha
2. Confirme a nova senha
3. Clique em **"Salvar"**

### **Passo 6: Faça login**
1. Volte para: http://localhost:3000/login
2. Digite:
   - **Email:** maringaautopecacaio@gmail.com
   - **Senha:** [sua nova senha]
3. ✨ **Pronto!**

---

## **🔐 MÉTODO 2 - Redefinir Senha pelo Firebase Console**

Se você não tiver acesso ao email, pode redefinir manualmente:

### **Passo 1: Acesse o Firebase Console**
1. Vá para: https://console.firebase.google.com
2. Faça login com sua conta Google
3. Selecione o projeto: **autopecas-marketplace**

### **Passo 2: Vá em Authentication**
1. No menu lateral, clique em **Authentication**
2. Clique na aba **Users**

### **Passo 3: Encontre o usuário**
1. Procure por: **maringaautopecacaio@gmail.com**
2. Clique nos **3 pontinhos** (⋮) no final da linha
3. Selecione: **"Reset password"** ou **"Redefinir senha"**

### **Passo 4: Enviar email**
1. O Firebase enviará automaticamente um email de redefinição
2. OU você pode criar uma nova senha temporária
3. Siga os passos do Método 1 a partir do Passo 3

---

## **🛡️ MÉTODO 3 - Criar Nova Conta (Última Opção)**

Se você não conseguir recuperar o acesso:

### **Opção A: Use outro email**
1. Vá para: http://localhost:3000/cadastro
2. Cadastre-se com um **novo email**
3. Preencha os dados normalmente

### **Opção B: Excluir conta antiga e recriar**

**⚠️ ATENÇÃO: Isso apagará todos os dados da conta antiga!**

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com
   - Projeto: autopecas-marketplace
   - Authentication → Users

2. **Exclua o usuário:**
   - Procure: maringaautopecacaio@gmail.com
   - Clique nos 3 pontinhos (⋮)
   - Selecione: "Delete account" ou "Excluir conta"
   - Confirme a exclusão

3. **Exclua do Firestore:**
   - Firestore Database
   - Coleção: `users`
   - Procure o documento do usuário (pelo UID)
   - Clique nos 3 pontinhos (⋮)
   - Selecione: "Delete document"
   - Confirme a exclusão

4. **Cadastre novamente:**
   - Vá para: http://localhost:3000/cadastro
   - Use o mesmo email: maringaautopecacaio@gmail.com
   - Preencha os dados
   - ✨ **Conta criada!**

---

## **📧 EMAIL NÃO CHEGOU?**

### **Verifique:**
1. ✅ **Pasta de SPAM/Lixo Eletrônico**
   - O email pode ter sido filtrado

2. ✅ **Email correto?**
   - Confirme que digitou: **maringaautopecacaio@gmail.com**

3. ✅ **Aguarde alguns minutos**
   - Às vezes o email demora até 10 minutos

4. ✅ **Tente enviar novamente**
   - Volte para a página de recuperação
   - Clique em "Enviar novamente"

### **Se ainda não funcionar:**
- Use o **Método 2** (Firebase Console)
- Ou o **Método 3** (Nova conta)

---

## **🔒 DICAS DE SEGURANÇA:**

### **Escolha uma senha forte:**
- ✅ Mínimo 8 caracteres
- ✅ Use letras maiúsculas e minúsculas
- ✅ Use números
- ✅ Use caracteres especiais (@, #, $, %, etc.)

### **Exemplos de senhas fortes:**
- `AutoPecas@2024!`
- `Maringa#Pecas123`
- `CaioShop$456`

### **Nunca:**
- ❌ Use senhas óbvias (123456, senha, password)
- ❌ Use informações pessoais (nome, data de nascimento)
- ❌ Compartilhe sua senha
- ❌ Use a mesma senha em vários sites

---

## **📱 PÁGINA DE RECUPERAÇÃO:**

Agora você tem uma página dedicada para recuperação de senha:

- **URL:** http://localhost:3000/esqueci-senha
- **Design:** Moderno, com animações e feedback visual
- **Funcionalidades:**
  - ✅ Envio automático de email de recuperação
  - ✅ Validação de email
  - ✅ Feedback de sucesso/erro
  - ✅ Opção de reenviar email
  - ✅ Instruções passo a passo

---

## **🆘 PROBLEMAS COMUNS:**

### **Problema: "Email não cadastrado"**
**Solução:**
- Verifique se digitou corretamente
- Verifique se a conta realmente existe
- Tente com outro email que você possa ter usado

### **Problema: "Email inválido"**
**Solução:**
- Verifique se o formato está correto (exemplo@dominio.com)
- Não use espaços antes ou depois do email

### **Problema: "Erro ao enviar email"**
**Solução:**
- Verifique sua conexão com a internet
- Tente novamente em alguns minutos
- Use o Método 2 (Firebase Console)

---

## **✨ RESUMO RÁPIDO:**

Para recuperar a senha de **maringaautopecacaio@gmail.com**:

1. 🌐 Acesse: http://localhost:3000/esqueci-senha
2. 📧 Digite: maringaautopecacaio@gmail.com
3. 📨 Clique em: "Enviar Link de Recuperação"
4. 📬 Abra seu email e clique no link
5. 🔐 Defina uma nova senha
6. ✅ Faça login com a nova senha

**🎉 Pronto! Acesso recuperado!** 🚀

---

## **📞 CONTATO:**

Se nenhum método funcionar, você pode:
- Criar uma nova conta com outro email
- Ou me avisar que posso ajudar a resetar manualmente pelo Firebase Console

**💡 A página de recuperação de senha está funcionando e pronta para uso!**










