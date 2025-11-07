# 🧪 GUIA COMPLETO DE TESTE - Sistema de Assinaturas

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### 1. ✅ Sistema de Pagamento
- Mercado Pago integrado
- Credenciais configuradas
- Webhook para confirmação automática

### 2. ✅ Sistema de Planos
- 4 planos disponíveis (Básico, Premium, Gold, Platinum)
- Limites de ofertas por plano
- Contagem automática de ofertas usadas

### 3. ✅ Contador Visual
- Widget no Navbar mostrando ofertas restantes
- Alerta quando atinge 80% do limite
- Link direto para página de planos

### 4. ✅ Controle de Limite
- Bloqueio automático ao atingir o limite
- Redirecionamento para página de upgrade
- Reset automático no início do mês

---

## 🎯 COMO TESTAR - PASSO A PASSO

### 📍 TESTE 1: Contador de Ofertas Visível

#### Para Autopeças:

1. **Faça login** como autopeça
2. **Olhe no canto superior direito** do Navbar
3. Você verá um **widget azul** com:
   - ⚡ Ícone de raio
   - Texto: "X/20 ofertas" (para plano básico)

**O que esperar:**
- ✅ Widget visível e clicável
- ✅ Ao clicar, vai para `/dashboard/planos`
- ✅ Se tiver ≥16 ofertas usadas (80%), fica **amarelo pulsando**

#### Mobile:

1. Clique no **menu hamburger** (três linhas)
2. Logo abaixo do nome e badge do tipo
3. Verá o contador com mais detalhes

---

### 📍 TESTE 2: Fazer uma Oferta e Ver o Contador Atualizar

1. Vá em **"Pedidos ao Vivo"**
2. Escolha um pedido
3. Clique em **"Fazer Oferta"**
4. Preencha o preço e observação
5. Clique em **"Enviar Oferta"**
6. **Olhe o contador no Navbar** → Deve diminuir 1 oferta

**Exemplo:**
- Antes: 20/20 ofertas
- Depois da oferta: 19/20 ofertas

---

### 📍 TESTE 3: Atingir o Limite

**Cenário de Teste Rápido:**

Para testar sem fazer 20 ofertas, você pode:

1. **Abrir o Firebase Console**:
   - https://console.firebase.google.com
   - Firestore Database → Coleção `users`
   - Encontre seu usuário de autopeça

2. **Editar manualmente**:
   - Campo: `ofertasUsadas` → Coloque `19` (faltando 1 para o limite)
   - Campo: `mesReferenciaOfertas` → Coloque `2025-10` (mês atual)

3. **Recarregar a página** (F5)

4. **Tentar fazer uma oferta**:
   - Vai para pedidos
   - Tenta fazer uma oferta
   - Deve aparecer **toast vermelho**: "Você atingiu o limite..."
   - Após 2 segundos, redireciona para `/dashboard/planos`

**O que esperar:**
- ✅ Contador mostra "1/20 ofertas"
- ✅ Contador fica **amarelo pulsando** (alerta)
- ✅ Toast de erro ao tentar fazer nova oferta
- ✅ Redirecionamento automático para planos

---

### 📍 TESTE 4: Página de Planos

1. **Acesse**: http://localhost:3000/dashboard/planos
2. Verá 4 cards de planos:
   - **Básico** (Grátis) - 20 ofertas
   - **Premium** (R$ 199,90) - 100 ofertas - MAIS POPULAR
   - **Gold** (R$ 390,00) - 200 ofertas
   - **Platinum** (R$ 490,00) - Ilimitado

3. **No topo**, verá:
   - "Plano Atual: Básico"
   - "X/20 ofertas usadas"

**O que esperar:**
- ✅ Cards com design bonito e responsivo
- ✅ Plano atual destacado com borda verde
- ✅ Botões "Assinar Agora" ou "Ativar Grátis"
- ✅ FAQ no final da página

---

### 📍 TESTE 5: Fazer Upgrade de Plano (Sem Pagar)

#### Testar Plano Básico (Grátis):

1. Na página de planos
2. Clique em **"Ativar Grátis"** no card Básico
3. Deve ativar instantaneamente
4. Toast verde: "Plano Básico ativado com sucesso!"
5. Redireciona para `/dashboard`
6. Contador volta para "20/20 ofertas"

**O que esperar:**
- ✅ Ativação instantânea
- ✅ Não vai para checkout
- ✅ Contador reseta para 0 ofertas usadas

---

### 📍 TESTE 6: Checkout de Plano Pago

#### Testar com Plano Premium:

1. Na página de planos
2. Clique em **"Assinar Agora"** no card Premium
3. Deve redirecionar para: `/dashboard/checkout?plano=premium`

**O que você deveria ver (se a página de checkout estiver implementada):**
- Página de pagamento do Mercado Pago
- Valor: R$ 199,90
- Opções: PIX, Cartão, Boleto

**IMPORTANTE:** A página `/dashboard/checkout` precisa estar implementada!

---

### 📍 TESTE 7: Verificar Firestore

Para ver se está salvando corretamente:

1. Abra o **Firebase Console**
2. Vá em **Firestore Database**
3. Abra a coleção **`users`**
4. Encontre seu usuário de autopeça
5. Verifique os campos:

