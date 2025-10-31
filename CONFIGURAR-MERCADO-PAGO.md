# 💳 Como Configurar Credenciais do Mercado Pago

## 📋 Variáveis Necessárias

Você precisa configurar **3 variáveis de ambiente**:

1. **`MP_ACCESS_TOKEN`** - Access Token (que você viu na tela: `APP_USR-...`)
2. **`MP_WEBHOOK_SECRET`** - Segredo para proteger o webhook (você cria)
3. **`NEXT_PUBLIC_BASE_URL`** - URL da sua aplicação (para o webhook)

---

## 🔧 Como Obter as Credenciais

### 1. Access Token e Public Key

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login
3. Clique em **"Suas integrações"**
4. Clique em **"Credenciais"**
5. Selecione **"Credenciais de produção"** ⚠️ **IMPORTANTE: Use PRODUÇÃO, não teste!**

Você verá:
- **Public Key**: `pk_live_xxxxxxxxxxxxxx` (não usamos no código atual)
- **Access Token**: `APP_USR-1234567890-012345-xxxxxxxxx-xxxxx` ✅ **ESTE VOCÊ PRECISA!**

### 2. Criar Webhook Secret

O `MP_WEBHOOK_SECRET` é um segredo que VOCÊ cria para proteger o webhook. Pode ser qualquer string segura.

**Exemplo:**
```
MeuWebhookSecreto123!@#
```

Ou gere um aleatório:
- Use um gerador de senhas
- Ou qualquer string única que você lembre

### 3. URL Base da Aplicação

Se você está na **Vercel**, será algo como:
```
https://seu-projeto.vercel.app
```

---

## 📝 Onde Configurar

### **OPÇÃO 1: Localmente (Desenvolvimento)**

1. Crie ou edite o arquivo `.env.local` na raiz do projeto:

```env
# Firebase (você já tem)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (para webhooks)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Mercado Pago (ADICIONE ESTAS!)
MP_ACCESS_TOKEN=APP_USR-1234567890-012345-xxxxxxxxx-xxxxx
MP_WEBHOOK_SECRET=MeuWebhookSecreto123!@#
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

2. **Salve o arquivo**
3. **Reinicie o servidor** (`npm run dev`)

---

### **OPÇÃO 2: Na Vercel (Produção)**

1. Acesse: https://vercel.com/
2. Entre no seu projeto
3. Vá em **"Settings"** (Configurações)
4. Clique em **"Environment Variables"** (Variáveis de Ambiente)
5. Adicione as 3 variáveis:

#### Variável 1: `MP_ACCESS_TOKEN`
- **Name**: `MP_ACCESS_TOKEN`
- **Value**: Cole o Access Token que você copiou (`APP_USR-...`)
- **Environment**: Selecione `Production`, `Preview` e `Development`

#### Variável 2: `MP_WEBHOOK_SECRET`
- **Name**: `MP_WEBHOOK_SECRET`
- **Value**: Cole o segredo que você criou (ex: `MeuWebhookSecreto123!@#`)
- **Environment**: Selecione `Production`, `Preview` e `Development`

#### Variável 3: `NEXT_PUBLIC_BASE_URL`
- **Name**: `NEXT_PUBLIC_BASE_URL`
- **Value**: Cole a URL do seu site (ex: `https://seu-projeto.vercel.app`)
- **Environment**: Selecione `Production`, `Preview` e `Development`

6. **Salve cada variável**
7. **Faça um novo deploy** (as variáveis só ficam ativas após novo deploy)

---

## 🔗 Configurar Webhook no Mercado Pago

Após configurar as variáveis, configure o webhook no Mercado Pago:

1. Acesse: https://www.mercadopago.com.br/developers
2. Clique em **"Suas integrações"**
3. Clique na sua aplicação
4. Vá em **"Webhooks"** ou **"Notificações IPN"**
5. Clique em **"Adicionar URL"** ou **"Configurar"**
6. Cole a URL do webhook:

```
https://seu-projeto.vercel.app/api/mercadopago/webhook?secret=MeuWebhookSecreto123!@#
```

⚠️ **IMPORTANTE**: 
- Substitua `seu-projeto.vercel.app` pela sua URL real
- Substitua `MeuWebhookSecreto123!@#` pelo mesmo valor que você colocou em `MP_WEBHOOK_SECRET`

7. Selecione os eventos: **"Pagamentos"** ou **"payment.updated"**
8. Salve

---

## ✅ Verificar se Está Funcionando

### Teste Local:
1. Configure o `.env.local`
2. Inicie o servidor: `npm run dev`
3. Faça um pagamento de teste
4. Veja os logs no console do navegador

### Teste Produção:
1. Verifique se as variáveis estão na Vercel
2. Faça um novo deploy
3. Faça um pagamento de teste
4. Veja os logs na Vercel (Dashboard → Deployments → Logs)

---

## 🐛 Problemas Comuns

### "Error 500 no webhook"
- ✅ Verifique se `MP_ACCESS_TOKEN` está correto
- ✅ Verifique se `MP_WEBHOOK_SECRET` está igual no Mercado Pago e na Vercel
- ✅ Verifique se `NEXT_PUBLIC_BASE_URL` está correta
- ✅ Verifique se as variáveis do Firebase Admin estão configuradas

### "Pagamento não ativa o plano"
- ✅ Verifique os logs do console do navegador
- ✅ Verifique os logs da Vercel
- ✅ Veja se o webhook está sendo chamado no painel do Mercado Pago

### "Credenciais inválidas"
- ✅ Certifique-se de usar credenciais de **PRODUÇÃO** (não teste)
- ✅ Verifique se não tem espaços no início/fim das credenciais
- ✅ Certifique-se de copiar a credencial **COMPLETA**

---

## 📸 Screenshot de Referência

Na tela do Mercado Pago que você mostrou:
- **Public key**: Não precisa (não usamos no código atual)
- **Access Token**: `APP_USR-106...` ✅ **COPIE ESTE!**

---

## 🎯 Checklist Final

- [ ] Access Token copiado do Mercado Pago
- [ ] Webhook Secret criado
- [ ] URL base da aplicação anotada
- [ ] Variáveis configuradas no `.env.local` (desenvolvimento)
- [ ] Variáveis configuradas na Vercel (produção)
- [ ] Webhook configurado no Mercado Pago
- [ ] Novo deploy feito na Vercel (para aplicar variáveis)
- [ ] Teste de pagamento realizado

---

**Pronto! Agora o sistema deve funcionar! 🚀**

