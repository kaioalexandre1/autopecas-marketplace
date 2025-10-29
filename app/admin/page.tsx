'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, NegocioFechado, Pedido } from '@/types';
import { 
  Users, 
  Store, 
  Wrench, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart,
  CheckCircle,
  Calendar,
  ArrowLeft,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { startOfDay, startOfWeek, startOfMonth, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  
  // Estados para dados
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [negocios, setNegocios] = useState<NegocioFechado[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  
  // Estados para filtros
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState<'todos' | 'oficina' | 'autopeca' | 'entregador'>('todos');

  // Verificar se é admin
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin') {
        toast.error('Acesso negado! Apenas administradores podem acessar esta página.');
        router.push('/dashboard');
      }
    } else if (!authLoading && !userData) {
      router.push('/login');
    }
  }, [userData, authLoading, router]);

  // Carregar todos os dados
  useEffect(() => {
    if (userData?.role === 'admin') {
      carregarDados();
    }
  }, [userData]);

  const carregarDados = async () => {
    console.log('🔄 Iniciando carregamento de dados...');
    try {
      setCarregando(true);

      // Carregar usuários
      console.log('📊 Carregando usuários...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`✅ ${usersSnapshot.docs.length} usuários encontrados`);
      const usersData: User[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as User;
      });
      setUsuarios(usersData);
      console.log('✅ Usuários carregados:', usersData.length);

      // Carregar negócios fechados
      console.log('💰 Carregando negócios fechados...');
      const negociosSnapshot = await getDocs(collection(db, 'negocios_fechados'));
      console.log(`✅ ${negociosSnapshot.docs.length} negócios encontrados`);
      const negociosData: NegocioFechado[] = negociosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          valorFinal: data.valorFinal || 0,
        } as NegocioFechado;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNegocios(negociosData);
      console.log('✅ Negócios carregados:', negociosData.length);

      // Carregar pedidos
      console.log('📦 Carregando pedidos...');
      const pedidosSnapshot = await getDocs(collection(db, 'pedidos'));
      console.log(`✅ ${pedidosSnapshot.docs.length} pedidos encontrados`);
      const pedidosData: Pedido[] = pedidosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Pedido;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPedidos(pedidosData);
      console.log('✅ Pedidos carregados:', pedidosData.length);

      console.log('🎉 Todos os dados carregados com sucesso!');
      setCarregando(false);
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
      setCarregando(false);
    }
  };

  // Filtrar negócios por período
  const negociosFiltrados = negocios.filter(negocio => {
    const hoje = startOfDay(new Date());
    const inicioSemana = startOfWeek(new Date(), { locale: ptBR });
    const inicioMes = startOfMonth(new Date());

    const dataNegocio = negocio.createdAt;

    if (periodoSelecionado === 'hoje') {
      return isAfter(dataNegocio, hoje);
    } else if (periodoSelecionado === 'semana') {
      return isAfter(dataNegocio, inicioSemana);
    } else if (periodoSelecionado === 'mes') {
      return isAfter(dataNegocio, inicioMes);
    }
    return true;
  });

  // Filtrar usuários por tipo
  const usuariosFiltrados = tipoUsuarioFiltro === 'todos' 
    ? usuarios 
    : usuarios.filter(u => u.tipo === tipoUsuarioFiltro);

  // Estatísticas gerais
  const totalOficinas = usuarios.filter(u => u.tipo === 'oficina').length;
  const totalAutopecas = usuarios.filter(u => u.tipo === 'autopeca').length;
  const totalEntregadores = usuarios.filter(u => u.tipo === 'entregador').length;
  const totalPedidosAtivos = pedidos.filter(p => p.status === 'ativo').length;
  const totalNegociosFechados = negociosFiltrados.length;
  const faturamentoTotal = negociosFiltrados.reduce((acc, n) => acc + (n.valorFinal || 0), 0);

  // Faturamento por autopeça
  const faturamentoPorAutopeca = negociosFiltrados.reduce((acc, negocio) => {
    if (!acc[negocio.autopecaNome]) {
      acc[negocio.autopecaNome] = {
        nome: negocio.autopecaNome,
        id: negocio.autopecaId,
        total: 0,
        quantidade: 0
      };
    }
    acc[negocio.autopecaNome].total += negocio.valorFinal || 0;
    acc[negocio.autopecaNome].quantidade += 1;
    return acc;
  }, {} as Record<string, { nome: string; id: string; total: number; quantidade: number }>);

  const rankingAutopecas = Object.values(faturamentoPorAutopeca).sort((a, b) => b.total - a.total);

  if (authLoading || carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              Voltar ao Dashboard
            </Link>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-4 py-2 rounded-full shadow-lg">
              <Shield size={20} />
              <span className="font-black uppercase text-sm">Administrador</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-blue-900 mb-2">
            🛡️ Painel Administrativo
          </h1>
          <p className="text-gray-600 text-lg">Visão completa do sistema - {userData.nome}</p>
        </div>

        {/* Cards de Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Oficinas */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Oficinas</p>
                <p className="text-3xl font-black text-gray-900">{totalOficinas}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Wrench className="text-orange-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Autopeças */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Autopeças</p>
                <p className="text-3xl font-black text-gray-900">{totalAutopecas}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Store className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Entregadores */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Entregadores</p>
                <p className="text-3xl font-black text-gray-900">{totalEntregadores}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Truck className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Pedidos Ativos */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Pedidos Ativos</p>
                <p className="text-3xl font-black text-gray-900">{totalPedidosAtivos}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ShoppingCart className="text-purple-600" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Negócios Fechados */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={28} />
              Negócios Fechados
            </h2>
            
            {/* Seletor de Período */}
            <div className="flex gap-2">
              {(['hoje', 'semana', 'mes'] as const).map((periodo) => (
                <button
                  key={periodo}
                  onClick={() => setPeriodoSelecionado(periodo)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    periodoSelecionado === periodo
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta Semana' : 'Este Mês'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de Estatísticas de Negócios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold uppercase">Faturamento Total</p>
                  <p className="text-4xl font-black">R$ {faturamentoTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <DollarSign size={32} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold uppercase">Total de Vendas</p>
                  <p className="text-4xl font-black">{totalNegociosFechados}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <CheckCircle size={32} />
                </div>
              </div>
            </div>
          </div>

          {/* Ranking de Autopeças */}
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900 mb-4">🏆 Ranking de Autopeças por Faturamento</h3>
            <div className="space-y-3">
              {rankingAutopecas.slice(0, 5).map((autopeca, index) => (
                <div 
                  key={autopeca.id}
                  className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-blue-500"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{autopeca.nome}</p>
                      <p className="text-sm text-gray-600">{autopeca.quantidade} venda{autopeca.quantidade > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">R$ {autopeca.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600" size={28} />
              Usuários Cadastrados
            </h2>
            
            {/* Filtro de Tipo de Usuário */}
            <div className="flex gap-2">
              {(['todos', 'oficina', 'autopeca', 'entregador'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoUsuarioFiltro(tipo)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                    tipoUsuarioFiltro === tipo
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tipo === 'todos' ? 'Todos' : tipo === 'oficina' ? 'Oficinas' : tipo === 'autopeca' ? 'Autopeças' : 'Entregadores'}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200">
                  <th className="text-left p-4 font-black text-gray-900">Nome</th>
                  <th className="text-left p-4 font-black text-gray-900">Tipo</th>
                  <th className="text-left p-4 font-black text-gray-900">Cidade</th>
                  <th className="text-left p-4 font-black text-gray-900">Telefone</th>
                  <th className="text-left p-4 font-black text-gray-900">Documento</th>
                  <th className="text-left p-4 font-black text-gray-900">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{usuario.nome}</span>
                        {usuario.role === 'admin' && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-2 py-1 rounded-full">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        usuario.tipo === 'oficina' ? 'bg-orange-100 text-orange-800' :
                        usuario.tipo === 'autopeca' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {usuario.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">{usuario.cidade}</td>
                    <td className="p-4 text-gray-700">{usuario.telefone}</td>
                    <td className="p-4 text-gray-700 font-mono text-sm">{usuario.documento}</td>
                    <td className="p-4 text-gray-600 text-sm">
                      {format(usuario.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

