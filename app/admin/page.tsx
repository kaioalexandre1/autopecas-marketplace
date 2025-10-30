'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, NegocioFechado, Pedido, PlanoAssinatura, PRECOS_PLANOS } from '@/types';
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
  Shield,
  Lock,
  Unlock,
  Crown,
  Ban
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
  
  // Estados para configuração do Mercado Pago
  const [mostrarConfigMP, setMostrarConfigMP] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [salvandoMP, setSalvandoMP] = useState(false);

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
      carregarConfigMP();
    }
  }, [userData]);

  // Carregar configuração do Mercado Pago
  const carregarConfigMP = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracoes', 'mercadopago'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setMpAccessToken(data.accessToken || '');
        setMpPublicKey(data.publicKey || '');
      }
    } catch (error) {
      console.error('Erro ao carregar config MP:', error);
    }
  };

  // Salvar configuração do Mercado Pago
  const salvarConfigMP = async () => {
    if (!mpAccessToken.trim() || !mpPublicKey.trim()) {
      toast.error('Preencha todos os campos do Mercado Pago');
      return;
    }

    setSalvandoMP(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'mercadopago'), {
        accessToken: mpAccessToken.trim(),
        publicKey: mpPublicKey.trim(),
        updatedAt: Timestamp.now(),
        updatedBy: userData?.id,
      });
      
      toast.success('Configuração do Mercado Pago salva com sucesso!');
      setMostrarConfigMP(false);
    } catch (error) {
      console.error('Erro ao salvar config MP:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSalvandoMP(false);
    }
  };

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
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMostrarConfigMP(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all font-bold"
              >
                <DollarSign size={20} />
                Configurar Mercado Pago
              </button>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-4 py-2 rounded-full shadow-lg">
                <Shield size={20} />
                <span className="font-black uppercase text-sm">Administrador</span>
              </div>
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

        {/* Gerenciamento de Assinaturas (Autopeças) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-6">
            <Crown className="text-yellow-600" size={28} />
            Gerenciamento de Assinaturas
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-yellow-50 border-b-2 border-yellow-200">
                  <th className="text-left p-4 font-black text-gray-900">Autopeça</th>
                  <th className="text-left p-4 font-black text-gray-900">Plano</th>
                  <th className="text-left p-4 font-black text-gray-900">Ofertas</th>
                  <th className="text-left p-4 font-black text-gray-900">Status</th>
                  <th className="text-center p-4 font-black text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.filter(u => u.tipo === 'autopeca').map((autopeca) => {
                  const planoNome = {
                    basico: 'Básico (Grátis)',
                    premium: 'Premium',
                    gold: 'Gold',
                    platinum: 'Platinum'
                  }[autopeca.plano || 'basico'];

                  return (
                    <tr key={autopeca.id} className="border-b border-gray-100 hover:bg-yellow-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{autopeca.nome}</p>
                          <p className="text-xs text-gray-500">{autopeca.cidade}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          autopeca.plano === 'platinum' ? 'bg-purple-100 text-purple-800' :
                          autopeca.plano === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                          autopeca.plano === 'premium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {planoNome}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <span className="font-bold">{autopeca.ofertasUsadas || 0}</span>
                          <span className="text-gray-500"> / </span>
                          <span>{autopeca.plano === 'platinum' ? '∞' : 
                            autopeca.plano === 'gold' ? '200' :
                            autopeca.plano === 'premium' ? '100' : '20'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {autopeca.contaBloqueada ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                            <Ban size={14} />
                            BLOQUEADA
                          </span>
                        ) : autopeca.assinaturaAtiva ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                            <CheckCircle size={14} />
                            ATIVA
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                            INATIVA
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={async () => {
                              const confirmar = window.confirm(
                                `Deseja ${autopeca.contaBloqueada ? 'desbloquear' : 'bloquear'} a conta de ${autopeca.nome}?`
                              );
                              if (confirmar) {
                                try {
                                  await updateDoc(doc(db, 'users', autopeca.id), {
                                    contaBloqueada: !autopeca.contaBloqueada
                                  });
                                  toast.success(`Conta ${autopeca.contaBloqueada ? 'desbloqueada' : 'bloqueada'} com sucesso!`);
                                  carregarDados();
                                } catch (error) {
                                  toast.error('Erro ao atualizar conta');
                                }
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${
                              autopeca.contaBloqueada ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {autopeca.contaBloqueada ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Configuração do Mercado Pago */}
      {mostrarConfigMP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={32} className="text-white" />
                  <h2 className="text-2xl font-black text-white">
                    Configurar Mercado Pago
                  </h2>
                </div>
                <button
                  onClick={() => setMostrarConfigMP(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                >
                  <Ban size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 mb-2">ℹ️ Como obter suas credenciais:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse: <a href="https://www.mercadopago.com.br/developers" target="_blank" className="font-bold underline">www.mercadopago.com.br/developers</a></li>
                  <li>Faça login com sua conta do Mercado Pago</li>
                  <li>Vá em "Suas integrações" → "Credenciais"</li>
                  <li>Escolha "Produção" para receber pagamentos reais</li>
                  <li>Copie o "Access Token" e a "Public Key"</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Importante:</h3>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Use credenciais de <strong>PRODUÇÃO</strong> para receber pagamentos reais</li>
                  <li>Use credenciais de <strong>TESTE</strong> apenas para testar</li>
                  <li>Mantenha suas credenciais em segredo</li>
                  <li>Os pagamentos cairão na conta vinculada ao Mercado Pago</li>
                </ul>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Public Key (pk_live_... ou pk_test_...)
                  </label>
                  <input
                    type="text"
                    value={mpPublicKey}
                    onChange={(e) => setMpPublicKey(e.target.value)}
                    placeholder="pk_live_xxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Access Token (APP_USR-... ou TEST-...)
                  </label>
                  <textarea
                    value={mpAccessToken}
                    onChange={(e) => setMpAccessToken(e.target.value)}
                    placeholder="APP_USR-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm resize-none"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarConfigMP(false)}
                  className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConfigMP}
                  disabled={salvandoMP}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {salvandoMP ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

