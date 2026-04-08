import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, Package } from 'lucide-react';
import { motion } from 'motion/react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });

        if (error) throw error;

        if (data.session) {
          alert('Conta criada com sucesso!');
        } else {
          alert('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        }

        setIsSignUp(false);
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 bg-brand-yellow text-brand-dark text-center">
          <div className="w-16 h-16 bg-brand-blue rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <Package size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FLUXBOX</h1>
          <p className="text-sm font-medium opacity-80">Controle de Almoxarifado Inteligente</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-100 italic">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : isSignUp ? (
                <UserPlus size={20} />
              ) : (
                <LogIn size={20} />
              )}
              {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-brand-blue font-bold hover:underline"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}