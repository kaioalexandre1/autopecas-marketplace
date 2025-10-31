import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Exclui todos os chats relacionados a um pedido específico
 */
export async function excluirChatsDoPedido(pedidoId: string): Promise<number> {
  try {
    console.log(`🗑️ Buscando chats relacionados ao pedido ${pedidoId}...`);
    
    // Buscar todos os chats relacionados a este pedido
    const chatsQuery = query(
      collection(db, 'chats'),
      where('pedidoId', '==', pedidoId)
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    const chatsIds: string[] = [];
    
    chatsSnapshot.forEach((chatDoc) => {
      chatsIds.push(chatDoc.id);
    });
    
    if (chatsIds.length === 0) {
      console.log(`✅ Nenhum chat encontrado para o pedido ${pedidoId}`);
      return 0;
    }
    
    console.log(`🗑️ Encontrados ${chatsIds.length} chat(s) para excluir`);
    
    // Excluir todos os chats
    const resultados = await Promise.allSettled(
      chatsIds.map(async (chatId) => {
        try {
          await deleteDoc(doc(db, 'chats', chatId));
          console.log(`✅ Chat ${chatId} excluído com sucesso`);
          return { chatId, sucesso: true };
        } catch (error: any) {
          console.error(`❌ Erro ao excluir chat ${chatId}:`, error);
          throw error;
        }
      })
    );
    
    const sucesso = resultados.filter(r => r.status === 'fulfilled').length;
    const falhas = resultados.filter(r => r.status === 'rejected').length;
    
    if (falhas > 0) {
      console.error(`⚠️ ${sucesso} chat(s) excluído(s), mas ${falhas} falharam`);
    } else {
      console.log(`✅ Todos os ${sucesso} chat(s) foram excluídos com sucesso`);
    }
    
    return sucesso;
  } catch (error: any) {
    console.error(`❌ Erro ao excluir chats do pedido ${pedidoId}:`, error);
    throw error;
  }
}

