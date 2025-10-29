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
    <nav className="navbar-custom bg-blue-700 relative z-50" style={{ backgroundColor: '#1d4ed8', opacity: 1, position: 'relative', zIndex: 9999 }}>
      <div className="container mx-auto px-4" style={{ opacity: 1 }}>
        <div className="flex items-center justify-between h-20" style={{ opacity: 1 }}>
          {/* Logo */}
          <div className="flex items-center space-x-6" style={{ opacity: 1 }}>
            <Link href="/" className="flex items-center space-x-4" style={{ opacity: 1 }}>
              {/* Logo Simples - Carro Amarelo */}
              <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 1 }}>
                  <defs>
                    <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#FBBF24', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#F59E0B', stopOpacity: 1}} />
                    </linearGradient>
                  </defs>
                  
                  {/* Círculo de fundo azul */}
                  <circle cx="50" cy="50" r="48" fill="#1E40AF" stroke="#FBBF24" strokeWidth="3"/>
                  
                  {/* Carro amarelo - vista lateral */}
                  <g transform="translate(50, 50)">
                    {/* Corpo do carro */}
                    <path d="M-20 5 L-15 -5 L-5 -8 L5 -8 L15 -5 L20 5 L20 10 L-20 10 Z" 
                          fill="url(#carGradient)" stroke="#FFFFFF" strokeWidth="1.5"/>
                    
                    {/* Janelas */}
                    <rect x="-12" y="-6" width="8" height="6" rx="1" fill="#1E40AF"/>
                    <rect x="0" y="-6" width="10" height="6" rx="1" fill="#1E40AF"/>
                    
                    {/* Rodas */}
                    <circle cx="-12" cy="10" r="5" fill="#FFFFFF" stroke="#1E40AF" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="5" fill="#FFFFFF" stroke="#1E40AF" strokeWidth="2"/>
                    
                    {/* Centro das rodas */}
                    <circle cx="-12" cy="10" r="2" fill="#1E40AF"/>
                    <circle cx="12" cy="10" r="2" fill="#1E40AF"/>
                  </g>
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

