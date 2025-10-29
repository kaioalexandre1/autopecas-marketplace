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
    <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-2xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <Car className="text-white" size={48} strokeWidth={2.5} />
                <Wrench
                  className="absolute -bottom-1 -right-1 text-yellow-400 bg-blue-900 rounded-full p-1"
                  size={24}
                  strokeWidth={3}
                />
              </div>
              <div className="text-3xl font-black text-white group-hover:text-yellow-400 transition-colors uppercase tracking-wide">
                Grupão das Autopeças
              </div>
            </Link>

            {/* Seletor de Cidades (Múltipla) */}
            {userData && cidadesSelecionadas.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                  className="bg-white bg-opacity-10 backdrop-blur-sm text-white font-semibold px-4 py-2.5 pr-10 rounded-lg border-2 border-white border-opacity-20 hover:bg-opacity-20 hover:border-opacity-40 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent cursor-pointer transition-all flex items-center gap-2 shadow-lg"
                >
                  <MapPin size={18} className="text-yellow-400" />
                  <span>
                    {cidadesSelecionadas.length === 1
                      ? cidadesSelecionadas[0]
                      : `${cidadesSelecionadas.length} cidades`
                    }
                  </span>
                  <ChevronDown size={18} className={`text-yellow-400 transition-transform ${mostrarDropdown ? 'rotate-180' : ''}`} />
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
                          className="w-full px-3 py-2 hover:bg-blue-50 flex items-center gap-2 transition-colors text-left"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
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
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 rounded-lg transition-all font-medium ${
                    isActive
                      ? 'bg-yellow-400 text-blue-900 font-bold shadow-lg'
                      : 'text-white hover:bg-white hover:bg-opacity-10 hover:text-yellow-400'
                  }`}
                >
                  <Icon size={20} className="mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-bold text-white">{userData?.nome}</div>
              <div className={`text-xs px-3 py-1 rounded-full inline-block font-semibold ${getTipoBadgeColor()}`}>
                {getTipoLabel()}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2.5 text-white hover:text-red-400 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all shadow-lg border-2 border-white border-opacity-20"
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

