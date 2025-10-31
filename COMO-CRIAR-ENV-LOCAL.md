# 📝 Como Criar o Arquivo .env.local

## 🎯 O que é o .env.local?

O arquivo `.env.local` é onde você guarda as **variáveis de ambiente** (senhas, chaves, tokens) do seu projeto. Ele fica na **raiz do projeto** (mesma pasta onde está o `package.json`).

## 📍 Onde Fica?

```
C:\Users\kaiox\autopecas-marketplace\    ← Raiz do projeto
├── .env.local                           ← AQUI! (você vai criar)
├── package.json
├── next.config.js
├── app/
├── components/
└── ...
```

## 🛠️ Como Criar (Passo a Passo)

### **Método 1: Pelo Windows Explorer (Mais Fácil)**

1. **Abra o Windows Explorer** (Explorador de Arquivos)
2. **Navegue até a pasta do projeto:**
   ```
   C:\Users\kaiox\autopecas-marketplace
   ```
3. **Crie um novo arquivo:**
   - Clique com botão direito em qualquer lugar vazio da pasta
   - Selecione **"Novo"** → **"Documento de Texto"**
   - Nomeie o arquivo como: `.env.local` (com o ponto no início!)
   - ⚠️ **IMPORTANTE:** Se o Windows perguntar "Você quer mudar a extensão do arquivo?", clique em **"Sim"**

### **Método 2: Pelo Visual Studio Code (Recomendado)**

1. **Abra o Visual Studio Code** na pasta do projeto
2. **Clique com botão direito** na lista de arquivos à esquerda (na raiz do projeto)
3. **Selecione "New File"** (Novo Arquivo)
4. **Digite o nome:** `.env.local`
5. **Pressione Enter**

### **Método 3: Pelo PowerShell/Terminal**

1. **Abra o PowerShell** ou **Terminal** na pasta do projeto
2. **Execute o comando:**
   ```powershell
   New-Item -Path .env.local -ItemType File
   ```
   ou no CMD:
   ```cmd
   type nul > .env.local
   ```

## ✏️ Como Editar o Arquivo

1. **Abra o arquivo `.env.local`** no Visual Studio Code ou Bloco de Notas
2. **Cole este conteúdo** (substitua pelos seus valores reais):

```env
# Configurações do Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key-aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Configurações do Mercado Pago
MP_ACCESS_TOKEN=seu-access-token-aqui
MP_WEBHOOK_SECRET=seu-webhook-secret-aqui
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-eaa4c975-34b1-44b1-898e-8551eb0ca677

# URL base
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. **Substitua os valores:**
   - Substitua `sua-api-key-aqui` pela sua API Key do Firebase
   - Substitua `seu-projeto` pelo nome do seu projeto Firebase
   - Substitua `seu-access-token-aqui` pelo Access Token do Mercado Pago
   - Substitua `seu-webhook-secret-aqui` pelo secret do webhook
   - A `NEXT_PUBLIC_MP_PUBLIC_KEY` já está correta! ✅

4. **Salve o arquivo** (Ctrl+S)

## ✅ Verificar se Está Correto

1. **O arquivo deve estar na raiz** (mesmo nível que `package.json`)
2. **O nome deve ser exatamente:** `.env.local` (com o ponto no início)
3. **Não pode ter extensão** `.txt` ou outra extensão

## 🔄 Após Criar/Editar

**IMPORTANTE:** Sempre que você criar ou editar o `.env.local`, você precisa **reiniciar o servidor**:

1. Pare o servidor (Ctrl+C no terminal)
2. Execute novamente: `npm run dev`

## ⚠️ Importante

- ❌ **NÃO** faça commit do `.env.local` no Git (ele já deve estar no `.gitignore`)
- ✅ Mantenha este arquivo **privado** e **seguro**
- ✅ Use valores diferentes para desenvolvimento e produção

## 🆘 Problemas Comuns

### "Não encontrei o arquivo"
- Certifique-se de que o arquivo está na **raiz** do projeto
- Certifique-se de que o nome é exatamente `.env.local` (com ponto no início)

### "O Windows não deixa criar arquivo sem extensão"
- Use o método 2 (Visual Studio Code) ou método 3 (PowerShell)
- Ou renomeie depois: clique com botão direito → Renomear → Digite `.env.local`

### "As variáveis não estão funcionando"
- Verifique se você **reiniciou o servidor** após criar/editar o arquivo
- Verifique se os nomes das variáveis estão **exatamente** como mostrado (maiúsculas/minúsculas importam!)

