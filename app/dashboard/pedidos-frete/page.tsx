import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, Package, Phone, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface PedidoFrete {
  id: string;
  chatId: string;
  autopecaId: string;
  autopecaNome: string;
  autopecaTelefone?: string;
  autopecaEndereco?: string;
  autopecaCidade?: string;
  oficinaId: string;
  oficinaNome: string;
  oficinaTelefone?: string;
  oficinaEndereco?: string;
  oficinaCidade?: string;
  criadoEm?: Date;
  status: 'aberto' | 'aceito' | 'cancelado';
  aceitoPor?: string;
  aceitoEm?: Date;
}

const formatarWhatsapp = (telefone?: string) => {
  if (!telefone) return '';
  const numeros = telefone.replace(/\D/g, '');
  if (!numeros) return '';
  return numeros.startsWith('55') ? numeros : `55${numeros}`;
};

const montarMensagem = (
  tipo: 'autopeca' | 'oficina',
  pedido: PedidoFrete,
  valor?: number
) => {
  const saudacao = 'Olá! Aqui é um entregador do Grupão das Autopeças.';
  const destino = tipo === 'autopeca' ? pedido.autopecaNome : pedido.oficinaNome;
  const base = `${saudacao}\n\nRecebi um pedido de frete para vocês.`;
  const detalhes =
    tipo === 'autopeca'
      ? `Local de coleta: ${pedido.autopecaEndereco || '—'}\nDestino: ${pedido.oficinaEndereco || '—'}`
      : `Local de coleta: ${pedido.autopecaEndereco || '—'}\nDestino: ${pedido.oficinaEndereco || '—'}`;
  const valorTexto = valor
    ? `\n\nValor sugerido (dentro da cidade): R$ ${valor.toFixed(2).replace('.', ',')}`
    : '';
  return encodeURIComponent(`${base}\n${detalhes}${valorTexto}`);
};

