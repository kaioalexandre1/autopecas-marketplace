# 🚀 Como Colocar o Site no Ar (Deploy)

## Opção Mais Fácil: Vercel (RECOMENDADO)

### Passo a Passo:

#### 1. Criar conta na Vercel
- Acesse: https://vercel.com
- Clique em "Sign Up" (Criar Conta)
- Use sua conta do GitHub, GitLab ou e-mail

#### 2. Deploy pelo Site (Método Visual - MAIS FÁCIL)

**A. Se você usa Git (GitHub/GitLab):**
1. No painel da Vercel, clique em "Add New" → "Project"
2. Importe seu repositório
3. A Vercel detecta automaticamente que é Next.js
4. Clique em "Deploy"
5. Pronto! Seu site estará no ar em 2-3 minutos

**B. Se NÃO usa Git:**
1. Instale a CLI da Vercel:
   ```bash
   npm install -g vercel
   ```

2. No terminal, dentro da pasta do projeto, execute:
   ```bash
   npx vercel
   ```

3. Siga as instruções:
   - Login (abre no navegador)
   - Confirme as configurações
   - Aguarde o deploy

#### 3. Configurar Variáveis de Ambiente (IMPORTANTE!)

No painel da Vercel:
1. Vá em "Settings" → "Environment Variables"
2. Adicione TODAS as variáveis do seu arquivo `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. Clique em "Redeploy" para aplicar as variáveis

#### 4. Seu Site Está no Ar! 🎉

Você receberá um link como:
```
https://seu-projeto.vercel.app
```

---

## ⚙️ Configurar Domínio Próprio (Opcional)

1. No painel da Vercel, vá em "Settings" → "Domains"
2. Adicione seu domínio
3. Configure o DNS conforme as instruções

---

## 🔒 Checklist Antes do Deploy

- [ ] Testar o site localmente (`npm run dev`)
- [ ] Verificar se todas as funcionalidades funcionam
- [ ] Configurar regras de segurança do Firebase para produção
- [ ] Ter todas as credenciais do Firebase em `.env.local`
- [ ] Verificar se não há erros no console

---

## 📱 Testar o Site Depois do Deploy

1. Acesse o link fornecido pela Vercel
2. Teste em diferentes dispositivos (celular, tablet, desktop)
3. Teste todas as funcionalidades:
   - Login/Cadastro
   - Criar pedidos
   - Fazer ofertas
   - Chat
   - Negócios fechados

---

## 🆘 Problemas Comuns

### Site não carrega
- Verifique se adicionou as variáveis de ambiente
- Olhe os logs na Vercel (aba "Deployments" → clique no deploy → "Logs")

### Firebase não funciona
- Verifique as regras de segurança do Firebase
- Certifique-se de que o domínio da Vercel está autorizado no Firebase

### Erros de compilação
- Execute `npm run build` localmente para ver os erros
- Corrija os erros antes de fazer deploy novamente

---

## 💡 Dicas

- **Gratuito**: O plano gratuito da Vercel é perfeito para começar
- **Atualizações**: Cada push no Git faz um novo deploy automaticamente
- **Rollback**: Você pode voltar para versões anteriores facilmente
- **Preview**: Cada branch/PR gera um preview link para testar

---

## 🔄 Atualizar o Site

**Com Git:**
```bash
git add .
git commit -m "Atualização"
git push
```
A Vercel faz o deploy automaticamente!

**Sem Git:**
```bash
npx vercel --prod
```

---

## 📞 Suporte

- Documentação Vercel: https://vercel.com/docs
- Documentação Next.js: https://nextjs.org/docs
- Firebase: https://firebase.google.com/docs

