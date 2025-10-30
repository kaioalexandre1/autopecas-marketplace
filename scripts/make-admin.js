// Script para transformar um usuário em administrador
// Execute este script no Console do Firebase (Firestore)

// INSTRUÇÕES:
// 1. Acesse: https://console.firebase.google.com
// 2. Selecione seu projeto: autopecas-marketplace
// 3. Vá em: Firestore Database
// 4. Abra o Console (ícone ">_" no canto superior direito)
// 5. Cole e execute o código abaixo

// Para transformar kaioxander@gmail.com em admin:
// 1. Encontre o documento do usuário na coleção 'users'
// 2. Procure pelo email 'kaioxander@gmail.com' ou pelo nome do usuário
// 3. Adicione o campo: role: "admin"

// OU execute este código no Console do navegador (F12):

const transformarEmAdmin = async (email) => {
  const { collection, query, where, getDocs, updateDoc, doc } = window.firebase.firestore;
  const db = window.firebase.firestore();
  
  try {
    // Buscar usuário por email no Authentication
    const auth = window.firebase.auth();
    const userRecord = await auth.getUserByEmail(email);
    
    // Atualizar no Firestore
    const userRef = doc(db, 'users', userRecord.uid);
    await updateDoc(userRef, {
      role: 'admin'
    });
    
    console.log(`✅ Usuário ${email} agora é ADMINISTRADOR!`);
    alert(`✅ Usuário ${email} agora é ADMINISTRADOR!`);
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao transformar usuário em admin: ' + error.message);
  }
};

// Chamar a função
transformarEmAdmin('kaioxander@gmail.com');