export default function PedidosFretePage() {
  const { userData } = useAuth();
  const router = useRouter();

  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<PedidoFrete[]>([]);
  const [meusPedidos, setMeusPedidos] = useState<PedidoFrete[]>([]);

  useEffect(() => {
    if (!userData) return;

    if (userData.tipo !== 'entregador') {
      router.push('/dashboard');
      return;
    }

    const disponiveisQuery = query(
      collection(db, 'pedidosFrete'),
      where('status', '==', 'aberto'),
      orderBy('criadoEm', 'desc')
    );

    const meusQuery = query(
      collection(db, 'pedidosFrete'),
      where('aceitoPor', '==', userData.id),
      orderBy('aceitoEm', 'desc')
    );

    const unsubDisponiveis = onSnapshot(disponiveisQuery, (snapshot) => {
      const lista: PedidoFrete[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({
          id: docSnap.id,
          chatId: data.chatId,
          autopecaId: data.autopecaId,
          autopecaNome: data.autopecaNome,
          autopecaTelefone: data.autopecaTelefone,
          autopecaEndereco: data.autopecaEndereco,
          autopecaCidade: data.autopecaCidade,
          oficinaId: data.oficinaId,
          oficinaNome: data.oficinaNome,
          oficinaTelefone: data.oficinaTelefone,
          oficinaEndereco: data.oficinaEndereco,
          oficinaCidade: data.oficinaCidade,
          criadoEm: data.criadoEm?.toDate?.() || new Date(data.criadoEm || Date.now()),
          status: data.status || 'aberto',
        });
      });
      setPedidosDisponiveis(lista);
    });

    const unsubMeus = onSnapshot(meusQuery, (snapshot) => {
      const lista: PedidoFrete[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({
          id: docSnap.id,
          chatId: data.chatId,
          autopecaId: data.autopecaId,
          autopecaNome: data.autopecaNome,
          autopecaTelefone: data.autopecaTelefone,
          autopecaEndereco: data.autopecaEndereco,
          autopecaCidade: data.autopecaCidade,
          oficinaId: data.oficinaId,
          oficinaNome: data.oficinaNome,
          oficinaTelefone: data.oficinaTelefone,
          oficinaEndereco: data.oficinaEndereco,
          oficinaCidade: data.oficinaCidade,
          criadoEm: data.criadoEm?.toDate?.() || new Date(data.criadoEm || Date.now()),
          status: data.status || 'aberto',
          aceitoPor: data.aceitoPor,
          aceitoEm: data.aceitoEm?.toDate?.() || undefined,
        });
      });
      setMeusPedidos(lista);
    });

    return () => {
      unsubDisponiveis();
      unsubMeus();
    };
  }, [userData, router]);

  const aceitarFrete = async (pedido: PedidoFrete) => {
    if (!userData) return;

    try {
      await updateDoc(doc(db, 'pedidosFrete', pedido.id), {
        status: 'aceito',
        aceitoPor: userData.id,
        aceitoEm: Timestamp.now(),
      });
      toast.success('Frete aceito! Combine com a autopeça ou oficina pelo WhatsApp.');
    } catch (error) {
      console.error('Erro ao aceitar frete:', error);
      toast.error('Não foi possível aceitar o frete. Ele pode já ter sido aceito por outro entregador.');
    }
  };

  const valorDentroCidade = useMemo(() => {
    const valor = Number(userData?.valorFreteDentroCidade);
    return Number.isFinite(valor) ? valor : null;
  }, [userData]);

  const renderCard = (pedido: PedidoFrete, disponivel: boolean) => {
    const mesmaCidade =
      !!userData?.cidade &&
      pedido.autopecaCidade?.toLowerCase() === userData.cidade?.toLowerCase() &&
      pedido.oficinaCidade?.toLowerCase() === userData.cidade?.toLowerCase();

    const valorSugerido = mesmaCidade && valorDentroCidade ? valorDentroCidade : null;

    return (
      <div key={pedido.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="text-blue-600" size={28} />
            <div>
              <p className="font-black text-lg text-gray-900 dark:text-white">Autopeça: {pedido.autopecaNome}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Oficina: {pedido.oficinaNome}</p>
            </div>
          </div>
          {disponivel ? (
            <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300">Disponível</span>
          ) : (
            <span className="text-xs font-bold uppercase text-green-600 dark:text-green-300 flex items-center gap-1"><CheckCircle size={14} /> Aceito</span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="font-bold text-blue-800 dark:text-blue-200 mb-2">Coletar em</p>
            <p className="text-gray-800 dark:text-gray-200">{pedido.autopecaEndereco || 'Endereço não informado'}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Cidade: {pedido.autopecaCidade || '—'}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
            <p className="font-bold text-emerald-800 dark:text-emerald-200 mb-2">Entregar em</p>
            <p className="text-gray-800 dark:text-gray-200">{pedido.oficinaEndereco || 'Endereço não informado'}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Cidade: {pedido.oficinaCidade || '—'}</p>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-3">
          <Info size={18} className="mt-0.5" />
          <div>
            {valorSugerido ? (
              <p>
                Mesma cidade cadastrada para autopeça, oficina e você. Valor sugerido: <strong>R$ {valorSugerido.toFixed(2).replace('.', ',')}</strong>
              </p>
            ) : (
              <p>
                Cidades diferentes. Combine o valor diretamente com a autopeça ou oficina pelo WhatsApp.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {pedido.autopecaTelefone && (
            <button
              onClick={() => {
                const numero = formatarWhatsapp(pedido.autopecaTelefone);
                if (!numero) {
                  toast.error('Autopeça sem telefone cadastrado para WhatsApp.');
                  return;
                }
                const mensagem = montarMensagem('autopeca', pedido, valorSugerido || undefined);
                window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
            >
              <Phone size={16} /> Autopeça
            </button>
          )}
          {pedido.oficinaTelefone && (
            <button
              onClick={() => {
                const numero = formatarWhatsapp(pedido.oficinaTelefone);
                if (!numero) {
                  toast.error('Oficina sem telefone cadastrado para WhatsApp.');
                  return;
                }
                const mensagem = montarMensagem('oficina', pedido, valorSugerido || undefined);
                window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
              }}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2"
            >
              <Phone size={16} /> Oficina
            </button>
          )}
          {disponivel && (
            <button
              onClick={() => aceitarFrete(pedido)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              Aceitar frete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-7xl opacity-20 animate-bounce">📦</div>
        <div className="absolute bottom-16 right-12 text-6xl opacity-20 animate-bounce" style={{ animationDelay: '0.4s' }}>
          🚛
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10 sm:py-16">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 shadow-lg">
              <Package size={36} />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black drop-shadow-lg">Pedidos de Frete</h1>
            <p className="text-white/90 mt-2 font-medium">
              Aqui você encontra os fretes solicitados automaticamente pelas autopeças e oficinas.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Package size={24} /> Disponíveis ({pedidosDisponiveis.length})
              </h2>
              {valorDentroCidade ? (
                <span className="text-white/90 text-sm">
                  Seu valor padrão dentro da cidade: <strong>R$ {valorDentroCidade.toFixed(2).replace('.', ',')}</strong>
                </span>
              ) : null}
            </div>

            {pedidosDisponiveis.length === 0 ? (
              <div className="bg-white/20 text-white rounded-2xl p-6 text-center font-semibold">
                Nenhum pedido disponível no momento. Aguarde ser chamado automaticamente pelo chat.
              </div>
            ) : (
              <div className="grid gap-4">
                {pedidosDisponiveis.map((pedido) => renderCard(pedido, true))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Truck size={24} /> Meus Fretes Aceitos ({meusPedidos.length})
            </h2>
            {meusPedidos.length === 0 ? (
              <div className="bg-white/15 text-white rounded-2xl p-6 text-center font-semibold">
                Você ainda não aceitou nenhum frete automático.
              </div>
            ) : (
              <div className="grid gap-4">
                {meusPedidos.map((pedido) => renderCard(pedido, false))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
