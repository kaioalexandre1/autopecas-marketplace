# 🔍 Como Debugar Erro de Pagamento com Cartão

## 📋 Passos para Identificar o Problema

### 1. Verificar Console do Navegador

Quando tentar fazer um pagamento com cartão:

1. **Abra o Console do Navegador** (F12 → aba "Console")
2. **Tente fazer o pagamento novamente**
3. **Procure por mensagens que começam com:**
   - `❌ Erro checkout MP:`
   - `❌ Erro ao criar preapproval:`
   - `📤 Criando Preapproval com dados:`

### 2. Verificar Logs do Servidor

Se estiver rodando localmente:

1. **Veja o terminal onde está rodando `npm run dev`**
2. **Procure por mensagens de erro** quando tentar pagar
3. **Copie as mensagens de erro completas**

### 3. Verificar Credenciais do Mercado Pago

Certifique-se de que:

- ✅ **Access Token** está correto no `.env.local`
- ✅ **Public Key** está configurada (`APP_USR-eaa4c975-34b1-44b1-898e-8551eb0ca677`)
- ✅ Está usando credenciais de **produção** OU **teste** consistentemente

### 4. Verificar Tipo de Conta do Mercado Pago

O erro pode estar acontecendo porque:

- **Conta em modo teste** não aceita pagamentos reais
- **Conta em modo produção** pode ter limitações de aprovação

## 🔧 Possíveis Soluções

### Solução 1: Verificar se é erro na criação ou no pagamento

O erro pode estar em **duas etapas**:

1. **Etapa 1:** Criação da assinatura (nosso código)
   - Verifique o console do navegador
   - Veja se aparece `❌ Erro ao criar preapproval`

2. **Etapa 2:** Processamento do pagamento (Mercado Pago)
   - O erro aparece na página do Mercado Pago
   - Isso pode ser recusa do cartão ou problema com a conta

### Solução 2: Testar com Checkout Tradicional

Se a assinatura recorrente não funcionar, podemos fazer um **fallback** para checkout tradicional:

- Isso cria um pagamento único (não recorrente)
- Pode funcionar melhor para testes

### Solução 3: Verificar Cartões de Teste

Se estiver usando **credenciais de teste**:

- Use **cartões de teste** do Mercado Pago
- Cartões reais não funcionam com credenciais de teste

**Cartões de teste:**
- Mastercard: `5031 7557 3453 0604` (CVV: 123)
- Visa: `4509 9535 6623 3704` (CVV: 123)
- Data de validade: qualquer data futura

## 📝 Informações para Enviar

Se o problema persistir, envie:

1. **Mensagens do console do navegador**
2. **Mensagens do terminal do servidor**
3. **Screenshot do erro**
4. **Tipo de conta Mercado Pago** (teste ou produção)
5. **Tipo de cartão usado** (real ou teste)

## 🚨 Erro Comum: 403 Forbidden

Se aparecer erro **403**, pode ser:

- **Credenciais incorretas**
- **Conta sem permissões** para criar assinaturas
- **Token expirado** ou inválido

**Solução:** Verifique as credenciais no painel do Mercado Pago e atualize no `.env.local`

