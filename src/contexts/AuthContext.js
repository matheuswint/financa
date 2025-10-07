// src/contexts/AuthContext.js - VERSÃO CORRIGIDA
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // FUNÇÃO PARA CRIAR CATEGORIAS PADRÃO
  const createDefaultCategories = async (userId) => {
    try {
      console.log('Criando categorias padrão para usuário:', userId);
      
      const defaultCategories = [
        // Despesas
        { name: 'Alimentação', type: 'expense' },
        { name: 'Transporte', type: 'expense' },
        { name: 'Moradia', type: 'expense' },
        { name: 'Saúde', type: 'expense' },
        { name: 'Educação', type: 'expense' },
        { name: 'Lazer', type: 'expense' },
        { name: 'Compras', type: 'expense' },
        { name: 'Outros', type: 'expense' },
        
        // Receitas
        { name: 'Salário', type: 'income' },
        { name: 'Freelance', type: 'income' },
        { name: 'Investimentos', type: 'income' },
        { name: 'Presentes', type: 'income' },
        { name: 'Outros', type: 'income' },
      ];

      // Inserir todas as categorias de uma vez
      const { error } = await supabase
        .from('categories')
        .insert(
          defaultCategories.map(category => ({
            user_id: userId,
            name: category.name,
            type: category.type,
          }))
        );

      if (error) {
        console.error('Erro ao criar categorias padrão:', error);
      } else {
        console.log('Categorias padrão criadas com sucesso!');
      }
    } catch (error) {
      console.error('Erro na criação de categorias padrão:', error);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de auth:', event);
        
        // SE FOR UM NOVO CADASTRO, CRIAR CATEGORIAS PADRÃO
        if (event === 'SIGNED_IN' && session?.user) {
          // Verificar se é um novo usuário (cadastro recente)
          const userCreatedTime = new Date(session.user.created_at);
          const now = new Date();
          const diffMinutes = (now - userCreatedTime) / (1000 * 60);
          
          // Se o usuário foi criado há menos de 5 minutos, considera como novo
          if (diffMinutes < 5) {
            console.log('Novo usuário detectado, criando categorias padrão...');
            await createDefaultCategories(session.user.id);
          }
        }
        
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      // CRIAR CATEGORIAS PADRÃO APÓS CADASTRO BEM-SUCEDIDO
      if (data.user && !error) {
        console.log('Usuário cadastrado, criando categorias padrão...');
        await createDefaultCategories(data.user.id);
      }

      return { data, error };
    } catch (error) {
      console.error('Erro no signUp:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      console.error('Erro no signIn:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Erro no signOut:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO PARA FORÇAR CRIAÇÃO DE CATEGORIAS (para usuários existentes)
  const createCategoriesForExistingUser = async () => {
    if (user) {
      await createDefaultCategories(user.id);
    }
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    loading,
    createCategoriesForExistingUser, // Exporta a função para uso externo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};