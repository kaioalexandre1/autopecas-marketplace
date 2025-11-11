'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, Timestamp, orderBy, onSnapshot } from 'firebase/firestore';
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

  // Função centralizada para GARANTIR que nunca há mais de 3 sessões
  const garantirLimiteSessoes = async (userId: string, sessionIdExcluir?: string): Promise<{ podeCriar: boolean; sessoesRestantes: number }> => {
    try {
      // Buscar todas as sessões do usuário
      const sessoesRef = collection(db, 'user_sessions');
      const q = query(sessoesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      let sessoesAtivas = querySnapshot.docs;
      
      console.log(`🔍 Verificando sessões para ${userId}: ${sessoesAtivas.length} encontradas`);
      
      // Se há sessão para excluir da contagem (sessão atual que será mantida)
      if (sessionIdExcluir) {
        sessoesAtivas = sessoesAtivas.filter(s => s.id !== sessionIdExcluir);
        console.log(`📌 Excluindo sessão atual da contagem: ${sessionIdExcluir}`);
      }
      
      // Se já tem 3 ou mais sessões (excluindo a atual), precisa remover
      if (sessoesAtivas.length >= 3) {
        console.log(`⚠️ LIMITE ATINGIDO! ${sessoesAtivas.length} sessões encontradas. Removendo as mais antigas...`);
        
        // Ordenar por lastActivity (mais antiga primeiro)
        const sessoesOrdenadas = [...sessoesAtivas].sort((a, b) => {
          const aTime = a.data().lastActivity?.toMillis() || 0;
          const bTime = b.data().lastActivity?.toMillis() || 0;
          return aTime - bTime;
        });
        
        // Calcular quantas remover (sempre deixar máximo 2 se vai criar nova, ou 3 se já tem sessão atual)
        const maxPermitido = sessionIdExcluir ? 3 : 2; // Se tem sessão atual, pode ter 3; se não, só 2
        const sessoesParaRemover = Math.max(0, sessoesAtivas.length - maxPermitido);
        
        if (sessoesParaRemover > 0) {
          console.log(`🗑️ Removendo ${sessoesParaRemover} sessão(ões) mais antiga(s)...`);
          
          // Remover as mais antigas
          const promisesRemocao = [];
          for (let i = 0; i < sessoesParaRemover; i++) {
            const sessaoParaRemover = sessoesOrdenadas[i];
            console.log(`   - Removendo: ${sessaoParaRemover.id}`);
            promisesRemocao.push(deleteDoc(sessaoParaRemover.ref));
          }
          
          await Promise.all(promisesRemocao);
          console.log(`✅ ${sessoesParaRemover} sessão(ões) removida(s)!`);
        }
        
        // Verificar novamente após remoção
        const querySnapshot2 = await getDocs(q);
        const sessoesAposRemocao = sessionIdExcluir 
          ? querySnapshot2.docs.filter(s => s.id !== sessionIdExcluir)
          : querySnapshot2.docs;
        
        // Se ainda tem 3 ou mais, NÃO pode criar nova sessão
        if (sessoesAposRemocao.length >= 3) {
          console.log(`❌ Ainda há ${sessoesAposRemocao.length} sessões. NÃO pode criar nova!`);
          return { podeCriar: false, sessoesRestantes: sessoesAposRemocao.length };
        }
      }
      
      // Verificar novamente para garantir
      const querySnapshotFinal = await getDocs(q);
      const sessoesFinais = sessionIdExcluir 
        ? querySnapshotFinal.docs.filter(s => s.id !== sessionIdExcluir)
        : querySnapshotFinal.docs;
      
      console.log(`✅ Sessões dentro do limite: ${sessoesFinais.length}/3`);
      return { podeCriar: sessoesFinais.length < 3, sessoesRestantes: sessoesFinais.length };
    } catch (error: any) {
      console.error('❌ Erro ao garantir limite de sessões:', error);
      // Em caso de erro, não permitir criar nova sessão por segurança
      return { podeCriar: false, sessoesRestantes: 999 };
    }
  };

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
          
          // Sempre verificar e criar/atualizar sessão
          const criarOuAtualizarSessao = async () => {
            try {
              // Verificar quantas sessões ativas existem para este usuário
              let sessoesAtivas: any[] = [];
              try {
                const sessoesRef = collection(db, 'user_sessions');
                const q = query(
                  sessoesRef,
                  where('userId', '==', user.uid)
                );
                const querySnapshot = await getDocs(q);
                sessoesAtivas = querySnapshot.docs;
                console.log(`📊 Total de sessões encontradas para ${user.uid}: ${sessoesAtivas.length}`);
              } catch (queryError: any) {
                console.error('Erro ao buscar sessões:', queryError);
                return;
              }

              // Verificar se já existe uma sessão válida para este dispositivo
              const sessaoAtual = sessionId ? sessoesAtivas.find(s => s.id === sessionId) : null;
              
              // Usar função centralizada para GARANTIR limite de 3 sessões
              const verificacao = await garantirLimiteSessoes(user.uid, sessionId || undefined);
              
              // Se não pode criar e já tem 3 sessões, fazer logout
              if (!verificacao.podeCriar && verificacao.sessoesRestantes >= 3) {
                console.log(`❌ LIMITE ATINGIDO! ${verificacao.sessoesRestantes} sessões ativas. Fazendo logout...`);
                toast.error('Você já está logado em 3 dispositivos. Limite máximo atingido.');
                await firebaseSignOut(auth);
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userId');
                return;
              }

              // Se já existe uma sessão válida, apenas atualizar
              if (sessaoAtual && sessaoAtual.exists()) {
                console.log('✅ Sessão já existe, atualizando lastActivity...');
                await updateDoc(sessaoAtual.ref, {
                  lastActivity: Timestamp.now(),
                });
                
                // Usar listener em tempo real para detectar remoção INSTANTÂNEA
                const sessaoRefAtual = doc(db, 'user_sessions', sessionId!);
                const unsubscribeSessao = onSnapshot(sessaoRefAtual, (docSnapshot) => {
                  if (!docSnapshot.exists()) {
                    console.log('⚠️ Sessão removida INSTANTANEAMENTE! Fazendo logout...');
                    unsubscribeSessao(); // Parar o listener
                    if (activityInterval) {
                      clearInterval(activityInterval);
                      activityInterval = null;
                    }
                    toast.error('Sua sessão foi encerrada. Limite de 3 dispositivos atingido.');
                    firebaseSignOut(auth);
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('userId');
                  }
                }, (error) => {
                  console.error('Erro no listener de sessão:', error);
                });
                
                // Também manter intervalo de atualização de lastActivity
                if (!activityInterval) {
                  activityInterval = setInterval(async () => {
                    try {
                      const sessaoRefAtual = doc(db, 'user_sessions', sessionId!);
                      const sessaoDocAtual = await getDoc(sessaoRefAtual);
                      
                      if (!sessaoDocAtual.exists()) {
                        if (activityInterval) {
                          clearInterval(activityInterval);
                          activityInterval = null;
                        }
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
                  }, 60 * 1000); // 1 minuto
                }
                return; // Não criar nova sessão se já existe
              }

              // Verificar novamente ANTES de criar nova sessão (garantia dupla)
              const verificacaoFinal = await garantirLimiteSessoes(user.uid, sessionId || undefined);
              
              if (!verificacaoFinal.podeCriar && verificacaoFinal.sessoesRestantes >= 3) {
                console.log(`❌ BLOQUEANDO CRIAÇÃO: Ainda há ${verificacaoFinal.sessoesRestantes} sessões!`);
                toast.error('Você já está logado em 3 dispositivos. Limite máximo atingido.');
                await firebaseSignOut(auth);
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userId');
                return;
              }
              
              // Criar nova sessão para este dispositivo (se não existe)
              const novoSessionId = generateSessionId();
              const agora = Timestamp.now();
              const sessaoData = {
                userId: user.uid,
                sessionId: novoSessionId,
                createdAt: agora,
                lastActivity: agora,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
              };
              
              console.log('📝 Criando nova sessão:', novoSessionId);
              await setDoc(doc(db, 'user_sessions', novoSessionId), sessaoData);
              localStorage.setItem('sessionId', novoSessionId);
              localStorage.setItem('userId', user.uid);
              console.log('✅ Nova sessão criada com sucesso!');
              
              // Usar listener em tempo real para detectar remoção INSTANTÂNEA
              const sessaoRefNova = doc(db, 'user_sessions', novoSessionId);
              const unsubscribeSessaoNova = onSnapshot(sessaoRefNova, (docSnapshot) => {
                if (!docSnapshot.exists()) {
                  console.log('⚠️ Sessão removida INSTANTANEAMENTE! Fazendo logout...');
                  unsubscribeSessaoNova(); // Parar o listener
                  if (activityInterval) {
                    clearInterval(activityInterval);
                    activityInterval = null;
                  }
                  toast.error('Sua sessão foi encerrada. Limite de 3 dispositivos atingido.');
                  firebaseSignOut(auth);
                  localStorage.removeItem('sessionId');
                  localStorage.removeItem('userId');
                }
              }, (error) => {
                console.error('Erro no listener de sessão:', error);
              });
              
              // Iniciar intervalo de atualização de lastActivity
              if (activityInterval) {
                clearInterval(activityInterval);
              }
              activityInterval = setInterval(async () => {
                try {
                  const sessaoRefAtual = doc(db, 'user_sessions', novoSessionId);
                  const sessaoDocAtual = await getDoc(sessaoRefAtual);
                  
                  if (!sessaoDocAtual.exists()) {
                    if (activityInterval) {
                      clearInterval(activityInterval);
                      activityInterval = null;
                    }
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
              }, 60 * 1000); // 1 minuto
            } catch (error: any) {
              console.error('❌ Erro ao criar/atualizar sessão:', error.code, error.message);
            }
          };

          // SEMPRE executar verificação e criação/atualização de sessão
          setTimeout(criarOuAtualizarSessao, 500);
        }

        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = { id: user.uid, ...userDoc.data() } as User;

          if (data.contaBloqueada) {
            toast.error('Sua conta está bloqueada. Entre em contato com o suporte.');

            // Remover sessão atual (se existir)
            try {
              if (typeof window !== 'undefined') {
                const sessionId = localStorage.getItem('sessionId');
                if (sessionId) {
                  await deleteDoc(doc(db, 'user_sessions', sessionId));
                  localStorage.removeItem('sessionId');
                  localStorage.removeItem('userId');
                }
              }
            } catch (erroSessao) {
              console.error('Erro ao remover sessão bloqueada:', erroSessao);
            }

            await firebaseSignOut(auth);
            setUserData(null);
            document.documentElement.classList.remove('dark');
            setLoading(false);
            return;
          }
          
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

      // VERIFICAR LIMITE DE SESSÕES ANTES DE PERMITIR LOGIN
      // Isso garante que nunca haverá mais de 3 sessões
      const verificacao = await garantirLimiteSessoes(userId);
      
      if (!verificacao.podeCriar && verificacao.sessoesRestantes >= 3) {
        // Já tem 3 sessões ativas, fazer logout imediatamente
        console.log(`❌ BLOQUEANDO LOGIN: Já existem ${verificacao.sessoesRestantes} sessões ativas!`);
        await firebaseSignOut(auth);
        toast.error(`Você já está logado em 3 dispositivos. Limite máximo atingido. Faça logout em um dispositivo antes de fazer login em outro.`);
        throw new Error('LIMITE_DE_SESSOES_ATINGIDO');
      }

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
            // Usar função centralizada para GARANTIR limite ANTES de criar sessão
            const verificacao = await garantirLimiteSessoes(userId);
            
            if (!verificacao.podeCriar && verificacao.sessoesRestantes >= 3) {
              // Já tem 3 sessões, fazer logout imediatamente
              console.log(`❌ BLOQUEANDO: Já existem ${verificacao.sessoesRestantes} sessões ativas!`);
              await firebaseSignOut(auth);
              toast.error('Você já está logado em 3 dispositivos. Limite máximo atingido.');
              return;
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
            
            console.log('📝 Criando sessão no signIn:', sessionId);
            
            try {
              await setDoc(doc(db, 'user_sessions', sessionId), sessaoData);
              console.log('✅ Sessão criada com sucesso no signIn!');
              
              // Armazenar sessionId no localStorage para validação posterior
              if (typeof window !== 'undefined') {
                localStorage.setItem('sessionId', sessionId);
                localStorage.setItem('userId', userId);
              }
            } catch (createError: any) {
              console.error('❌ Erro ao criar sessão:', createError.code, createError.message);
              throw createError;
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

