# 🔄 Como Funciona a Renovação Automática Mensal

## ✅ O que foi implementado

Quando você paga com **Cartão de Crédito (PCI Secure Fields)**, o sistema cria uma **assinatura recorrente (Preapproval)** no Mercado Pago, que renova automaticamente todo mês.

## 📋 Fluxo Completo

### 1. **Criação da Assinatura**
- Você preenche os dados do cartão no formulário PCI Secure Fields
- O sistema cria um **token** seguro do seu cartão
- O token é usado para criar um **Preapproval** no Mercado Pago
- O Preapproval salva seu cartão e configura a renovação automática

### 2. **Primeiro Pagamento**
- O Mercado Pago processa a primeira cobrança
- O webhook recebe a confirmação e ativa seu plano
- Seu plano é ativado no sistema

### 3. **Renovações Automáticas**
- **Todo mês**, no mesmo dia da primeira assinatura, o Mercado Pago:
  1. Cobra automaticamente no cartão salvo
  2. Envia um webhook para o sistema
  3. O sistema renova seu plano automaticamente
  4. Suas ofertas são resetadas para o novo mês

## 🔍 Como Verificar se está Funcionando

### No Mercado Pago Dashboard:
1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em **"Suas integrações"** → **"Assinaturas"**
3. Você verá sua assinatura listada com:
   - ✅ Status: "Autorizado" ou "Aprovado"
   - ✅ Próxima cobrança: Data do próximo mês
   - ✅ Cartão salvo: Últimos 4 dígitos do cartão

### No Firestore (Firebase):
1. Coleção `users` → Seu documento
2. Verifique os campos:
   - `assinaturaAtiva: true`
   - `plano: "premium"` (ou o plano escolhido)
   - `subscriptionId: "123456789"` (ID da assinatura no Mercado Pago)
   - `dataProximoPagamento: Timestamp` (próxima renovação)

### No Console do Sistema:
- Ao criar a assinatura, você verá:
  ```
  ✅ Assinatura criada!
  ✅ Renovação automática mensal configurada!
  ```

## 🔄 Processo de Renovação

Quando chega a data de renovação:

1. **Mercado Pago cobra automaticamente**
   - Usa o cartão salvo no Preapproval
   - Processa o pagamento

2. **Webhook recebe a notificação**
   - Endpoint: `/api/mercadopago/webhook`
   - Tipo: `subscription_preapproval.updated` ou `payment.created`

3. **Sistema atualiza automaticamente**
   - Reseta `ofertasUsadas` para 0
   - Atualiza `dataProximoPagamento` para o próximo mês
   - Mantém `assinaturaAtiva: true`
   - Atualiza `mesReferenciaOfertas` para o novo mês

## 📊 Exemplo de Renovação

**Assinatura criada em:** 15/01/2025  
**Primeira cobrança:** 16/01/2025  
**Próxima renovação:** 16/02/2025  
**Depois:** 16/03/2025, 16/04/2025, e assim por diante...

## ⚠️ O que acontece se o pagamento falhar?

Se o Mercado Pago não conseguir cobrar (cartão expirado, sem saldo, etc.):

1. O Mercado Pago tenta novamente automaticamente
2. Se falhar após várias tentativas, a assinatura é **cancelada**
3. O webhook notifica o sistema
4. O sistema:
   - Define `assinaturaAtiva: false`
   - Remove `subscriptionId`
   - O usuário volta para o plano básico

## 🔐 Segurança

- ✅ Cartão tokenizado (PCI Compliance)
- ✅ Dados nunca armazenados no servidor
- ✅ Renovação gerenciada pelo Mercado Pago
- ✅ Webhooks verificados com secret

## 📝 Notas Importantes

- A renovação é **automática** - você não precisa fazer nada
- O cartão é **salvo** no Mercado Pago de forma segura
- Você pode **cancelar** a qualquer momento na página de configurações
- A renovação acontece no **mesmo dia** todo mês
- Se precisar trocar o cartão, cancele e crie uma nova assinatura

## ✅ Confirmação Visual

Quando a assinatura é criada com sucesso, você verá:
- ✅ "Assinatura criada! Aguardando aprovação..."
- ✅ "Renovação automática mensal configurada!"

Isso confirma que a renovação automática está ativa! 🎉

