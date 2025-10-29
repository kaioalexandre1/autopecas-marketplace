'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira seu email!');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setEnviado(true);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('Email não cadastrado no sistema!');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email inválido!');
      } else {
        toast.error('Erro ao enviar email. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 relative overflow-hidden py-8 px-4">
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-400 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white drop-shadow-2xl mb-3">
            🔐 Recuperar Senha
          </h1>
          <p className="text-xl text-cyan-100 font-semibold">
            {enviado ? '✅ Email enviado com sucesso!' : '📧 Digite seu email para recuperar o acesso'}
          </p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-8 border-2 border-white/30 hover:bg-white/15 transition-all">
          {!enviado ? (
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
                <p className="text-cyan-100 text-sm mt-2">
                  💡 Enviaremos um link para redefinir sua senha
                </p>
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
                    <Mail size={24} strokeWidth={2.5} />
                    Enviar Link de Recuperação
                  </span>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-green-500 bg-opacity-20 border-2 border-green-300 rounded-xl p-6">
                <CheckCircle className="mx-auto text-green-300 mb-4" size={64} strokeWidth={2} />
                <h3 className="text-2xl font-black text-white mb-2">Email Enviado!</h3>
                <p className="text-cyan-100">
                  Verifique sua caixa de entrada e spam.
                </p>
                <p className="text-cyan-100 text-sm mt-2">
                  📧 <strong>{email}</strong>
                </p>
              </div>

              <div className="bg-blue-500 bg-opacity-20 border-2 border-blue-300 rounded-xl p-4 text-left">
                <p className="text-white font-semibold mb-2">📌 Próximos passos:</p>
                <ol className="text-cyan-100 text-sm space-y-1 ml-4">
                  <li>1️⃣ Abra seu email</li>
                  <li>2️⃣ Clique no link de recuperação</li>
                  <li>3️⃣ Defina uma nova senha</li>
                  <li>4️⃣ Faça login com a nova senha</li>
                </ol>
              </div>

              <button
                onClick={() => setEnviado(false)}
                className="w-full bg-white bg-opacity-20 text-white py-3 rounded-xl font-bold hover:bg-opacity-30 transition-all border-2 border-white/30"
              >
                Enviar novamente
              </button>
            </div>
          )}

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
              Lembrou a senha?{' '}
              <Link href="/login" className="text-yellow-300 hover:text-yellow-200 font-black underline decoration-2 underline-offset-4 hover:underline-offset-2 transition-all">
                Fazer login →
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-cyan-200 hover:text-white font-bold text-lg backdrop-blur-sm bg-white/10 px-6 py-3 rounded-xl border-2 border-white/30 inline-flex items-center gap-2 hover:bg-white/20 transition-all transform hover:scale-105 shadow-lg">
            <ArrowLeft size={20} />
            Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}



