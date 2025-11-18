// src/contexts/AuthContext.js - contexto de autenticação do app
// Este arquivo cria um contexto React que centraliza o login, logout, cadastro
// e informações do usuário.

import React, { createContext, useState, useContext, useEffect } from 'react';
// supabase é o cliente que comunica com o backend (autenticação + banco)
import { supabase } from '../config/supabase';

// Cria o contexto vazio que será usado por useAuth() nos componentes
const AuthContext = createContext({});

// Hook customizado para facilitar o uso do contexto em outros arquivos:
// basta chamar: const { user, signIn, signUp, signOut } = useAuth();
export const useAuth = () => useContext(AuthContext);

// Provider que envolve a aplicação e fornece os dados/funcões de auth
export const AuthProvider = ({ children }) => {
  // Estado que guarda o usuário atual (objeto retornado pelo Supabase) ou null
  const [user, setUser] = useState(null);
  // Estado que indica se uma operação de autenticação está em andamento
  const [loading, setLoading] = useState(true);

  // FUNÇÃO AUXILIAR: cria categorias padrão no banco para um user_id dado.
  // Usada quando um usuário novo se cadastra para já ter categorias iniciais.
  const createDefaultCategories = async (userId) => {
    try {
      // Log para ajudar no debug local
      console.log('Criando categorias padrão para usuário:', userId);

      // Lista de categorias padrão com o tipo (expense/income)
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

      // Insere todas as categorias de uma vez associando user_id a cada uma
      const { error } = await supabase
        .from('categories')
        .insert(
          defaultCategories.map(category => ({
            user_id: userId,        // coluna que associa categoria ao usuário
            name: category.name,    // nome da categoria
            type: category.type,    // 'expense' ou 'income'
          }))
        );

      // Se houve erro na inserção, loga; senão loga sucesso
      if (error) {
        console.error('Erro ao criar categorias padrão:', error);
      } else {
        console.log('Categorias padrão criadas com sucesso!');
      }
    } catch (error) {
      // Captura exceções inesperadas (problemas de rede, etc.)
      console.error('Erro na criação de categorias padrão:', error);
    }
  };

  // useEffect que inicializa o estado do usuário quando o Provider monta.
  // 1) Pega a sessão atual do supabase (se o usuário já estiver logado)
  // 2) Se inscreve em mudanças de autenticação (login/logout) para manter o estado sincronizado
  useEffect(() => {
    const getSession = async () => {
      // supabase.auth.getSession() retorna a sessão atual (se houver)
      const { data: { session } } = await supabase.auth.getSession();
      // Se existir sessão, session.user tem os dados do usuário; senão null
      setUser(session?.user ?? null);
      // Depois de checar a sessão, marca loading como false
      setLoading(false);
    };

    getSession();

    // Subscrição para ouvir eventos de autenticação (SIGNED_IN, SIGNED_OUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de auth:', event);

        // CASO ESPECIAL: quando usuário faz SIGNED_IN logo após cadastro,
        // queremos criar categorias padrão para usuários novos.
        if (event === 'SIGNED_IN' && session?.user) {
          // A API do Supabase retorna created_at no objeto do user.
          // Aqui verificamos se o usuário foi criado recentemente (ex: últimos 5 minutos)
          // para evitar recriar categorias em logins subsequentes.
          const userCreatedTime = new Date(session.user.created_at);
          const now = new Date();
          const diffMinutes = (now - userCreatedTime) / (1000 * 60);

          // Se o usuário foi criado há menos de 5 minutos, considera-se novo.
          if (diffMinutes < 5) {
            console.log('Novo usuário detectado, criando categorias padrão...');
            await createDefaultCategories(session.user.id);
          }
        }

        // Atualiza o estado do usuário para refletir a nova sessão/ausência dela
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup: ao desmontar o Provider, cancelamos a subscrição
    return () => subscription.unsubscribe();
  }, []);

  // FUNÇÃO PÚBLICA: signUp (cria uma conta nova)
  // Recebe email e password e chama supabase.auth.signUp
  const signUp = async (email, password) => {
    setLoading(true); // indica que operação começou
    try {
      // signUp cria o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      // Se cadastro ocorreu e retornou data.user, criamos categorias padrão
      // Esse passo garante que mesmo que o evento de auth não seja capturado
      // (por rede ou timing), ainda assim categorias sejam criadas.
      if (data.user && !error) {
        console.log('Usuário cadastrado, criando categorias padrão...');
        await createDefaultCategories(data.user.id);
      }

      // Retornamos tanto data quanto error para o chamador tratar a resposta
      return { data, error };
    } catch (error) {
      // Em caso de exceção, logamos e retornamos erro para o chamador
      console.error('Erro no signUp:', error);
      return { data: null, error };
    } finally {
      setLoading(false); // operação finalizada
    }
  };

  // FUNÇÃO PÚBLICA: signIn (login com email e senha)
  // Chama supabase.auth.signInWithPassword e retorna { data, error }
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

  // FUNÇÃO PÚBLICA: signOut (desloga o usuário)
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

  // FUNÇÃO ÚTIL: força criação de categorias padrão para usuários já existentes.
  // Pode ser chamada manualmente de alguma tela/admin caso um usuário antigo precise das categorias.
  const createCategoriesForExistingUser = async () => {
    if (user) {
      await createDefaultCategories(user.id);
    }
  };

  // Valor disponibilizado pelo contexto: expõe o usuário atual e as funções de auth
  const value = {
    user,
    signUp,
    signIn,
    signOut,
    loading,
    createCategoriesForExistingUser, // expõe função para uso externo se necessário
  };

  // Provider que envolve a aplicação e disponibiliza 'value' para todos os filhos
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