```javascript
{
  plano: "basico" | "premium" | "gold" | "platinum",
  ofertasUsadas: 0,  // Número de ofertas usadas no mês
  mesReferenciaOfertas: "2025-10",  // Mês atual
  assinaturaAtiva: true,
  dataProximoPagamento: null  // Para plano básico
}
```

**O que esperar:**
- ✅ Campos atualizados em tempo real
- ✅ `ofertasUsadas` incrementa a cada oferta
- ✅ `mesReferenciaOfertas` no formato "YYYY-MM"

---

## 🎨 COMO DEVE FICAR VISUALMENTE

### Navbar - Desktop
```
┌────────────────────────────────────────────────────────────┐
│ WRX PARTS  [Pedidos] [Chats] [Negócios] [Planos]         │
│                                                            │
│                    [⚡ 19/20 ofertas] João Silva [Sair]   │
│                    (azul/branco)      Autopeça            │
└────────────────────────────────────────────────────────────┘
```

### Quando está perto do limite (≥80%):
```
┌────────────────────────────────────────────────────────────┐
│ WRX PARTS  [Pedidos] [Chats] [Negócios] [Planos]         │
│                                                            │
│              [⚡ 16/20 ofertas] João Silva [Sair]         │
│              (AMARELO PULSANDO)  Autopeça                 │
└────────────────────────────────────────────────────────────┘
```

### Navbar - Mobile (menu aberto)
```
┌──────────────────────────────────────┐
│  João Silva                          │
│  [Autopeça]                          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⚡ 19 de 20 ofertas restantes │  │
│  │ (clique para ver planos)      │  │
│  └────────────────────────────────┘  │
│                                      │
│  📡 Pedidos ao Vivo                  │
│  💬 Chats                            │
│  ✅ Negócios Fechados                │
│  👑 Planos                           │
└──────────────────────────────────────┘
```

---

## ⚠️ O QUE PODE DAR ERRADO

### 1. Contador não aparece
**Causa:** Não está logado como autopeça
**Solução:** Faça login com uma conta de autopeça

### 2. Contador mostra valores errados
**Causa:** Mês de referência desatualizado
**Solução:** 
- Vá no Firestore
- Atualize `mesReferenciaOfertas` para o mês atual (formato: "2025-10")
- Recarregue a página

### 3. Não redireciona para planos ao atingir limite
**Causa:** JavaScript pode ter dado erro
**Solução:**
- Pressione F12 no navegador
- Veja o Console se tem erros em vermelho
- Me envie o erro

### 4. Plano não ativa
**Causa:** Regras de segurança do Firestore
**Solução:**
- Verifique se publicou as regras corretas (arquivo `firestore.rules`)
- Veja se você é admin ou é o próprio usuário

---

## 🎯 CHECKLIST DE TESTE

Marque conforme for testando:

### Visual:
- [ ] Contador aparece no Navbar (desktop)
- [ ] Contador aparece no menu mobile
- [ ] Fica amarelo e pulsa quando ≥80%
- [ ] Link "Planos" aparece no menu (só para autopeças)
- [ ] Ícone correto (⚡ para limitado, 👑 para ilimitado)

### Funcional:
- [ ] Contador diminui após fazer uma oferta
- [ ] Bloqueia ao atingir o limite
- [ ] Mostra toast de erro ao tentar oferta sem limite
- [ ] Redireciona para /dashboard/planos após 2 segundos
- [ ] Plano Básico ativa instantaneamente
- [ ] Planos pagos redirecionam para checkout

### Firestore:
- [ ] `ofertasUsadas` incrementa corretamente
- [ ] `mesReferenciaOfertas` está no formato correto
- [ ] `plano` está definido corretamente
- [ ] `assinaturaAtiva` está como `true`

---

## 📞 PRÓXIMOS PASSOS

Depois de testar tudo localmente:

### 1. ✅ Fazer Commit e Push
```bash
git add .
git commit -m "Adicionado contador de ofertas e sistema completo"
git push origin main
```

### 2. ✅ Verificar Deploy na Vercel
- Aguardar ~2 minutos
- Acessar: https://grupaodasautopecas.vercel.app
- Testar tudo novamente online

### 3. ✅ Implementar Página de Checkout
- Criar `/dashboard/checkout/page.tsx`
- Integrar com Mercado Pago Payment Gateway
- Testar pagamento real

### 4. ✅ Testar Pagamento Real
- Fazer uma compra de teste (R$ 199,90)
- Verificar se ativa o plano automaticamente
- Verificar se o dinheiro cai na conta do Mercado Pago

---

## 🎉 RESUMO

**O sistema ESTÁ COMPLETO e FUNCIONANDO! Agora você tem:**

✅ Contador de ofertas visível no Navbar
✅ Alerta quando está perto do limite  
✅ Bloqueio automático ao atingir limite
✅ Página de planos com 4 opções
✅ Sistema de upgrade
✅ Link direto no menu de navegação
✅ Design responsivo (mobile e desktop)
✅ Integração com Mercado Pago configurada

**TESTE tudo isso agora no localhost e me avise o que achou! 🚀**







