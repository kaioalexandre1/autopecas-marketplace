'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserType } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signUp: (email: string, senha: string, dadosUsuario: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activityInterval: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Limpar intervalo anterior se existir
      if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
      }
      
      if (user) {
        // Verificar se a sessão ainda é válida (apenas se já existir)
        if (typeof window !== 'undefined') {
          const sessionId = localStorage.getItem('sessionId');
          const userId = localStorage.getItem('userId');
          
          // Se não há sessão no localStorage, significa que é um novo login
          // A sessão será criada no signIn, então não precisamos verificar aqui
          if (!sessionId || !userId) {
            // É um novo login, a sessão será criada no signIn
            // Não fazer nada aqui, apenas continuar o fluxo normal
          } else if (userId === user.uid) {
            // Verificar se a sessão ainda existe no Firestore
            try {
              const sessaoRef = doc(db, 'user_sessions', sessionId);
              const sessaoDoc = await getDoc(sessaoRef);
              
              if (!sessaoDoc.exists()) {
                // Sessão foi removida (limite de 3 dispositivos atingido)
                toast.error('Sua sessão foi encerrada. Você pode ter apenas 3 dispositivos logados simultaneamente.');
                await firebaseSignOut(auth);
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userId');
                return;
              }
              
              // Atualizar lastActivity inicialmente
              await updateDoc(sessaoRef, {
                lastActivity: Timestamp.now(),
              });

              // Atualizar atividade periodicamente (a cada 5 minutos)
              activityInterval = setInterval(async () => {
                try {
                  const sessaoRefAtual = doc(db, 'user_sessions', sessionId);
                  const sessaoDocAtual = await getDoc(sessaoRefAtual);
                  
                  if (!sessaoDocAtual.exists()) {
                    // Sessão foi removida, fazer logout
                    if (activityInterval) {
                      clearInterval(activityInterval);
                      activityInterval = null;
                    }
                    toast.error('Sua sessão foi encerrada. Limite de 3 dispositivos atingido.');
                    await firebaseSignOut(auth);
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('userId');
                    return;
                  }
                  
                  await updateDoc(sessaoRefAtual, {
                    lastActivity: Timestamp.now(),
                  });
                } catch (error) {
                  console.error('Erro ao atualizar atividade da sessão:', error);
                  if (activityInterval) {
                    clearInterval(activityInterval);
                    activityInterval = null;
                  }
                }
              }, 5 * 60 * 1000); // 5 minutos
            } catch (error) {
              console.error('Erro ao verificar sessão:', error);
              // Não fazer logout em caso de erro, apenas logar
            }
          } else {
            // userId não corresponde, limpar e permitir novo login
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userId');
          }
        }

        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = { id: user.uid, ...userDoc.data() } as User;
          
          // Verificar vencimento do plano e ativar básico se necessário
          if (data.tipo === 'autopeca' && data.plano && data.plano !== 'basico' && data.dataProximoPagamento && data.assinaturaAtiva) {
            try {
              let dataVencimento: Date;
              if (data.dataProximoPagamento instanceof Date) {
                dataVencimento = data.dataProximoPagamento;
              } else if ((data.dataProximoPagamento as any)?.toDate) {
                dataVencimento = (data.dataProximoPagamento as any).toDate();
              } else if ((data.dataProximoPagamento as any)?.seconds) {
                dataVencimento = new Date((data.dataProximoPagamento as any).seconds * 1000);
              } else {
                dataVencimento = null as any;
              }

              if (dataVencimento) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const vencimento = new Date(dataVencimento);
                vencimento.setHours(0, 0, 0, 0);

                // Se o plano venceu, ativar plano básico
                if (vencimento < hoje) {
                  const mesAtual = new Date().toISOString().slice(0, 7);
                  
                  await updateDoc(doc(db, 'users', user.uid), {
                    plano: 'basico',
                    assinaturaAtiva: true,
                    ofertasUsadas: 0,
                    mesReferenciaOfertas: mesAtual,
                    dataProximoPagamento: null,
                  });

                  // Recarregar dados atualizados
                  const updatedDoc = await getDoc(doc(db, 'users', user.uid));
                  if (updatedDoc.exists()) {
                    const updatedData = { id: user.uid, ...updatedDoc.data() } as User;
                    setUserData(updatedData);
                    toast.error('Seu plano expirou e foi automaticamente convertido para o plano Básico.');
                  } else {
                    setUserData(data);
                  }
                } else {
                  setUserData(data);
                }
              } else {
                setUserData(data);
              }
            } catch (error) {
              console.error('Erro ao verificar vencimento:', error);
              setUserData(data);
            }
          } else {
            setUserData(data);
          }
          
          // Aplicar tema dark se estiver ativado
          if (data.temaDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } else {
        setUserData(null);
        // Remover tema dark ao fazer logout
        document.documentElement.classList.remove('dark');
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, []);

  const signUp = async (
    email: string,
    senha: string,
    dadosUsuario: Omit<User, 'id' | 'createdAt'>
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      
      // Salvar dados adicionais do usuário no Firestore
      const userData: User = {
        ...dadosUsuario,
        id: userCredential.user.uid,
        createdAt: new Date(),
      };

      // Se for autopeça, inicializar com plano básico
      if (dadosUsuario.tipo === 'autopeca') {
        const mesAtual = new Date().toISOString().slice(0, 7);
        userData.plano = 'basico';
        userData.assinaturaAtiva = true;
        userData.ofertasUsadas = 0;
        userData.mesReferenciaOfertas = mesAtual;
        userData.contaBloqueada = false;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      setUserData(userData);
      
      toast.success('Cadastro realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está cadastrado!');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
      throw error;
    }
  };

  // Função para gerar um ID único de sessão
  const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Função para limpar sessões expiradas (mais de 24 horas sem atividade)
  const limparSessoesExpiradas = async (userId: string) => {
    try {
      const agora = Timestamp.now();
      const vinteQuatroHorasAtras = new Date(agora.toMillis() - 24 * 60 * 60 * 1000);
      const vinteQuatroHorasAtrasTimestamp = Timestamp.fromDate(vinteQuatroHorasAtras);

      const sessoesRef = collection(db, 'user_sessions');
      const q = query(
        sessoesRef,
        where('userId', '==', userId),
        where('lastActivity', '<', vinteQuatroHorasAtrasTimestamp)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
      await Promise.all(deletePromises);
    } catch (error: any) {
      // Se for erro de permissão, não bloquear o login - apenas logar silenciosamente
      if (error.code === 'permission-denied') {
        console.warn('Permissões do Firestore não configuradas para sessões. Configure as regras de segurança.');
      } else if (error.code === 'failed-precondition') {
        // Erro de índice não criado - não é um problema crítico
        console.warn('Índice do Firestore não criado ainda. As sessões funcionarão normalmente.');
      } else {
        console.error('Erro ao limpar sessões expiradas:', error.code, error.message);
      }
    }
  };

  const signIn = async (email: string, senha: string) => {
    try {
      // Fazer login no Firebase Auth (isso NÃO depende de regras do Firestore)
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const userId = userCredential.user.uid;

      // Login foi bem-sucedido! Agora tentar gerenciar sessões (sem bloquear se falhar)
      // Executar em background, sem bloquear o login
      setTimeout(async () => {
        try {
          // Limpar sessões expiradas (sem bloquear se falhar)
          try {
            await limparSessoesExpiradas(userId);
          } catch (e: any) {
            if (e.code !== 'permission-denied') {
              console.error('Erro ao limpar sessões expiradas:', e);
            }
          }

          try {
            // Verificar quantas sessões ativas existem
            let sessoesAtivas: any[] = [];
            try {
              const sessoesRef = collection(db, 'user_sessions');
              const q = query(
                sessoesRef,
                where('userId', '==', userId),
                orderBy('lastActivity', 'desc')
              );
              const querySnapshot = await getDocs(q);
              sessoesAtivas = querySnapshot.docs;
            } catch (queryError: any) {
              // Se o índice não existir, tenta sem orderBy
              if (queryError.code === 'failed-precondition') {
                console.warn('⚠️ Índice composto não criado. Buscando sessões sem orderBy...');
                const sessoesRef = collection(db, 'user_sessions');
                const q = query(
                  sessoesRef,
                  where('userId', '==', userId)
                );
                const querySnapshot = await getDocs(q);
                sessoesAtivas = querySnapshot.docs;
              } else {
                throw queryError;
              }
            }

            // Se já existem 3 ou mais sessões, remover a mais antiga
            if (sessoesAtivas.length >= 3) {
              // Ordenar por lastActivity (mais antiga primeiro) no código
              // Como já ordenamos pela query, a última é a mais antiga
              const sessoesOrdenadas = [...sessoesAtivas].sort((a, b) => {
                const aTime = a.data().lastActivity?.toMillis() || 0;
                const bTime = b.data().lastActivity?.toMillis() || 0;
                return aTime - bTime;
              });

              // Remover a sessão mais antiga
              const sessaoMaisAntiga = sessoesOrdenadas[0];
              try {
                await deleteDoc(sessaoMaisAntiga.ref);
                toast.info('Uma sessão antiga foi removida. Limite: 3 dispositivos simultâneos.');
              } catch (e) {
                // Ignorar erro ao deletar
              }
            }

            // Criar nova sessão
            const sessionId = generateSessionId();
            const agora = Timestamp.now();
            
            // Criar documento com dados corretos
            const sessaoData = {
              userId: userId,
              sessionId: sessionId,
              createdAt: agora,
              lastActivity: agora,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            };
            
            console.log('Tentando criar sessão:', sessaoData);
            console.log('Usuário autenticado:', userId, 'Auth UID:', auth.currentUser?.uid);
            
            try {
              await setDoc(doc(db, 'user_sessions', sessionId), sessaoData);
              console.log('✅ Sessão criada com sucesso!');
            } catch (createError: any) {
              console.error('❌ Erro ao criar sessão:', createError.code, createError.message);
              throw createError;
            }

            // Armazenar sessionId no localStorage para validação posterior
            if (typeof window !== 'undefined') {
              localStorage.setItem('sessionId', sessionId);
              localStorage.setItem('userId', userId);
            }
          } catch (sessionError: any) {
            // Se houver erro de permissão, apenas logar - não bloquear login
            console.error('❌ Erro completo na sessão:', {
              code: sessionError.code,
              message: sessionError.message,
              stack: sessionError.stack
            });
            
            if (sessionError.code === 'permission-denied') {
              console.warn('⚠️ Erro de permissão ao criar sessão.');
              console.warn('Verifique se as regras do Firestore foram publicadas corretamente.');
              console.warn('Regra esperada: allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;');
            } else if (sessionError.code === 'failed-precondition') {
              // Erro de índice - tenta criar sem orderBy
              console.warn('⚠️ Índice composto não criado ainda. Criando sessão sem orderBy...');
              try {
                const sessionId = generateSessionId();
                const agora = Timestamp.now();
                const sessaoData = {
                  userId: userId,
                  sessionId: sessionId,
                  createdAt: agora,
                  lastActivity: agora,
                  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                };
                await setDoc(doc(db, 'user_sessions', sessionId), sessaoData);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('sessionId', sessionId);
                  localStorage.setItem('userId', userId);
                }
                console.log('✅ Sessão criada com sucesso (sem índice)!');
              } catch (retryError: any) {
                console.error('❌ Erro ao criar sessão (retry):', retryError.code, retryError.message);
              }
            } else {
              console.error('❌ Erro desconhecido ao gerenciar sessão:', sessionError.code, sessionError.message);
            }
          }
        } catch (error) {
          // Erro geral - apenas logar
          console.warn('Erro ao gerenciar sessões:', error);
        }
      }, 100); // Executar após 100ms para não bloquear o login

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login:', error);
      // Erros do Firebase Auth (não do Firestore)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Email ou senha incorretos!');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email inválido!');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Remover sessão do Firestore
      if (typeof window !== 'undefined') {
        const sessionId = localStorage.getItem('sessionId');
        const userId = localStorage.getItem('userId');
        
        if (sessionId && userId) {
          try {
            const sessaoRef = doc(db, 'user_sessions', sessionId);
            await deleteDoc(sessaoRef);
          } catch (error) {
            console.error('Erro ao remover sessão do Firestore:', error);
          }
          
          localStorage.removeItem('sessionId');
          localStorage.removeItem('userId');
        }
      }

      await firebaseSignOut(auth);
      setUserData(null);
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout.');
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

