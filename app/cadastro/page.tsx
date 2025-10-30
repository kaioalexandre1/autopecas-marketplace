'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types';
import { validarCPF, validarCNPJ, formatarCPF, formatarCNPJ, formatarTelefone } from '@/lib/utils';
import { UserPlus, Wrench, Package, Truck, MapPin, Car } from 'lucide-react';

export default function CadastroPage() {
  const [tipo, setTipo] = useState<UserType>('oficina');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('Maringá-PR');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const { signUp } = useAuth();
  const router = useRouter();

  const cidadesDisponiveis = [
    'Maringá-PR',
    'Londrina-PR',
    'Curitiba-PR',
    'Cascavel-PR',
    'Ponta Grossa-PR'
  ];

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!nome) novosErros.nome = 'Nome é obrigatório';
    
    if (!documento) {
      novosErros.documento = 'CPF/CNPJ é obrigatório';
    } else {
      const docLimpo = documento.replace(/[^\d]/g, '');
      if (tipo === 'oficina' || tipo === 'autopeca') {
        if (docLimpo.length === 14) {
          if (!validarCNPJ(docLimpo)) {
            novosErros.documento = 'CNPJ inválido';
          }
        } else if (docLimpo.length === 11) {
          if (!validarCPF(docLimpo)) {
            novosErros.documento = 'CPF inválido';
          }
        } else {
          novosErros.documento = 'CPF/CNPJ inválido';
        }
      } else if (tipo === 'entregador') {
        if (!validarCPF(docLimpo)) {
          novosErros.documento = 'CPF inválido';
        }
      }
    }

    if (!telefone) novosErros.telefone = 'Telefone é obrigatório';
    if (!endereco) novosErros.endereco = 'Endereço é obrigatório';
    if (!cidade) novosErros.cidade = 'Cidade é obrigatória';
    if (!email) novosErros.email = 'Email é obrigatório';
    
    if (!senha) {
      novosErros.senha = 'Senha é obrigatória';
    } else if (senha.length < 6) {
      novosErros.senha = 'Senha deve ter no mínimo 6 caracteres';
    }
    
    if (senha !== confirmarSenha) {
      novosErros.confirmarSenha = 'Senhas não coincidem';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      await signUp(email, senha, {
        tipo,
        documento: documento.replace(/[^\d]/g, ''),
        nome,
        telefone: telefone.replace(/[^\d]/g, ''),
        endereco,
        cidade,
      });
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro no cadastro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentoChange = (value: string) => {
    const docLimpo = value.replace(/[^\d]/g, '');
    if (docLimpo.length <= 11) {
      setDocumento(formatarCPF(docLimpo));
    } else if (docLimpo.length <= 14) {
      setDocumento(formatarCNPJ(docLimpo));
    }
  };

  const handleTelefoneChange = (value: string) => {
    const telLimpo = value.replace(/[^\d]/g, '');
    if (telLimpo.length <= 11) {
      setTelefone(formatarTelefone(telLimpo));
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 overflow-auto py-4 sm:py-8 px-3 sm:px-4">
      {/* Elementos decorativos de fundo - IDÊNTICOS à página inicial */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Círculos grandes desfocados */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>
        
        {/* Raios de luz diagonais */}
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-20 animate-beam"></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30 animate-beam-delayed"></div>
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-20 animate-beam-slow"></div>
        
        {/* LEDs pulsantes */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-cyan-400"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-yellow-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-yellow-400"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-blue-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-blue-400"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-green-400"></div>
        
        {/* Emojis de autopeças e carros flutuantes - ESTILO BOLHAS! */}
        <div className="absolute top-10 left-10 text-6xl opacity-40 animate-bounce1 drop-shadow-2xl">🚗</div>
        <div className="absolute top-20 left-1/4 text-5xl opacity-35 animate-bounce2 drop-shadow-2xl">🔧</div>
        <div className="absolute top-16 left-1/2 text-6xl opacity-45 animate-bounce3 drop-shadow-2xl">🛞</div>
        <div className="absolute top-12 right-1/4 text-5xl opacity-40 animate-bounce4 drop-shadow-2xl">⚙️</div>
        <div className="absolute top-24 right-10 text-7xl opacity-35 animate-bounce5 drop-shadow-2xl">🏎️</div>
        <div className="absolute top-40 left-16 text-5xl opacity-50 animate-bounce6 drop-shadow-2xl">🔩</div>
        <div className="absolute top-48 left-1/3 text-6xl opacity-40 animate-bounce7 drop-shadow-2xl">🚙</div>
        <div className="absolute top-44 right-1/3 text-5xl opacity-45 animate-bounce8 drop-shadow-2xl">🔋</div>
        <div className="absolute top-52 right-20 text-6xl opacity-38 animate-bounce9 drop-shadow-2xl">⚡</div>
        <div className="absolute top-1/2 left-8 text-7xl opacity-30 animate-bounce10 drop-shadow-2xl">🛠️</div>
        <div className="absolute top-1/2 left-1/4 text-5xl opacity-42 animate-bounce11 drop-shadow-2xl">🏁</div>
        <div className="absolute top-1/2 left-1/2 text-6xl opacity-35 animate-bounce12 drop-shadow-2xl">🚘</div>
        <div className="absolute top-1/2 right-1/4 text-5xl opacity-48 animate-bounce13 drop-shadow-2xl">🔑</div>
        <div className="absolute top-1/2 right-12 text-6xl opacity-40 animate-bounce14 drop-shadow-2xl">🛡️</div>
        <div className="absolute bottom-48 left-20 text-5xl opacity-45 animate-bounce15 drop-shadow-2xl">🚕</div>
        <div className="absolute bottom-52 left-1/3 text-6xl opacity-38 animate-bounce16 drop-shadow-2xl">⛽</div>
        <div className="absolute bottom-44 right-1/3 text-5xl opacity-42 animate-bounce17 drop-shadow-2xl">🧰</div>
        <div className="absolute bottom-40 right-16 text-6xl opacity-36 animate-bounce18 drop-shadow-2xl">💡</div>
        <div className="absolute bottom-24 left-12 text-6xl opacity-40 animate-bounce19 drop-shadow-2xl">🚓</div>
        <div className="absolute bottom-20 left-1/4 text-5xl opacity-44 animate-bounce20 drop-shadow-2xl">🔌</div>
        <div className="absolute bottom-16 left-1/2 text-7xl opacity-32 animate-bounce21 drop-shadow-2xl">🚗</div>
        <div className="absolute bottom-20 right-1/4 text-5xl opacity-46 animate-bounce22 drop-shadow-2xl">🪛</div>
        <div className="absolute bottom-12 right-10 text-6xl opacity-40 animate-bounce23 drop-shadow-2xl">🚙</div>
        <div className="absolute top-1/3 left-1/6 text-5xl opacity-35 animate-bounce24 drop-shadow-2xl">🏆</div>
        <div className="absolute top-2/3 left-1/5 text-6xl opacity-38 animate-bounce25 drop-shadow-2xl">🔩</div>
        <div className="absolute top-1/4 right-1/6 text-5xl opacity-43 animate-bounce26 drop-shadow-2xl">⚙️</div>
        <div className="absolute bottom-1/3 right-1/5 text-6xl opacity-37 animate-bounce27 drop-shadow-2xl">🛞</div>
        <div className="absolute bottom-2/3 left-1/3 text-5xl opacity-41 animate-bounce28 drop-shadow-2xl">🔧</div>
        <div className="absolute top-1/3 right-1/3 text-6xl opacity-34 animate-bounce29 drop-shadow-2xl">⚡</div>
        <div className="absolute top-60 left-1/5 text-5xl opacity-37 animate-bounce30 drop-shadow-2xl">🚘</div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Logo e Título - Horizontal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-3">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <div className="bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl shadow-yellow-500/50 ring-4 ring-white/30">
                <Car className="text-blue-900" size={30} strokeWidth={3} />
                <Wrench 
                  className="absolute -bottom-1 -right-1 text-white bg-gradient-to-br from-blue-600 to-blue-800 rounded-full p-1.5 shadow-lg ring-2 ring-yellow-300" 
                  size={16} 
                  strokeWidth={3.5}
                />
              </div>
            </div>
            
            {/* Título Cintilante - Em uma linha só */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black drop-shadow-2xl animate-shimmer-color text-center sm:whitespace-nowrap leading-tight">
              GRUPÃO DAS AUTOPEÇAS
            </h1>
          </div>
          
          <p className="text-lg sm:text-xl text-cyan-100 font-semibold">✨ Crie sua conta gratuitamente</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 border-2 border-white/30 hover:bg-white/15 transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Usuário */}
            <div>
              <label className="block text-base font-bold text-white mb-4 drop-shadow-lg">
                💼 Tipo de Conta
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setTipo('oficina')}
                  className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center transition-all backdrop-blur-md transform hover:scale-105 ${
                    tipo === 'oficina'
                      ? 'border-cyan-400 bg-cyan-500/30 shadow-lg shadow-cyan-500/50'
                      : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20'
                  }`}
                >
                  <Wrench className={tipo === 'oficina' ? 'text-cyan-300' : 'text-white/60'} size={28} strokeWidth={2.5} />
                  <span className={`mt-2 font-bold text-sm ${tipo === 'oficina' ? 'text-white' : 'text-white/70'}`}>Oficina</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('autopeca')}
                  className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center transition-all backdrop-blur-md transform hover:scale-105 ${
                    tipo === 'autopeca'
                      ? 'border-green-400 bg-green-500/30 shadow-lg shadow-green-500/50'
                      : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20'
                  }`}
                >
                  <Package className={tipo === 'autopeca' ? 'text-green-300' : 'text-white/60'} size={28} strokeWidth={2.5} />
                  <span className={`mt-2 font-bold text-sm ${tipo === 'autopeca' ? 'text-white' : 'text-white/70'}`}>Autopeça</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('entregador')}
                  className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center transition-all backdrop-blur-md transform hover:scale-105 ${
                    tipo === 'entregador'
                      ? 'border-yellow-400 bg-yellow-500/30 shadow-lg shadow-yellow-500/50'
                      : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20'
                  }`}
                >
                  <Truck className={tipo === 'entregador' ? 'text-yellow-300' : 'text-white/60'} size={28} strokeWidth={2.5} />
                  <span className={`mt-2 font-bold text-sm ${tipo === 'entregador' ? 'text-white' : 'text-white/70'}`}>Entregador</span>
                </button>
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                {tipo === 'oficina' || tipo === 'autopeca' ? '🏢 Nome da Empresa' : '👤 Nome Completo'}
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.nome ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder={tipo === 'entregador' ? 'João da Silva' : 'Minha Empresa'}
              />
              {erros.nome && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.nome}</p>}
            </div>

            {/* Documento */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                📋 {tipo === 'entregador' ? 'CPF' : 'CPF/CNPJ'}
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => handleDocumentoChange(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.documento ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder={tipo === 'entregador' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
              {erros.documento && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.documento}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                📱 Telefone/WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.telefone ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder="(44) 99999-9999"
              />
              {erros.telefone && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.telefone}</p>}
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                📍 Endereço
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.endereco ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder="Rua, número, bairro"
              />
              {erros.endereco && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.endereco}</p>}
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                <MapPin className="inline mr-2" size={18} />
                🌆 Cidade
              </label>
              <select
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.cidade ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
              >
                {cidadesDisponiveis.map((c) => (
                  <option key={c} value={c} className="bg-blue-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
              {erros.cidade && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.cidade}</p>}
              <p className="mt-2 text-xs text-cyan-200 font-medium bg-cyan-500/20 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-cyan-400/30">
                ℹ️ Você poderá ver e fazer pedidos em todas as cidades pelo painel
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                ✉️ Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.email ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder="seu@email.com"
              />
              {erros.email && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.email}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                🔒 Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.senha ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder="Mínimo 6 caracteres"
              />
              {erros.senha && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.senha}</p>}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                🔐 Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all ${
                  erros.confirmarSenha ? 'border-red-400 bg-red-500/20' : 'border-white/30'
                }`}
                placeholder="Digite a senha novamente"
              />
              {erros.confirmarSenha && <p className="mt-1 text-sm text-red-300 font-semibold drop-shadow-lg">⚠️ {erros.confirmarSenha}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group/btn relative w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 py-3.5 sm:py-4 rounded-xl font-black text-base sm:text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
              {loading ? (
                <div className="relative animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-3 border-blue-900"></div>
              ) : (
                <span className="relative flex items-center gap-2">
                  <UserPlus size={22} strokeWidth={2.5} />
                  Criar Conta Grátis
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 sm:mt-8 text-center">
            <div className="relative mb-3 sm:mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 sm:px-4 text-xs sm:text-sm font-bold text-white bg-white/10 backdrop-blur-sm rounded-full border-2 border-white/30 shadow-lg">
                  ou
                </span>
              </div>
            </div>
            <p className="text-white font-semibold text-base sm:text-lg drop-shadow-lg">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-yellow-300 hover:text-yellow-200 font-black underline decoration-2 underline-offset-4 hover:underline-offset-2 transition-all">
                Faça login aqui →
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-4 sm:mt-6 text-center">
          <Link href="/" className="text-cyan-200 hover:text-white font-bold text-sm sm:text-base md:text-lg backdrop-blur-sm bg-white/10 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border-2 border-white/30 inline-flex items-center gap-2 hover:bg-white/20 transition-all transform hover:scale-105 shadow-lg">
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}

