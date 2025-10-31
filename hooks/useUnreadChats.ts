'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Chat } from '@/types';

export function useUnreadChats() {
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userData) {
      setUnreadCount(0);
      return;
    }

    let q;
    
    if (userData.tipo === 'oficina') {
      q = query(
        collection(db, 'chats'),
        where('oficinaId', '==', userData.id)
      );
    } else if (userData.tipo === 'autopeca') {
      q = query(
        collection(db, 'chats'),
        where('autopecaId', '==', userData.id)
      );
    } else {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          encerradoEm: data.encerradoEm?.toDate(),
          ultimaLeituraOficina: data.ultimaLeituraOficina?.toDate(),
          ultimaLeituraAutopeca: data.ultimaLeituraAutopeca?.toDate(),
          mensagens: data.mensagens?.map((m: any) => ({
            ...m,
            createdAt: m.createdAt?.toDate() || new Date(),
          })) || [],
        } as Chat);
      });

      // Contar mensagens não lidas
      let count = 0;
      chats.forEach((chat) => {
        if (chat.encerrado) return;
        if (chat.mensagens.length === 0) return;
        
        const ultimaLeitura = userData.tipo === 'oficina' 
          ? chat.ultimaLeituraOficina 
          : chat.ultimaLeituraAutopeca;
        
        if (!ultimaLeitura) {
          // Se nunca leu, verificar se há mensagens de outros usuários
          const temMensagemDeOutro = chat.mensagens.some(m => m.remetenteId !== userData.id);
          if (temMensagemDeOutro) count++;
          return;
        }
        
        const ultimaMensagem = chat.mensagens[chat.mensagens.length - 1];
        if (ultimaMensagem.createdAt > ultimaLeitura && 
            ultimaMensagem.remetenteId !== userData.id) {
          count++;
        }
      });

      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [userData]);

  return unreadCount;
}

