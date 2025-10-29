'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Mail, Lock, Car, Wrench } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email, senha);
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 overflow-auto py-8 px-4">
      {/* Elementos decorativos de fundo - IDÊNTICOS à página de cadastro */}
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

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo e Título - Horizontal */}
          <div className="flex items-center justify-center gap-4 mb-3">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <div className="bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 p-3 rounded-2xl shadow-xl shadow-yellow-500/50 ring-4 ring-white/30">
                <Car className="text-blue-900" size={36} strokeWidth={3} />
                <Wrench 
                  className="absolute -bottom-1 -right-1 text-white bg-gradient-to-br from-blue-600 to-blue-800 rounded-full p-1.5 shadow-lg ring-2 ring-yellow-300" 
                  size={18} 
                  strokeWidth={3.5}
                />
              </div>
            </div>
            
            {/* Título Cintilante - Em uma linha só */}
            <h1 className="text-4xl font-black drop-shadow-2xl animate-shimmer-color whitespace-nowrap">
              GRUPÃO DAS AUTOPEÇAS
            </h1>
          </div>
          
          <p className="text-xl text-cyan-100 font-semibold">🔐 Entre na sua conta</p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-8 border-2 border-white/30 hover:bg-white/15 transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 drop-shadow-lg">
                ✉️ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-white/60" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all border-white/30"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-white drop-shadow-lg">
                  🔒 Senha
                </label>
                <Link 
                  href="/esqueci-senha" 
                  className="text-xs font-bold text-yellow-300 hover:text-yellow-200 underline transition-all"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-white/60" size={20} />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 rounded-xl backdrop-blur-md bg-white/20 text-white placeholder-white/60 font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:bg-white/30 transition-all border-white/30"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group/btn relative w-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 py-4 rounded-xl font-black text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
              {loading ? (
                <div className="relative animate-spin rounded-full h-6 w-6 border-b-3 border-blue-900"></div>
              ) : (
                <span className="relative flex items-center gap-2">
                  <LogIn size={24} strokeWidth={2.5} />
                  Entrar
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-sm font-bold text-white bg-white/10 backdrop-blur-sm rounded-full border-2 border-white/30 shadow-lg">
                  ou
                </span>
              </div>
            </div>
            <p className="text-white font-semibold text-lg drop-shadow-lg">
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="text-yellow-300 hover:text-yellow-200 font-black underline decoration-2 underline-offset-4 hover:underline-offset-2 transition-all">
                Cadastre-se aqui →
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-cyan-200 hover:text-white font-bold text-lg backdrop-blur-sm bg-white/10 px-6 py-3 rounded-xl border-2 border-white/30 inline-flex items-center gap-2 hover:bg-white/20 transition-all transform hover:scale-105 shadow-lg">
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}

