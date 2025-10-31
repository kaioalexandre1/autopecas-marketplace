'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
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

    return unsubscribe;
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

  const signIn = async (email: string, senha: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Email ou senha incorretos!');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
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

