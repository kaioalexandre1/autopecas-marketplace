# 🔧 Como Liberar o PowerShell para Executar Comandos

## ⚠️ Seu PowerShell está bloqueado!

Erro que você está vendo:
```
"a execução de scripts foi desabilitada neste sistema"
```

---

## ✅ SOLUÇÃO RÁPIDA (2 minutos)

### Opção 1: Usar o CMD (Mais Fácil)

1. Feche o PowerShell
2. Abra o **Prompt de Comando (CMD)**:
   - Pressione `Windows + R`
   - Digite: `cmd`
   - Aperte Enter
3. Navegue até a pasta do projeto:
   ```cmd
   cd C:\Users\kaiox\autopecas-marketplace
   ```
4. Execute:
   ```cmd
   npm run dev
   ```

✅ **Pronto! O servidor vai iniciar!**

---

### Opção 2: Liberar o PowerShell (Recomendado)

1. **Feche** o PowerShell atual
2. **Abra como Administrador**:
   - Pressione `Windows + X`
   - Escolha: **"Windows PowerShell (Admin)"** ou **"Terminal (Admin)"**
3. Execute este comando:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
4. Quando perguntar, digite: `S` (Sim) e aperte Enter
5. Agora navegue até a pasta:
   ```powershell
   cd C:\Users\kaiox\autopecas-marketplace
   ```
6. Execute:
   ```powershell
   npm run dev
   ```

✅ **PowerShell liberado para sempre!**

---

## 🌐 Acessar o Sistema Local

Após o servidor iniciar, abra o navegador e acesse:

```
http://localhost:3000
```

Para o painel admin:
```
http://localhost:3000/admin
```

---

## 🚀 Fazer o Deploy Online (Vercel)

O erro online foi **CORRIGIDO**! Era um erro de digitação no código que já consertei.

Para fazer o deploy:

### Método 1: Através do Git (Automático)
```bash
git add .
git commit -m "Corrigido erro de build"
git push origin main
```

A Vercel vai detectar automaticamente e fazer o deploy! ✅

### Método 2: Através do Site da Vercel
1. Acesse: https://vercel.com
2. Vá no seu projeto: `grupaodasautopecas`
3. Clique em **"Redeploy"**
4. Aguarde ~30 segundos
5. ✅ Deploy concluído!

---

## 📋 Resumo

**O que estava errado:**
- ❌ Erro de digitação no código: `valorDentroC idade` (com espaço)
- ❌ PowerShell bloqueado no Windows

**O que foi corrigido:**
- ✅ Código corrigido: `valorDentroCidade` (sem espaço)
- ✅ Instruções para liberar o PowerShell

**Próximos passos:**
1. Liberar o PowerShell OU usar o CMD
2. Rodar `npm run dev`
3. Fazer commit e push (deploy automático)
4. Acessar http://localhost:3000

---

## 🆘 Se Ainda Não Funcionar

### Se o servidor local não iniciar:
```bash
# Limpe o cache
rm -rf .next
npm install
npm run dev
```

### Se o deploy ainda falhar:
- Verifique os logs no painel da Vercel
- Veja a aba "Build Logs" para detalhes
- Me envie os erros que aparecerem

---

**Tudo pronto! Agora vai funcionar! 🎉**








