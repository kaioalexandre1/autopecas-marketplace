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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 relative">
      {/* Elementos decorativos de fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
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
        
        {/* Emojis de autopeças e carros flutuantes - ESTILO BOLHAS! - Distribuídos por toda a altura */}
        {/* Topo (0-10%) */}
        <div className="absolute top-[5%] left-[5%] text-6xl opacity-40 animate-bounce1 drop-shadow-2xl">🚗</div>
        <div className="absolute top-[3%] left-[25%] text-5xl opacity-35 animate-bounce2 drop-shadow-2xl">🔧</div>
        <div className="absolute top-[8%] left-[50%] text-6xl opacity-45 animate-bounce3 drop-shadow-2xl">🛞</div>
        <div className="absolute top-[2%] right-[25%] text-5xl opacity-40 animate-bounce4 drop-shadow-2xl">⚙️</div>
        <div className="absolute top-[6%] right-[5%] text-7xl opacity-35 animate-bounce5 drop-shadow-2xl">🏎️</div>
        
        {/* Parte superior (10-25%) */}
        <div className="absolute top-[12%] left-[10%] text-5xl opacity-50 animate-bounce6 drop-shadow-2xl">🔩</div>
        <div className="absolute top-[15%] left-[35%] text-6xl opacity-40 animate-bounce7 drop-shadow-2xl">🚙</div>
        <div className="absolute top-[18%] right-[30%] text-5xl opacity-45 animate-bounce8 drop-shadow-2xl">🔋</div>
        <div className="absolute top-[20%] right-[10%] text-6xl opacity-38 animate-bounce9 drop-shadow-2xl">⚡</div>
        <div className="absolute top-[22%] left-[60%] text-5xl opacity-42 animate-bounce10 drop-shadow-2xl">🏁</div>
        
        {/* Meio superior (25-40%) */}
        <div className="absolute top-[28%] left-[8%] text-7xl opacity-30 animate-bounce11 drop-shadow-2xl">🛠️</div>
        <div className="absolute top-[30%] left-[25%] text-5xl opacity-42 animate-bounce12 drop-shadow-2xl">🏆</div>
        <div className="absolute top-[32%] left-[50%] text-6xl opacity-35 animate-bounce13 drop-shadow-2xl">🚘</div>
        <div className="absolute top-[35%] right-[25%] text-5xl opacity-48 animate-bounce14 drop-shadow-2xl">🔑</div>
        <div className="absolute top-[38%] right-[8%] text-6xl opacity-40 animate-bounce15 drop-shadow-2xl">🛡️</div>
        
        {/* Centro (40-55%) */}
        <div className="absolute top-[42%] left-[15%] text-5xl opacity-45 animate-bounce16 drop-shadow-2xl">🚕</div>
        <div className="absolute top-[45%] left-[40%] text-6xl opacity-38 animate-bounce17 drop-shadow-2xl">⛽</div>
        <div className="absolute top-[48%] right-[35%] text-5xl opacity-42 animate-bounce18 drop-shadow-2xl">🧰</div>
        <div className="absolute top-[50%] right-[12%] text-6xl opacity-36 animate-bounce19 drop-shadow-2xl">💡</div>
        <div className="absolute top-[52%] left-[65%] text-5xl opacity-40 animate-bounce20 drop-shadow-2xl">🚓</div>
        
        {/* Meio inferior (55-70%) */}
        <div className="absolute top-[58%] left-[10%] text-5xl opacity-44 animate-bounce21 drop-shadow-2xl">🔌</div>
        <div className="absolute top-[60%] left-[30%] text-7xl opacity-32 animate-bounce22 drop-shadow-2xl">🚗</div>
        <div className="absolute top-[62%] right-[28%] text-5xl opacity-46 animate-bounce23 drop-shadow-2xl">🪛</div>
        <div className="absolute top-[65%] right-[8%] text-6xl opacity-40 animate-bounce24 drop-shadow-2xl">🚙</div>
        <div className="absolute top-[68%] left-[55%] text-5xl opacity-38 animate-bounce25 drop-shadow-2xl">🔩</div>
        
        {/* Parte inferior (70-85%) */}
        <div className="absolute top-[72%] left-[20%] text-6xl opacity-37 animate-bounce26 drop-shadow-2xl">🛞</div>
        <div className="absolute top-[75%] left-[45%] text-5xl opacity-41 animate-bounce27 drop-shadow-2xl">🔧</div>
        <div className="absolute top-[78%] right-[32%] text-6xl opacity-34 animate-bounce28 drop-shadow-2xl">⚡</div>
        <div className="absolute top-[80%] right-[12%] text-5xl opacity-37 animate-bounce29 drop-shadow-2xl">🚘</div>
        <div className="absolute top-[82%] left-[70%] text-6xl opacity-35 animate-bounce30 drop-shadow-2xl">🚗</div>
        
        {/* Final (85-100%) */}
        <div className="absolute top-[88%] left-[8%] text-5xl opacity-40 animate-bounce1 drop-shadow-2xl">🔧</div>
        <div className="absolute top-[90%] left-[35%] text-6xl opacity-38 animate-bounce2 drop-shadow-2xl">🛞</div>
        <div className="absolute top-[92%] right-[30%] text-5xl opacity-42 animate-bounce3 drop-shadow-2xl">⚙️</div>
        <div className="absolute top-[95%] right-[10%] text-7xl opacity-35 animate-bounce4 drop-shadow-2xl">🏎️</div>
        <div className="absolute top-[97%] left-[60%] text-5xl opacity-36 animate-bounce5 drop-shadow-2xl">🔋</div>
        
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

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6 lg:gap-4 mb-8 sm:mb-16 backdrop-blur-xl bg-gradient-to-r from-white/15 via-white/10 to-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border-2 border-white/30 shadow-2xl hover:shadow-yellow-400/20 transition-all group">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full lg:w-auto">
            {/* Logo com Animação */}
            <div className="relative flex-shrink-0">
              {/* Círculo de fundo brilhante */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-all"></div>
              
              {/* Container da logo */}
              <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl shadow-yellow-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all ring-4 ring-white/30">
                <Car className="text-blue-900" size={36} strokeWidth={3} />
                <Wrench 
                  className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 text-white bg-gradient-to-br from-blue-600 to-blue-800 rounded-full p-1.5 sm:p-2 shadow-lg transform group-hover:rotate-12 transition-all ring-2 ring-yellow-300" 
                  size={18} 
                  strokeWidth={3.5}
                />
              </div>
            </div>

            {/* Nome do Site */}
            <div className="relative flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
              {/* Efeito de brilho atrás do texto */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent blur-xl"></div>
              
              <div className="relative">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-2xl tracking-wide leading-tight">
                  GRUPÃO DAS AUTOPEÇAS
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 sm:mt-2">
                  <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-cyan-400/50"></div>
                  <div className="text-[10px] sm:text-xs text-cyan-200 font-semibold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/10 rounded-full border border-cyan-400/20 backdrop-blur-sm whitespace-nowrap">
                    📍 Maringá-PR
                  </div>
                  <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-cyan-400/50"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto lg:w-auto">
            {currentUser ? (
              <Link 
                href="/dashboard"
                className="group/btn relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 rounded-xl font-black text-base sm:text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 overflow-hidden text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative flex items-center justify-center gap-2">
                  Ir para o Dashboard
                  <span className="text-xl sm:text-2xl">→</span>
                </span>
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="px-5 sm:px-6 py-3 text-white hover:text-yellow-300 font-bold border-2 border-white/40 rounded-xl hover:border-yellow-300 hover:bg-white/10 transition-all backdrop-blur-sm transform hover:scale-105 text-center"
                >
                  Entrar
                </Link>
                <Link 
                  href="/cadastro"
                  className="group/btn relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-blue-900 rounded-xl font-black text-base sm:text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 overflow-hidden text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative">Cadastrar Grátis</span>
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-20 px-3">
          <div className="inline-block mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 bg-yellow-400/20 backdrop-blur-sm rounded-full border border-yellow-400/30">
            <span className="text-yellow-200 font-bold text-sm sm:text-base">✨ Plataforma #1 em Maringá-PR</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 sm:mb-8 leading-tight drop-shadow-2xl px-2">
            Marketplace de Autopeças<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-cyan-200 to-blue-200">
              em Tempo Real
            </span>
          </h2>
          <p className="text-base sm:text-xl md:text-2xl text-white mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-lg px-4">
            Conectando oficinas, lojas de autopeças e entregadores em Maringá-PR. 
            Encontre peças rápido, compare preços e feche negócios em minutos!
          </p>
          <Link 
            href="/cadastro"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-yellow-400 text-blue-900 rounded-xl hover:bg-yellow-300 font-black text-base sm:text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all transform hover:scale-105 w-full sm:w-auto max-w-sm mx-4"
          >
            Começar Agora
            <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-12 sm:mb-20 px-3">
          <div className="backdrop-blur-md bg-white/10 p-5 sm:p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 backdrop-blur-sm border border-blue-400/30">
              <Wrench className="text-yellow-300" size={28} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4">Oficinas</h3>
            <p className="text-white text-sm sm:text-base mb-3 sm:mb-4 font-medium">
              Publique pedidos de peças e receba ofertas em tempo real de várias autopeças. 
              Compare preços e escolha a melhor oferta!
            </p>
            <ul className="text-sm sm:text-base text-cyan-100 space-y-1.5 sm:space-y-2 font-medium">
              <li>✓ Pedidos ao vivo</li>
              <li>✓ Múltiplas ofertas</li>
              <li>✓ Chat direto com vendedores</li>
              <li>✓ Histórico de compras</li>
            </ul>
          </div>

          <div className="backdrop-blur-md bg-white/10 p-5 sm:p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 backdrop-blur-sm border border-green-400/30">
              <Package className="text-green-300" size={28} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4">Autopeças</h3>
            <p className="text-white text-sm sm:text-base mb-3 sm:mb-4 font-medium">
              Veja pedidos de oficinas em tempo real e faça ofertas competitivas. 
              Ganhe mais clientes e aumente suas vendas!
            </p>
            <ul className="text-sm sm:text-base text-cyan-100 space-y-1.5 sm:space-y-2 font-medium">
              <li>✓ Notificações instantâneas</li>
              <li>✓ Sistema de leilão reverso</li>
              <li>✓ Chat com fotos</li>
              <li>✓ Integração com entregadores</li>
            </ul>
          </div>

          <div className="backdrop-blur-md bg-white/10 p-5 sm:p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20 sm:col-span-2 lg:col-span-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 backdrop-blur-sm border border-yellow-400/30">
              <Truck className="text-yellow-300" size={28} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4">Entregadores</h3>
            <p className="text-white text-sm sm:text-base mb-3 sm:mb-4 font-medium">
              Cadastre-se e receba solicitações de entrega direto no seu WhatsApp. 
              Mais trabalho, mais renda!
            </p>
            <ul className="text-sm sm:text-base text-cyan-100 space-y-1.5 sm:space-y-2 font-medium">
              <li>✓ Cadastro simples</li>
              <li>✓ Integração WhatsApp</li>
              <li>✓ Defina seus valores</li>
              <li>✓ Visibilidade local</li>
            </ul>
          </div>
        </div>

        {/* How it Works */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-12 mb-12 sm:mb-20 border border-white/20 hover:bg-white/15 transition-all mx-3">
          <h3 className="text-3xl sm:text-4xl font-black text-center mb-8 sm:mb-16 text-white drop-shadow-lg">
            Como Funciona
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center backdrop-blur-md bg-white/10 p-4 sm:p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-black shadow-lg shadow-cyan-500/50 ring-4 ring-white/20">
                1
              </div>
              <h4 className="font-black mb-2 sm:mb-3 text-white text-lg sm:text-xl">Cadastre-se</h4>
              <p className="text-sm sm:text-base text-cyan-100 font-medium leading-relaxed">
                Escolha seu tipo de conta: Oficina, Autopeça ou Entregador
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-4 sm:p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-black shadow-lg shadow-green-500/50 ring-4 ring-white/20">
                2
              </div>
              <h4 className="font-black mb-2 sm:mb-3 text-white text-lg sm:text-xl">Publique ou Oferte</h4>
              <p className="text-sm sm:text-base text-cyan-100 font-medium leading-relaxed">
                Oficinas publicam pedidos, Autopeças fazem ofertas
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-4 sm:p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-black shadow-lg shadow-yellow-500/50 ring-4 ring-white/20">
                3
              </div>
              <h4 className="font-black mb-2 sm:mb-3 text-white text-lg sm:text-xl">Negocie</h4>
              <p className="text-sm sm:text-base text-cyan-100 font-medium leading-relaxed">
                Use o chat para negociar detalhes e enviar fotos
              </p>
            </div>
            <div className="text-center backdrop-blur-md bg-white/10 p-4 sm:p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-black shadow-lg shadow-purple-500/50 ring-4 ring-white/20">
                4
              </div>
              <h4 className="font-black mb-2 sm:mb-3 text-white text-lg sm:text-xl">Feche o Negócio</h4>
              <p className="text-sm sm:text-base text-cyan-100 font-medium leading-relaxed">
                Confirme a venda e solicite um entregador
              </p>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="text-center px-4">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6 drop-shadow-2xl">
            Pronto para começar?
          </h3>
          <p className="text-lg sm:text-xl md:text-2xl text-white mb-8 sm:mb-10 font-medium drop-shadow-lg">
            Junte-se ao maior marketplace de autopeças de Maringá!
          </p>
          <Link 
            href="/cadastro"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto max-w-sm"
          >
            Criar Conta Grátis
            <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 sm:mt-20 py-6 sm:py-8 border-t border-white/20 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-4 text-center text-white">
          <p className="font-semibold text-base sm:text-lg">&copy; 2025 Grupão das autopeças - Marketplace em Tempo Real</p>
          <p className="text-sm sm:text-base mt-2 text-cyan-100">Maringá-PR • Conectando o mercado automotivo local</p>
        </div>
      </footer>
    </div>
  );
}

