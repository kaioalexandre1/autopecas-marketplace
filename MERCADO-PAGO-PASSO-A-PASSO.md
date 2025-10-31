# 💳 MERCADO PAGO - GUIA VISUAL PASSO A PASSO

## 🎯 Objetivo: Conectar sua conta para receber pagamentos reais

---

## ✅ PARTE 1: CRIAR CONTA (10 minutos)

### Passo 1.1: Acessar o Site
```
🌐 Abra seu navegador e acesse:
https://www.mercadopago.com.br
```

### Passo 1.2: Criar Conta
1. Clique em **"Criar conta"** (canto superior direito)
2. Escolha: **"Quero vender online"**
3. Preencha com **SEU CPF** (por enquanto, depois pode adicionar CNPJ)

### Passo 1.3: Dados Pessoais
```
📝 Preencha:
- Nome completo
- Email (use um email que você acessa sempre!)
- CPF
- Telefone
- Crie uma senha forte
```

### Passo 1.4: Confirmar Email
1. Verifique seu email
2. Clique no link de confirmação
3. ✅ **Conta criada!**

---

## ✅ PARTE 2: OBTER CREDENCIAIS (5 minutos)

### Passo 2.1: Acessar Área de Desenvolvedores
```
🌐 Acesse:
https://www.mercadopago.com.br/developers
```

### Passo 2.2: Fazer Login
- Use o email e senha que você acabou de criar

### Passo 2.3: Ir em "Credenciais"
1. No menu esquerdo, clique em **"Suas integrações"**
2. Clique em **"Credenciais"**
3. Você verá duas abas:
   - ❌ **"Teste"** (NÃO USE!)
   - ✅ **"Produção"** (USE ESTA!)

### Passo 2.4: Criar Aplicação (se necessário)
Se for a primeira vez:
1. Clique em **"Criar aplicação"**
2. Nome: `Autopecas Marketplace`
3. Tipo: `Pagamentos online`
4. Clique em **"Criar"**

### Passo 2.5: Copiar Credenciais
Você verá 2 chaves importantes:

#### **Public Key** (Chave Pública):
```
pk_live_abc123def456ghi789...
```
📋 **Copie esta chave completa!**

#### **Access Token** (Token de Acesso):
```
APP_USR-1234567890-012345-xyz123abc456...
```
📋 **Copie esta chave completa!**

🚨 **IMPORTANTE:**
- Não compartilhe essas chaves com ninguém!
- São como senhas da sua conta!
- Guarde em local seguro!

---

## ✅ PARTE 3: CONFIGURAR NO SEU SISTEMA (2 minutos)

### Passo 3.1: Acessar Admin
```bash
# Seu sistema está rodando em:
http://localhost:3000

# Ou se já fez deploy:
https://grupaodasautopecas.vercel.app
```

1. Acesse o admin: `/admin`
2. Faça login com sua conta de administrador

### Passo 3.2: Abrir Configuração
1. No topo da página, você verá um botão verde:
   **"Configurar Mercado Pago"**
2. Clique nele

### Passo 3.3: Colar Credenciais
Um modal vai abrir com 2 campos:

#### Campo 1: **Public Key**
```
Cole aqui: pk_live_abc123def456ghi789...
```

#### Campo 2: **Access Token**
```
Cole aqui: APP_USR-1234567890-012345-xyz123abc456...
```

### Passo 3.4: Salvar
1. Clique em **"Salvar Configuração"**
2. Você verá: ✅ **"Configuração do Mercado Pago salva com sucesso!"**

🎉 **PRONTO! CONFIGURADO!**

---

## ✅ PARTE 4: TESTAR (15 minutos)

### Passo 4.1: Criar Conta de Teste
1. Saia da conta admin
2. Vá em `/cadastro`
3. Crie uma conta de **Autopeça** de teste
   - Use um email diferente (pode ser Gmail secundário)
   - Nome: "Teste AutoPeças"

### Passo 4.2: Escolher Plano
1. Após fazer login com a conta teste
2. Vá em `/dashboard/planos`
3. Escolha o plano **Premium** (R$ 199,90)

### Passo 4.3: Fazer Pagamento
1. Você será levado ao checkout
2. Escolha **PIX** (mais rápido para testar)
3. Clique em **"Pagar R$ 199,90"**
4. Um código PIX será gerado
5. **Opção 1:** Pague de verdade (para testar completo)
6. **Opção 2:** Cancele e teste depois com cliente real

### Passo 4.4: Verificar Ativação
- Se pagou: O sistema ativará automaticamente em ~1 minuto
- Você verá: ✅ **"Plano Premium ativado!"**
- Vá em `/dashboard` e tente fazer uma oferta

### Passo 4.5: Verificar Recebimento
1. Acesse: https://www.mercadopago.com.br
2. Faça login
3. Vá em **"Vendas"**
4. Você verá o pagamento de R$ 199,90
5. O dinheiro já está na sua conta! 💰

---

## 💰 QUANTO VOCÊ RECEBE

### Exemplo Real com PIX:

