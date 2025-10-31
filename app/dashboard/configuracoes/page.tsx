'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Moon, Sun, Save, ArrowLeft, Store, User, Phone, MapPin, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function ConfiguracoesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [temaDark, setTemaDark] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carregar configurações do usuário
  useEffect(() => {
    if (userData) {
      const carregarConfiguracoes = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userData.id));
          const data = userDoc.data();
          setTemaDark(data?.temaDark || false);
          
          // Aplicar tema imediatamente se já estiver salvo
          if (data?.temaDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Erro ao carregar configurações:', error);
        }
      };
      carregarConfiguracoes();
    }
  }, [userData]);

  // Aplicar tema quando mudar
  useEffect(() => {
    if (temaDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [temaDark]);

  const salvarConfiguracoes = async () => {
    if (!userData) return;

    setSalvando(true);
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        temaDark,
        configuracoesAtualizadasEm: new Date(),
      });

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  const getTipoLabel = () => {
    switch (userData?.tipo) {
      case 'oficina':
        return 'Oficina';
      case 'autopeca':
        return 'Autopeça';
      case 'entregador':
        return 'Entregador';
      default:
        return '';
    }
  };

  const getTipoBadgeColor = () => {
    switch (userData?.tipo) {
      case 'oficina':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';
      case 'autopeca':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
      case 'entregador':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 dark:bg-blue-700 p-4 rounded-2xl shadow-lg">
              <Settings size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                Configurações
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Personalize sua experiência na plataforma
              </p>
            </div>
          </div>
        </div>

        {/* Informações da Loja e Cadastro */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-xl">
              <Store size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Informações da Loja
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Nome</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userData?.nome || 'Não informado'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Store size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Nome da Loja</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userData?.nomeLoja || userData?.nome || 'Não informado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Documento (CPF/CNPJ)</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userData?.documento || 'Não informado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Telefone</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userData?.telefone || 'Não informado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Cidade</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userData?.cidade ? userData.cidade.split('-')[0] : 'Não informado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-gray-500 dark:text-gray-400">🏷️</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Tipo</div>
                    <div className={`text-xs px-3 py-1 rounded-full inline-block font-semibold border ${getTipoBadgeColor()}`}>
                      {getTipoLabel()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="space-y-6">
          {/* Tema Dark */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-xl">
                  {temaDark ? (
                    <Moon size={24} className="text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Sun size={24} className="text-yellow-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Tema Dark
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Ative o tema escuro para uma experiência visual mais confortável
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={temaDark}
                  onChange={(e) => setTemaDark(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              onClick={salvarConfiguracoes}
              disabled={salvando}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

