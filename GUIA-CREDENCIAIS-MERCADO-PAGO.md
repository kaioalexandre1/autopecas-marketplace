# 🔑 GUIA: Credenciais do Mercado Pago - Atualizado 2025

## ⚠️ ATENÇÃO: Mercado Pago Mudou a Nomenclatura!

O Mercado Pago **MUDOU** recentemente como exibe as credenciais. Agora você verá:

### 📸 O que você vê na tela do Mercado Pago:

```
┌─────────────────────────────────────────────┐
│  Credenciais de produção                    │
├─────────────────────────────────────────────┤
│                                             │
│  Public Key                          📋     │
│  APP_USR-eaa4c975-34b1-44b1-898e...       │
│                                             │
│  Access Token                    👁️  📋     │
│  ........................................  │
│  (clique no olhinho para revelar)          │
└─────────────────────────────────────────────┘
```

---

## ✅ Como Configurar CORRETAMENTE

### Passo 1: No Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em **"Suas integrações"** → **"Credenciais"**
3. Clique em **"Credenciais de produção"** (não teste!)

### Passo 2: Copiar as Credenciais

#### 🔑 Public Key (PRIMEIRA)
- **O que você vê**: `APP_USR-eaa4c975-34b1-44b1-898e-8551eb0ca677`
- **Ação**: Clique no ícone de copiar 📋
- **Cole**: No primeiro campo do sistema

#### 🔐 Access Token (SEGUNDA)
- **O que você vê**: `........................................` (oculto)
- **Ação**: 
  1. Clique no ícone do olho 👁️ para revelar
  2. Clique no ícone de copiar 📋
- **Cole**: No segundo campo do sistema

---

## 💻 No Seu Sistema (Painel Admin)

### Passo 1: Acessar o Admin
```
http://localhost:3000/admin
```

### Passo 2: Encontrar o Botão

No topo da página, **LADO DIREITO**, você verá um botão verde **PULSANDO**:

```
┌──────────────────────────────────────────────────┐
│  ← Voltar ao Dashboard                           │
│                                                  │
│                    [💳 CONFIGURAR MERCADO PAGO]  │
│                    (botão verde pulsando)        │
│                                                  │
│  🛡️ Painel Administrativo                        │
└──────────────────────────────────────────────────┘
```

**Se NÃO está vendo o botão:**
1. Atualize a página (F5 ou Ctrl+R)
2. Verifique se está logado como admin
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Tente em modo anônimo/privado

### Passo 3: Preencher os Campos

Quando clicar no botão, um modal vai abrir:

```
┌─────────────────────────────────────────────────┐
│  💳 Configurar Mercado Pago                  ❌  │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔑 Public Key                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ APP_USR-eaa4c975-34b1-44b1-898e...      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  🔐 Access Token (clique no olhinho 👁️)        │
│  ┌──────────────────────────────────────────┐  │
│  │ APP_USR-1234567890-012345-xxxxxxxx...   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [Cancelar]  [Salvar Configuração]             │
└─────────────────────────────────────────────────┘
```

### Passo 4: Salvar

1. Cole a **Public Key** no primeiro campo
2. Cole o **Access Token** no segundo campo
3. Clique em **"Salvar Configuração"**
4. Você verá: ✅ **"Configuração do Mercado Pago salva com sucesso!"**

---

## 🎯 RESUMO RÁPIDO

| Campo no Mercado Pago | Cole em | Formato |
|-----------------------|---------|---------|
| **Public Key** | 1º campo | `APP_USR-xxxx-xxxx-xxxx-xxxx` |
| **Access Token** (👁️) | 2º campo | `APP_USR-1234567890-012345-xxx...` |

### ⚠️ Dicas Importantes:

- ✅ **Sempre use credenciais de PRODUÇÃO**
- ✅ **Copie COMPLETO** (não deixe espaços no início/fim)
- ✅ **Clique no olhinho 👁️** para revelar o Access Token
- ✅ **Ambas as chaves começam com APP_USR-** (isso é normal!)
- ❌ **NÃO use credenciais de TESTE**

---

## 🔧 Resolução de Problemas

### "O botão não aparece"

**Solução:**
```bash
# 1. Pare o servidor (Ctrl+C)
# 2. Limpe o cache
npm run build
# 3. Inicie novamente
npm run dev
# 4. Acesse: http://localhost:3000/admin
# 5. Faça hard refresh: Ctrl+Shift+R
```

### "Credenciais inválidas"

**Verifique:**
- [ ] Copiou COMPLETAS as duas chaves?
- [ ] Revelou o Access Token (clicou no 👁️)?
- [ ] Usou credenciais de PRODUÇÃO (não teste)?
- [ ] Não tem espaços extras no início/fim?

### "Ambas começam com APP_USR-, está certo?"

**SIM! Isso mudou recentemente no Mercado Pago!**

Antigamente:
- Public Key: `pk_live_xxxxx`
- Access Token: `APP_USR-xxxxx`

**Agora (2025):**
- Public Key: `APP_USR-eaa4c975-...` (curta)
- Access Token: `APP_USR-1234567890-...` (longa, mais números)

---

## 📞 Precisa de Ajuda?

### Mercado Pago:
- Site: https://www.mercadopago.com.br/ajuda
- Telefone: 4003-8850 ou 0800-882-7080

### Seu Sistema:
- Verifique os logs no terminal
- Acesse o console do navegador (F12)
- Veja se há erros em vermelho

---

## ✅ Checklist Final

Antes de testar pagamentos:

- [ ] Conta no Mercado Pago criada e verificada
- [ ] Acessou a área de desenvolvedores
- [ ] Copiou a Public Key (APP_USR-...)
- [ ] Revelou e copiou o Access Token (APP_USR-...)
- [ ] Acessou o painel admin do sistema
- [ ] Clicou no botão verde "CONFIGURAR MERCADO PAGO"
- [ ] Colou as duas credenciais
- [ ] Salvou com sucesso
- [ ] Testou com um pagamento real ou simulado

---

**🎉 Pronto! Agora você pode receber pagamentos!**










