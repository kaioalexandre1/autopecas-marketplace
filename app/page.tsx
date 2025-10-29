'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Wrench, Package, Truck, ArrowRight, Car } from 'lucide-react';

export default function Home() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 overflow-auto">
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Círculos grandes desfocados */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>
        
        {/* Raios de luz diagonais */}
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-20 animate-beam"></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30 animate-beam-delayed"></div>
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-20 animate-beam-slow"></div>
        
        {/* Raios horizontais */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-20 animate-scan"></div>
        <div className="absolute top-2/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 animate-scan-delayed"></div>
        
        {/* LEDs pulsantes */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full opacity-70 shadow-lg shadow-cyan-400"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-yellow-400 rounded-full opacity-70 shadow-lg shadow-yellow-400"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-blue-400 rounded-full opacity-70 shadow-lg shadow-blue-400"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-400 rounded-full opacity-70 shadow-lg shadow-green-400"></div>
        <div className="absolute top-60 left-1/3 w-2 h-2 bg-purple-400 rounded-full opacity-70 shadow-lg shadow-purple-400"></div>
        <div className="absolute bottom-60 right-1/4 w-2 h-2 bg-pink-400 rounded-full opacity-70 shadow-lg shadow-pink-400"></div>
        
        {/* Linhas de energia conectando */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ mixBlendMode: 'screen' }}>
          <line x1="10%" y1="20%" x2="90%" y2="30%" stroke="url(#grad1)" strokeWidth="1" className="animate-energy" />
          <line x1="20%" y1="70%" x2="80%" y2="40%" stroke="url(#grad2)" strokeWidth="1" className="animate-energy-delayed" />
          <line x1="30%" y1="50%" x2="70%" y2="80%" stroke="url(#grad3)" strokeWidth="1" className="animate-energy" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'rgb(96, 165, 250)', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(96, 165, 250)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(96, 165, 250)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'rgb(250, 204, 21)', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(250, 204, 21)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(250, 204, 21)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Grade de linhas sutis */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
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
        
        {/* Pontos de circuito */}
        <div className="absolute top-1/3 left-1/6 w-32 h-32 opacity-20">
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full top-0 left-0"></div>
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full top-0 right-0"></div>
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full bottom-0 left-0"></div>
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full bottom-0 right-0"></div>
          <div className="absolute w-full h-0.5 bg-cyan-400 top-0"></div>
          <div className="absolute w-full h-0.5 bg-cyan-400 bottom-0"></div>
          <div className="absolute w-0.5 h-full bg-cyan-400 left-0"></div>
          <div className="absolute w-0.5 h-full bg-cyan-400 right-0"></div>
        </div>

        {/* Partículas flutuantes adicionais */}
        <div className="absolute top-10 left-1/4 w-3 h-3 bg-yellow-400 rounded-full opacity-40 animate-particle-float"></div>
        <div className="absolute top-1/4 right-10 w-2 h-2 bg-cyan-300 rounded-full opacity-50 animate-particle-float-delayed"></div>
        <div className="absolute bottom-1/3 left-10 w-3 h-3 bg-blue-300 rounded-full opacity-40 animate-particle-rise"></div>
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-green-300 rounded-full opacity-50 animate-particle-float"></div>
        <div className="absolute bottom-10 left-1/3 w-3 h-3 bg-purple-300 rounded-full opacity-40 animate-particle-rise-delayed"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-pink-300 rounded-full opacity-50 animate-particle-float-delayed"></div>

        {/* Raios diagonais extras */}
        <div className="absolute top-0 left-1/6 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-15 animate-diagonal-beam rotate-12"></div>
        <div className="absolute top-0 right-1/6 w-0.5 h-full bg-gradient-to-b from-transparent via-green-400 to-transparent opacity-15 animate-diagonal-beam-delayed -rotate-12"></div>

        {/* Ondas de energia horizontais */}
        <div className="absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-10 animate-wave"></div>
        <div className="absolute bottom-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-10 animate-wave-delayed"></div>

        {/* Anéis pulsantes */}
        <div className="absolute top-1/4 left-1/3 w-40 h-40 border-2 border-cyan-400 rounded-full opacity-20 animate-ring-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 border-2 border-yellow-400 rounded-full opacity-20 animate-ring-pulse-delayed"></div>

        {/* Estrelas tecnológicas */}
        <div className="absolute top-16 right-16 w-1 h-1 bg-white rounded-full opacity-70 animate-twinkle shadow-sm shadow-white"></div>
        <div className="absolute top-32 right-48 w-1 h-1 bg-cyan-300 rounded-full opacity-70 animate-twinkle-delayed shadow-sm shadow-cyan-300"></div>
        <div className="absolute bottom-16 left-16 w-1 h-1 bg-yellow-300 rounded-full opacity-70 animate-twinkle shadow-sm shadow-yellow-300"></div>
        <div className="absolute bottom-48 right-32 w-1 h-1 bg-blue-300 rounded-full opacity-70 animate-twinkle-delayed shadow-sm shadow-blue-300"></div>
        <div className="absolute top-48 left-32 w-1 h-1 bg-green-300 rounded-full opacity-70 animate-twinkle shadow-sm shadow-green-300"></div>

        {/* Hexágonos tecnológicos */}
        <div className="absolute top-1/5 right-1/5 w-16 h-16 opacity-15 animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" />
          </svg>
        </div>
        <div className="absolute bottom-1/5 left-1/5 w-20 h-20 opacity-15 animate-spin-slow-reverse">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
          </svg>
        </div>

        {/* Linhas de código simuladas */}
        <div className="absolute top-1/2 left-5 opacity-10">
          <div className="w-24 h-1 bg-cyan-400 mb-2 animate-code-line"></div>
          <div className="w-16 h-1 bg-cyan-400 mb-2 animate-code-line-delayed"></div>
          <div className="w-20 h-1 bg-cyan-400 animate-code-line"></div>
        </div>
        <div className="absolute bottom-1/4 right-5 opacity-10">
          <div className="w-20 h-1 bg-blue-400 mb-2 animate-code-line-delayed"></div>
          <div className="w-28 h-1 bg-blue-400 mb-2 animate-code-line"></div>
          <div className="w-16 h-1 bg-blue-400 animate-code-line-delayed"></div>
        </div>

        {/* Círculos de radar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-96 h-96 border border-cyan-400 rounded-full opacity-10 animate-radar"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-cyan-400 rounded-full opacity-10 animate-radar-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-cyan-400 rounded-full opacity-10 animate-radar"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-16 backdrop-blur-xl bg-gradient-to-r from-white/15 via-white/10 to-white/15 rounded-3xl p-8 border-2 border-white/30 shadow-2xl hover:shadow-yellow-400/20 transition-all group">
          <div className="flex items-center space-x-5 items-center">
            {/* Logo com Animação */}
            <div className="relative">
              {/* Círculo de fundo brilhante */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-all animate-pulse"></div>
              
              {/* Container da logo */}
              <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 p-4 rounded-2xl shadow-xl shadow-yellow-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all ring-4 ring-white/30">
                <Car className="text-blue-900" size={48} strokeWidth={3} />
                <Wrench 
                  className="absolute -bottom-2 -right-2 text-white bg-gradient-to-br from-blue-600 to-blue-800 rounded-full p-2 shadow-lg transform group-hover:rotate-12 transition-all ring-2 ring-yellow-300" 
                  size={24} 
                  strokeWidth={3.5}
                />
              </div>
            </div>

            {/* Nome do Site */}
            <div className="relative flex flex-col justify-center self-center mt-2">
              {/* Efeito de brilho atrás do texto */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent blur-xl"></div>
              
              <div className="relative">
                <h1 className="text-6xl font-black bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-2xl tracking-wide leading-none whitespace-nowrap">
                  GRUPÃO DAS AUTOPEÇAS
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-400/50"></div>
                  <div className="text-xs text-cyan-200 font-semibold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/10 rounded-full border border-cyan-400/20 backdrop-blur-sm">
                    📍 Maringá-PR
                  </div>
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-cyan-400/50"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <Link 
                href="/dashboard"
                className="group/btn relative px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 rounded-xl font-black text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative flex items-center gap-2">
                  Ir para o Dashboard
                  <span className="text-2xl">→</span>
                </span>
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="px-6 py-3 text-white hover:text-yellow-300 font-bold border-2 border-white/40 rounded-xl hover:border-yellow-300 hover:bg-white/10 transition-all backdrop-blur-sm transform hover:scale-105"
                >
                  Entrar
                </Link>
                <Link 
                  href="/cadastro"
                  className="group/btn relative px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 rounded-xl font-black text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative">Cadastrar Grátis</span>
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-block mb-6 px-6 py-3 bg-yellow-400/20 backdrop-blur-sm rounded-full border border-yellow-400/30">
            <span className="text-yellow-200 font-bold text-base">✨ Plataforma #1 em Maringá-PR</span>
          </div>
          <h2 className="text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
            Marketplace de Autopeças<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-cyan-200 to-blue-200">
              em Tempo Real
            </span>
          </h2>
          <p className="text-2xl text-white mb-10 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-lg">
            Conectando oficinas, lojas de autopeças e entregadores em Maringá-PR. 
            Encontre peças rápido, compare preços e feche negócios em minutos!
          </p>
          <Link 
            href="/cadastro"
            className="inline-flex items-center px-8 py-4 bg-yellow-400 text-blue-900 rounded-xl hover:bg-yellow-300 font-black text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105"
          >
            Começar Agora
            <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-blue-400/30">
              <Wrench className="text-yellow-300" size={32} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Oficinas</h3>
            <p className="text-white text-base mb-4 font-medium">
              Publique pedidos de peças e receba ofertas em tempo real de várias autopeças. 
              Compare preços e escolha a melhor oferta!
            </p>
            <ul className="text-base text-cyan-100 space-y-2 font-medium">
              <li>✓ Pedidos ao vivo</li>
              <li>✓ Múltiplas ofertas</li>
              <li>✓ Chat direto com vendedores</li>
              <li>✓ Histórico de compras</li>
            </ul>
          </div>

          <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-green-400/30">
              <Package className="text-green-300" size={32} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Autopeças</h3>
            <p className="text-white text-base mb-4 font-medium">
              Veja pedidos de oficinas em tempo real e faça ofertas competitivas. 
              Ganhe mais clientes e aumente suas vendas!
            </p>
            <ul className="text-base text-cyan-100 space-y-2 font-medium">
              <li>✓ Notificações instantâneas</li>
              <li>✓ Sistema de leilão reverso</li>
              <li>✓ Chat com fotos</li>
              <li>✓ Integração com entregadores</li>
            </ul>
          </div>

          <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-yellow-400/30">
              <Truck className="text-yellow-300" size={32} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Entregadores</h3>
            <p className="text-white text-base mb-4 font-medium">
              Cadastre-se e receba solicitações de entrega direto no seu WhatsApp. 
              Mais trabalho, mais renda!
            </p>
            <ul className="text-base text-cyan-100 space-y-2 font-medium">
              <li>✓ Cadastro simples</li>
              <li>✓ Integração WhatsApp</li>
              <li>✓ Defina seus valores</li>
              <li>✓ Visibilidade local</li>
            </ul>
          </div>
        </div>

        {/* How it Works */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-12 mb-20 border border-white/20 hover:bg-white/15 transition-all">
          <h3 className="text-4xl font-black text-center mb-16 text-white drop-shadow-lg">
            Como Funciona
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-cyan-500/50 ring-4 ring-white/20">
                1
              </div>
              <h4 className="font-black mb-3 text-white text-xl">Cadastre-se</h4>
              <p className="text-base text-cyan-100 font-medium leading-relaxed">
                Escolha seu tipo de conta: Oficina, Autopeça ou Entregador
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-green-500/50 ring-4 ring-white/20">
                2
              </div>
              <h4 className="font-black mb-3 text-white text-xl">Publique ou Oferte</h4>
              <p className="text-base text-cyan-100 font-medium leading-relaxed">
                Oficinas publicam pedidos, Autopeças fazem ofertas
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-yellow-500/50 ring-4 ring-white/20">
                3
              </div>
              <h4 className="font-black mb-3 text-white text-xl">Negocie</h4>
              <p className="text-base text-cyan-100 font-medium leading-relaxed">
                Use o chat para negociar detalhes e enviar fotos
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-purple-500/50 ring-4 ring-white/20">
                4
              </div>
              <h4 className="font-black mb-3 text-white text-xl">Feche o Negócio</h4>
              <p className="text-base text-cyan-100 font-medium leading-relaxed">
                Confirme a venda e solicite um entregador
              </p>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="text-center">
          <h3 className="text-5xl font-black text-white mb-6 drop-shadow-2xl">
            Pronto para começar?
          </h3>
          <p className="text-2xl text-white mb-10 font-medium drop-shadow-lg">
            Junte-se ao maior marketplace de autopeças de Maringá!
          </p>
          <Link 
            href="/cadastro"
            className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Criar Conta Grátis
            <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-white/20 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-4 text-center text-white">
          <p className="font-semibold text-lg">&copy; 2025 Grupão das autopeças - Marketplace em Tempo Real</p>
          <p className="text-base mt-2 text-cyan-100">Maringá-PR • Conectando o mercado automotivo local</p>
        </div>
      </footer>
    </div>
  );
}

