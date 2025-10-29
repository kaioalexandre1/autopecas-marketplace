'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Radio, MessageSquare, CheckCircle, User, Settings, Car, Wrench, MapPin, ChevronDown, Shield } from 'lucide-react';

export default function Navbar() {
  const { userData, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  const cidadesDisponiveis = [
    'Maringá-PR',
    'Londrina-PR',
    'Curitiba-PR',
    'Cascavel-PR',
    'Ponta Grossa-PR'
  ];

  // Carregar cidades selecionadas do localStorage
  useEffect(() => {
    if (userData?.cidade && cidadesSelecionadas.length === 0) {
      const cidadesSalvas = localStorage.getItem('cidadesSelecionadas');
      if (cidadesSalvas) {
        setCidadesSelecionadas(JSON.parse(cidadesSalvas));
      } else {
        setCidadesSelecionadas([userData.cidade]);
        localStorage.setItem('cidadesSelecionadas', JSON.stringify([userData.cidade]));
      }
    }
  }, [userData, cidadesSelecionadas]);

  const toggleCidade = (cidade: string) => {
    setCidadesSelecionadas(prev => {
      let novaSelecao: string[];
      if (prev.includes(cidade)) {
        // Não permitir desmarcar se for a única cidade
        if (prev.length === 1) {
          return prev;
        }
        novaSelecao = prev.filter(c => c !== cidade);
      } else {
        novaSelecao = [...prev, cidade];
      }
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      // Recarregar página para aplicar filtro
      setTimeout(() => window.location.reload(), 100);
      return novaSelecao;
    });
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Pedidos ao Vivo', icon: Radio },
    { href: '/dashboard/chats', label: 'Chats', icon: MessageSquare },
    { href: '/dashboard/negocios-fechados', label: 'Negócios Fechados', icon: CheckCircle },
    ...(userData?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const getTipoBadgeColor = () => {
    switch (userData?.tipo) {
      case 'oficina':
        return 'bg-blue-100 text-blue-800';
      case 'autopeca':
        return 'bg-green-100 text-green-800';
      case 'entregador':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <nav className="bg-blue-700" style={{ backgroundColor: 'rgb(29, 78, 216)', opacity: 1 }}>
      <div className="container mx-auto px-4" style={{ opacity: 1 }}>
        <div className="flex items-center justify-between h-20" style={{ opacity: 1 }}>
          {/* Logo */}
          <div className="flex items-center space-x-6" style={{ opacity: 1 }}>
            <Link href="/" className="flex items-center space-x-4" style={{ opacity: 1 }}>
              {/* Logo Marketplace de Autopeças - Design Moderno */}
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 1 }}>
                  {/* Hexágono externo (como uma porca) - Gradiente azul para laranja */}
                  <defs>
                    <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 1}} />
                      <stop offset="50%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#F59E0B', stopOpacity: 1}} />
                    </linearGradient>
                    <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#FBBF24', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#F59E0B', stopOpacity: 1}} />
                    </linearGradient>
                  </defs>
                  
                  {/* Hexágono principal (porca) */}
                  <path d="M50 5 L80 22.5 L80 57.5 L50 75 L20 57.5 L20 22.5 Z" 
                        fill="url(#hexGrad)" 
                        stroke="#1E40AF" 
                        strokeWidth="2.5"/>
                  
                  {/* Círculo interno branco para contraste */}
                  <circle cx="50" cy="50" r="28" fill="#FFFFFF"/>
                  
                  {/* Engrenagem central */}
                  <g>
                    {/* 6 dentes da engrenagem */}
                    <path d="M50 20 L53 24 L47 24 Z" fill="#F59E0B"/>
                    <path d="M73 35 L69 38 L71 32 Z" fill="#F59E0B"/>
                    <path d="M73 65 L71 68 L69 62 Z" fill="#F59E0B"/>
                    <path d="M50 80 L47 76 L53 76 Z" fill="#F59E0B"/>
                    <path d="M27 65 L31 62 L29 68 Z" fill="#F59E0B"/>
                    <path d="M27 35 L29 32 L31 38 Z" fill="#F59E0B"/>
                    
                    {/* Círculo da engrenagem */}
                    <circle cx="50" cy="50" r="15" fill="url(#centerGrad)" stroke="#D97706" strokeWidth="2"/>
                  </g>
                  
                  {/* Chave inglesa estilizada em destaque */}
                  <g transform="translate(50, 50) rotate(-45)">
                    <rect x="-3" y="-18" width="6" height="24" rx="2" fill="#1E40AF"/>
                    <path d="M-6 -18 L-8 -22 L-4 -24 L0 -20 L4 -24 L8 -22 L6 -18 Z" 
                          fill="#1E40AF" stroke="#FFFFFF" strokeWidth="1"/>
                    <circle cx="0" cy="8" r="5" fill="none" stroke="#1E40AF" strokeWidth="2.5"/>
                  </g>
                  
                  {/* Detalhes decorativos - parafusos nos cantos */}
                  <circle cx="50" cy="15" r="2.5" fill="#1E40AF"/>
                  <circle cx="73" cy="30" r="2.5" fill="#1E40AF"/>
                  <circle cx="73" cy="70" r="2.5" fill="#1E40AF"/>
                  <circle cx="50" cy="85" r="2.5" fill="#1E40AF"/>
                  <circle cx="27" cy="70" r="2.5" fill="#1E40AF"/>
                  <circle cx="27" cy="30" r="2.5" fill="#1E40AF"/>
              </svg>
              <div className="text-3xl font-black text-white uppercase tracking-wide" style={{ opacity: 1, color: 'rgb(255, 255, 255)' }}>
                Grupão das Autopeças
              </div>
            </Link>

            {/* Seletor de Cidades (Múltipla) */}
            {userData && cidadesSelecionadas.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                  className="bg-blue-800 text-white font-semibold px-4 py-2.5 pr-10 rounded-lg border-2 border-white focus:outline-none cursor-pointer flex items-center gap-2"
                >
                  <MapPin size={18} className="text-yellow-400" />
                  <span>
                    {cidadesSelecionadas.length === 1
                      ? cidadesSelecionadas[0]
                      : `${cidadesSelecionadas.length} cidades`
                    }
                  </span>
                  <ChevronDown size={18} className={`text-yellow-400 ${mostrarDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown com checkboxes */}
                {mostrarDropdown && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMostrarDropdown(false)}
                    />
                    
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 py-2 min-w-[200px] z-20">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600">Selecione as cidades</p>
                      </div>
                      {cidadesDisponiveis.map((cidade) => (
                        <button
                          key={cidade}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCidade(cidade);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            cidadesSelecionadas.includes(cidade)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {cidadesSelecionadas.includes(cidade) && (
                              <CheckCircle size={14} className="text-white" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            cidadesSelecionadas.includes(cidade)
                              ? 'font-semibold text-blue-900'
                              : 'text-gray-700'
                          }`}>
                            {cidade}
                          </span>
                        </button>
                      ))}
                      <div className="px-3 py-2 border-t border-gray-200 mt-2">
                        <p className="text-xs text-gray-500">
                          ✓ {cidadesSelecionadas.length} selecionada{cidadesSelecionadas.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1" style={{ opacity: 1 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 rounded-lg font-medium ${
                    isActive
                      ? 'bg-yellow-400 text-blue-900 font-bold shadow-lg'
                      : 'text-white'
                  }`}
                >
                  <Icon size={20} className="mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4" style={{ opacity: 1 }}>
            <div className="text-right" style={{ opacity: 1 }}>
              <div className="text-sm font-bold text-white" style={{ opacity: 1, color: 'rgb(255, 255, 255)' }}>{userData?.nome}</div>
              <div className={`text-xs px-3 py-1 rounded-full inline-block font-semibold ${getTipoBadgeColor()}`} style={{ opacity: 1 }}>
                {getTipoLabel()}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2.5 text-white rounded-lg border-2 border-white"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Sair"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

