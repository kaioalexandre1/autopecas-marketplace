# 💳 Como Ativar Pagamentos Reais - GUIA RÁPIDO

## ✅ Sistema Está 100% Pronto!

Tudo foi implementado e está funcionando! Agora você só precisa conectar sua conta do Mercado Pago.

---

## 📋 Passos para Começar a Receber Pagamentos

### 1️⃣ Criar Conta no Mercado Pago (se ainda não tem)

**Com CPF (Agora):**
1. Acesse: https://www.mercadopago.com.br
2. Clique em "Criar conta"
3. Use seu CPF e dados pessoais
4. Confirme seu email
5. **Pronto! Já pode receber pagamentos!**

**Com CNPJ (Depois, quando tiver):**
1. Crie uma nova conta com o CNPJ
2. Ou atualize sua conta existente em "Perfil" → "Dados da empresa"

---

### 2️⃣ Obter Credenciais de PRODUÇÃO

1. Acesse: **https://www.mercadopago.com.br/developers**
2. Faça login
3. Clique em **"Suas integrações"**
4. Clique em **"Credenciais"**
5. Selecione **"Credenciais de produção"** (NÃO use teste!)

Você verá 2 chaves:

**Public Key:**
```
pk_live_xxxxxxxxxxxxxxxxxxxxxx
```

**Access Token:**
```
APP_USR-1234567890-012345-xxxxxxxxx-xxxxx
```

🚨 **IMPORTANTE:** Guarde essas chaves em local seguro! São como senhas!

---

### 3️⃣ Configurar no Sistema

1. Acesse seu sistema: **http://localhost:3000/admin**
2. Faça login como administrador
3. Clique no botão verde **"Configurar Mercado Pago"** no topo
4. Cole suas credenciais:
   - **Public Key**: Cole a chave que começa com `pk_live_`
   - **Access Token**: Cole a chave que começa com `APP_USR-`
5. Clique em **"Salvar Configuração"**

**✅ Pronto! Sistema configurado!**

---

### 4️⃣ Testar (IMPORTANTE!)

Antes de divulgar, faça um teste:

1. Crie uma conta de autopeça de teste
2. Vá em `/dashboard/planos`
3. Escolha um plano pago (Premium, por exemplo)
4. Faça o pagamento usando PIX ou cartão
5. Verifique se o plano foi ativado
6. Verifique se o dinheiro caiu na sua conta do Mercado Pago (pode levar alguns minutos)

---

## 💰 Como o Dinheiro Cai na sua Conta

### Fluxo Completo:

1. **Cliente escolhe um plano** → Premium (R$ 199,90)
2. **Cliente paga** → Via PIX, Cartão ou Boleto
3. **Mercado Pago processa** → Cobra a taxa deles (~4%)
4. **Mercado Pago confirma** → Sistema ativa o plano automaticamente
5. **Dinheiro liberado** → Cai na sua conta do MP

### Prazos:
- **PIX**: Instantâneo
- **Cartão de Crédito**: 14 a 30 dias (padrão do MP)
- **Boleto**: 2 dias úteis após compensação

### Taxas do Mercado Pago:
- **PIX**: ~0,99% + R$ 0,40
- **Cartão**: ~4,99% + R$ 0,40  
- **Boleto**: ~R$ 3,49 por boleto

**Exemplo Real:**
- Cliente paga R$ 199,90 (Premium)
- Taxa do MP (PIX): ~R$ 2,40
- **Você recebe: ~R$ 197,50** ✅

---

## 🔄 Mudando de CPF para CNPJ

Quando você abrir seu CNPJ e quiser trocar:

### Opção 1: Nova Conta (Recomendado)
1. Crie conta nova no MP com CNPJ
2. Obtenha novas credenciais
3. Atualize no painel admin
4. Vantagem: Contabilidade separada

### Opção 2: Atualizar Conta Atual
1. No MP: "Perfil" → "Adicionar CNPJ"
2. Credenciais continuam as mesmas
3. Não precisa mudar nada no sistema

---

## 🎯 Checklist Final

Antes de lançar o sistema, verifique:

- [x] Sistema de assinatura implementado
- [x] Controle de ofertas funcionando
- [x] Painel admin acessível
- [ ] **Conta do Mercado Pago criada**
- [ ] **Credenciais obtidas e configuradas**
- [ ] **Teste de pagamento realizado**
- [ ] **Dinheiro recebido na conta do MP**

---

## 🆘 Problemas Comuns

### "Pagamento não foi aprovado"
- Verifique se usou credenciais de PRODUÇÃO (não teste)
- Verifique se a conta do MP está ativa
- Tente outro método de pagamento

### "Dinheiro não caiu"
- PIX: Cai na hora
- Cartão: 14-30 dias (normal do MP)
- Verifique em "Vendas" no painel do Mercado Pago

### "Credenciais inválidas"
- Certifique-se de copiar COMPLETAS as chaves
- Verifique se não tem espaços no início/fim
- Use credenciais de PRODUÇÃO

---

## 📞 Suporte do Mercado Pago

- **Central de Ajuda**: https://www.mercadopago.com.br/ajuda
- **Telefone**: 4003-8850 (capitais) ou 0800-882-7080 (demais regiões)
- **Chat**: Disponível no site
- **Email**: Através da central de ajuda

---

## 🚀 Pronto para Lançar!

✅ **Tudo está implementado e funcionando!**

Agora é só:
1. Configurar suas credenciais do Mercado Pago
2. Fazer um teste
3. **Começar a vender e ganhar dinheiro!** 💰

---

**Boa sorte com seu marketplace! 🎉**