```
Cliente paga:        R$ 199,90 (Premium)
Taxa Mercado Pago:   R$ 2,40 (0,99% + R$ 0,40)
──────────────────────────────────────
VOCÊ RECEBE:         R$ 197,50 ✅
```

### Exemplo Real com Cartão:

```
Cliente paga:        R$ 199,90 (Premium)
Taxa Mercado Pago:   R$ 10,37 (4,99% + R$ 0,40)
──────────────────────────────────────
VOCÊ RECEBE:         R$ 189,53 ✅
```

💡 **Dica:** Incentive pagamento por PIX (menor taxa!)

---

## 🔄 MUDANDO PARA CNPJ (FUTURO)

Quando você abrir seu CNPJ:

### Opção A: Criar Nova Conta (Recomendado)
```
Vantagens:
✅ Contabilidade separada (pessoal vs empresa)
✅ Mais profissional
✅ Emissão de NF mais fácil

Como fazer:
1. Criar nova conta no MP com CNPJ
2. Obter novas credenciais
3. Atualizar no painel admin
4. Manter conta CPF para uso pessoal
```

### Opção B: Atualizar Conta Atual
```
Vantagens:
✅ Mantém histórico
✅ Não precisa mudar nada no sistema
✅ Mais rápido

Como fazer:
1. Acessar Mercado Pago
2. Ir em "Perfil" → "Dados da empresa"
3. Adicionar CNPJ
4. Credenciais continuam as mesmas
```

---

## 📊 COMO ACOMPANHAR VENDAS

### No Mercado Pago:
```
🌐 https://www.mercadopago.com.br

Você pode ver:
- Todas as vendas
- Valores recebidos
- Taxas cobradas
- Saldo disponível
- Histórico completo
```

### No Seu Sistema (Admin):
```
🌐 /admin

Você pode ver:
- Quem contratou qual plano
- Ofertas usadas por cada autopeça
- Faturamento total
- Ranking de autopeças
- Bloquear contas se necessário
```

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

### "Não encontrei as credenciais"
```
1. Acesse: https://www.mercadopago.com.br/developers
2. Menu esquerdo: "Suas integrações"
3. Clique em "Credenciais"
4. Aba "Produção" (NÃO "Teste")
5. Se não aparecer, crie uma aplicação primeiro
```

### "Diz que a chave é inválida"
```
✅ Certifique-se de copiar COMPLETA
✅ Sem espaços no início/fim
✅ Use credenciais de PRODUÇÃO (não teste)
✅ Public Key começa com: pk_live_
✅ Access Token começa com: APP_USR-
```

### "O pagamento não foi aprovado"
```
Possíveis causas:
❌ Credenciais de teste (use produção)
❌ Conta do MP suspensa/inativa
❌ Dados do cartão incorretos
❌ Limite do cartão excedido

Solução:
1. Verifique se usou credenciais de PRODUÇÃO
2. Verifique status da conta no Mercado Pago
3. Tente com outro método de pagamento
```

### "O dinheiro não caiu"
```
Prazo normal:
✅ PIX: Instantâneo
⏳ Cartão: 14 a 30 dias (padrão do MP)
⏳ Boleto: 2 dias úteis após compensação

O que fazer:
1. Verifique em "Vendas" no Mercado Pago
2. Veja se o pagamento foi aprovado
3. Se sim, o dinheiro está reservado e cairá no prazo
```

---

## 📞 CONTATOS ÚTEIS

### Mercado Pago - Suporte:
- **Site:** https://www.mercadopago.com.br/ajuda
- **Telefone:** 4003-8850 (capitais) / 0800-882-7080
- **Chat:** Disponível no site (após login)
- **Email:** Via central de ajuda

### Horário de Atendimento:
- Segunda a Sexta: 8h às 22h
- Sábado: 9h às 18h
- Domingo e Feriados: 9h às 18h

---

## ✅ CHECKLIST FINAL

Antes de divulgar seu sistema:

- [ ] Conta no Mercado Pago criada
- [ ] Email confirmado
- [ ] Credenciais de PRODUÇÃO obtidas
- [ ] Credenciais configuradas no admin
- [ ] Teste de pagamento realizado
- [ ] Pagamento foi aprovado
- [ ] Dinheiro foi recebido (ou está reservado)
- [ ] Sistema está funcionando corretamente

---

## 🎉 CONCLUSÃO

**AGORA VOCÊ ESTÁ PRONTO PARA GANHAR DINHEIRO!**

O sistema está 100% configurado e operacional!

### O que acontece agora:
1. Clientes se cadastram como autopeça
2. Recebem 20 ofertas grátis (plano básico)
3. Ao atingir limite, são convidados a fazer upgrade
4. Pagam via Mercado Pago
5. **VOCÊ RECEBE O DINHEIRO AUTOMATICAMENTE!** 💰

### Seu trabalho:
1. Divulgar o sistema para autopeças
2. Oferecer suporte aos clientes
3. **Receber os pagamentos!** 🤑

---

**BOA SORTE E BOAS VENDAS! 🚀💰**



