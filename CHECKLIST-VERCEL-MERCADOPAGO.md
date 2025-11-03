# ✅ Checklist: Configurar SDK MercadoPago na Vercel

## 🎯 O que está pronto

✅ **Código configurado:**
- SDK MercadoPago.JS V2 carregado no `layout.tsx`
- Componente `MercadoPagoSDKChecker` inicializa o SDK automaticamente
- CSP configurada no `next.config.js` para permitir todos os domínios necessários
- Funciona perfeitamente em desenvolvimento local

## 📋 O que você precisa fazer na Vercel

### 1. Adicionar Variáveis de Ambiente do Mercado Pago

Acesse o painel da Vercel e adicione estas variáveis:

**No painel da Vercel:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione cada variável abaixo:

#### Variáveis do Mercado Pago (OBRIGATÓRIAS):

```env
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-eaa4c975-34b1-44b1-898e-8551eb0ca677
MP_ACCESS_TOKEN=APP_USR-1062925357150138-103010-0e36f355e2e9415c9096daa3e0b727ee-319482795
```

**Para cada variável:**
- ✅ Marque **Production**
- ✅ Marque **Preview** 
- ✅ Marque **Development**
- Clique em **"Add"**

#### Variáveis do Firebase (se ainda não tiver):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key-aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### URL Base (se ainda não tiver):

```env
NEXT_PUBLIC_BASE_URL=https://seu-projeto.vercel.app
```

> ⚠️ **IMPORTANTE:** Substitua `seu-projeto.vercel.app` pela URL real do seu projeto na Vercel!

### 2. Fazer um Novo Deploy

Após adicionar as variáveis:

1. Vá em **Deployments**
2. Clique nos **3 pontinhos (...)** do último deployment
3. Selecione **"Redeploy"**
4. Aguarde o deploy concluir

### 3. Verificar se Está Funcionando

Após o deploy:

1. Acesse seu site na Vercel: `https://seu-projeto.vercel.app`
2. Abra o **Console do Navegador** (F12 → Console)
3. Procure por estas mensagens:

```
✅ MercadoPago.JS V2 SDK inicializado com sucesso!
✅ SDK configurado corretamente para coleta de device_id e segurança
✅ SDK pronto para ganhar pontos do Mercado Pago
```

Se aparecerem essas mensagens, **está funcionando perfeitamente!** 🎉

### 4. Testar Checkout

1. Faça login no site
2. Vá para a página de **Planos**
3. Tente fazer um checkout de teste
4. Verifique se não há erros no console

## 🔍 Verificação Rápida

### ✅ Checklist Final:

- [ ] Variável `NEXT_PUBLIC_MP_PUBLIC_KEY` adicionada na Vercel
- [ ] Variável `MP_ACCESS_TOKEN` adicionada na Vercel
- [ ] Todas as variáveis marcadas para Production, Preview e Development
- [ ] Novo deploy feito após adicionar as variáveis
- [ ] Mensagens de sucesso aparecem no console do navegador
- [ ] Checkout funciona sem erros

## 🐛 Problemas Comuns

### ❌ "SDK não inicializou"

**Solução:**
1. Verifique se `NEXT_PUBLIC_MP_PUBLIC_KEY` está configurada corretamente
2. Faça um novo deploy após adicionar a variável
3. Limpe o cache do navegador (Ctrl+Shift+R)

### ❌ "Erros de CSP"

**Solução:**
- O `next.config.js` já está configurado corretamente
- Se ainda houver erros, verifique se o deploy incluiu as mudanças do `next.config.js`

### ❌ "Erro ao fazer pagamento"

**Solução:**
1. Verifique se `MP_ACCESS_TOKEN` está configurado
2. Verifique se o token está correto (credenciais de produção)
3. Verifique os logs na Vercel: **Deployments** → **Logs**

## 📝 Notas Importantes

- ⚠️ **NUNCA** faça commit do `.env.local` no Git (já está no `.gitignore`)
- ✅ As variáveis de ambiente devem ser adicionadas **apenas na Vercel**
- ✅ O `next.config.js` já está configurado para produção
- ✅ O SDK funciona automaticamente quando as variáveis estão configuradas

## 🎉 Pronto!

Se tudo estiver configurado, o SDK MercadoPago.JS V2 vai funcionar perfeitamente na Vercel e você vai ganhar os pontos do Mercado Pago! 🚀

