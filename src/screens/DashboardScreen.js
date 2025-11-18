// src/screens/DashboardScreen.js
// Esta tela mostra um resumo (dashboard) das finanças do usuário:
// - Saldo atual (receitas - despesas)
// - Gráfico mensal de receitas vs despesas
// - Destaques (maior despesa, categoria mais usada)
// - Menu rápido para navegar para outras telas

import React, { useState, useEffect } from 'react';
import {
  View, // container básico para agrupar elementos visuais
  Text, // componente para texto
  StyleSheet, // cria estilos para os componentes
  ScrollView, // área rolável para todo o conteúdo da tela
  TouchableOpacity, // botão touch que altera opacidade ao pressionar
  Alert, // exibe alertas nativos ao usuário
  RefreshControl, // componente para pull-to-refresh em ScrollView
} from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native'; // biblioteca de gráficos
import { useAuth } from '../contexts/AuthContext'; // hook para obter usuário autenticado e logout
import { supabase } from '../config/supabase'; // cliente Supabase para acessar o banco de dados

export default function DashboardScreen({ navigation }) {
  // Estados locais:
  const [balance, setBalance] = useState(0); // saldo calculado (receitas - despesas)
  const [chartData, setChartData] = useState([]); // dados formatados para o gráfico
  const [highlights, setHighlights] = useState({}); // objeto com destaques (maior despesa, categoria mais usada)
  const [refreshing, setRefreshing] = useState(false); // indica se o pull-to-refresh está ativo
  const { user, signOut } = useAuth(); // pega o usuário atual e a função de logout do contexto

  // Função principal que carrega todos os dados do dashboard
  const loadDashboardData = async () => {
    try {
      // 1) Buscar transações do usuário no Supabase
      // - Seleciona todas as colunas ('*')
      // - Filtra pelo user_id do usuário autenticado
      // - Ordena pela data (mais recente primeiro)
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error; // se ocorrer erro na consulta, joga para o catch

      // 2) Calcular saldo: soma de receitas menos soma de despesas
      // - Filtra transações por tipo e soma os valores (amount)
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Define o saldo no estado (usado para exibir na UI)
      setBalance(totalIncome - totalExpenses);

      // 3) Preparar dados para o gráfico (por mês)
      const monthlyData = processMonthlyData(transactions);
      setChartData(monthlyData);

      // 4) Calcular destaques (maior despesa e categoria mais usada)
      const highlightsData = calculateHighlights(transactions);
      setHighlights(highlightsData);

    } catch (error) {
      // Se qualquer etapa acima falhar, mostra um alerta simples e loga para debug
      Alert.alert('Erro', 'Erro ao carregar dados do dashboard');
      console.error(error);
    }
  };

  // processMonthlyData transforma a lista de transações em dados agregados por mês
  // - Recebe array de transações
  // - Agrupa por "YYYY-M" e soma receitas e despesas separadamente
  // - Retorna um array com objetos: { month: 'YYYY-M', income: X, expenses: Y }
  const processMonthlyData = (transactions) => {
    const months = {}; // mapa temporário { '2025-11': { income: 0, expenses: 0 }, ... }
    
    transactions.forEach(transaction => {
      // Garante que a data seja um objeto Date (assume que transaction.date é compatível)
      const date = new Date(transaction.date);
      // Cria uma chave de mês no formato "YYYY-M" (mês começa em 1)
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      // Se o mês ainda não existe no mapa, inicializa com zeros
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expenses: 0 };
      }
      
      // Soma o valor na propriedade correta (income ou expenses) conforme o tipo
      if (transaction.type === 'income') {
        months[monthKey].income += transaction.amount;
      } else {
        months[monthKey].expenses += transaction.amount;
      }
    });

    // Converte o mapa em um array no formato esperado pelo Victory
    return Object.keys(months).map(key => ({
      month: key,
      income: months[key].income,
      expenses: months[key].expenses,
    }));
  };

  // calculateHighlights calcula:
  // - maior despesa (objeto da transação) ou null se não houver despesas
  // - categoria mais usada (string) ou 'Nenhuma' se não houver transações
  const calculateHighlights = (transactions) => {
    // 1) Maior despesa: filtra apenas despesas e encontra a de maior amount
    const expenses = transactions.filter(t => t.type === 'expense');
    const highestExpense = expenses.length > 0 
      ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0])
      : null; // null quando não há despesas

    // 2) Categoria mais usada (contagem simples por nome da categoria)
    const categoryCount = {};
    transactions.forEach(t => {
      // Se transaction.category existir, incrementa o contador; senão, ainda inclui (undefined é tratado)
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });

    // Se existirem categorias, pega a que tem maior contador; senão retorna 'Nenhuma'
    const mostUsedCategory = Object.keys(categoryCount).length > 0
      ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
      : 'Nenhuma';

    // Retorna um objeto com os dois destaques
    return {
      highestExpense,
      mostUsedCategory,
    };
  };

  // Função chamada ao realizar pull-to-refresh:
  // - ativa o estado de refreshing, recarrega os dados e desativa
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // useEffect para carregar os dados quando o componente monta (apenas uma vez)
  useEffect(() => {
    loadDashboardData();
    // Dependência vazia => executa apenas na montagem do componente
  }, []);

  // Função para deslogar o usuário:
  // - chama signOut do contexto e navega para a tela de Login
  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  // JSX: estrutura visual da tela
  // - Header com título e botão de sair
  // - ScrollView com pull-to-refresh contendo:
  //   - Cartão do saldo
  //   - Cartão do gráfico (VictoryChart)
  //   - Cartão de destaques
  //   - Grid de atalhos de navegação
  return (
    <View style={styles.container}>
      {/* Cabeçalho: título e botão de sair */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* ScrollView que permite rolar todo o conteúdo e usar pull-to-refresh */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Saldo Atual: mostra "Saldo Atual" e o valor formatado */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Atual</Text>
          <Text style={[
            styles.balanceValue,
            // cor verde se saldo positivo, vermelha se negativo
            { color: balance >= 0 ? '#34C759' : '#FF3B30' }
          ]}>
            R$ {balance.toFixed(2)} {/* toFixed(2) formata com duas casas decimais */}
          </Text>
        </View>

        {/* Gráfico: receitas vs despesas por mês */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Receitas vs Despesas</Text>
          {chartData.length > 0 ? (
            // Se houver dados, renderiza o gráfico Victory
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
            >
              <VictoryAxis /> {/* eixo X (categorias/mês) */}
              <VictoryAxis dependentAxis /> {/* eixo Y (valores) */}
              <VictoryBar
                data={chartData}
                x="month" // usa a propriedade 'month' como eixo X
                y="income" // primeira barra para receitas
                style={{ data: { fill: '#34C759' } }} // cor verde
              />
              <VictoryBar
                data={chartData}
                x="month"
                y="expenses" // segunda barra para despesas
                style={{ data: { fill: '#FF3B30' } }} // cor vermelha
              />
            </VictoryChart>
          ) : (
            // Sem dados, mostra texto informativo
            <Text style={styles.noDataText}>Nenhum dado disponível</Text>
          )}
        </View>

        {/* Destaques: maior despesa e categoria mais usada */}
        <View style={styles.highlightsCard}>
          <Text style={styles.cardTitle}>Destaques</Text>

          {/* Maior Despesa: se existir, mostra valor e descrição; senão, mensagem */}
          <View style={styles.highlightItem}>
            <Text style={styles.highlightLabel}>Maior Despesa:</Text>
            <Text style={styles.highlightValue}>
              {highlights.highestExpense 
                ? `R$ ${highlights.highestExpense.amount.toFixed(2)} - ${highlights.highestExpense.description}`
                : 'Nenhuma despesa'
              }
            </Text>
          </View>

          {/* Categoria Mais Usada: mostra a string calculada */}
          <View style={styles.highlightItem}>
            <Text style={styles.highlightLabel}>Categoria Mais Usada:</Text>
            <Text style={styles.highlightValue}>{highlights.mostUsedCategory}</Text>
          </View>
        </View>

        {/* Menu de navegação em grade com atalhos para outras telas */}
        <View style={styles.menuGrid}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Expenses')}
          >
            <Text style={styles.menuIcon}>💰</Text>
            <Text style={styles.menuText}>Despesas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Incomes')}
          >
            <Text style={styles.menuIcon}>💵</Text>
            <Text style={styles.menuText}>Receitas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Categories')}
          >
            <Text style={styles.menuIcon}>📂</Text>
            <Text style={styles.menuText}>Categorias</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Transactions')}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuText}>Transações</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Estilos: cada chave descreve o visual dos componentes acima
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a área disponível
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row', // alinha título e botão na mesma linha
    justifyContent: 'space-between', // espaça os itens nas extremidades
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // espaço superior para status bar / notch
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutText: {
    color: '#FF3B30', // vermelho para ação de sair
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center', // centraliza o conteúdo horizontalmente
    // sombra para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevação para Android
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    // sombreados iguais ao cartão de saldo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  highlightItem: {
    flexDirection: 'row', // label e valor na mesma linha
    justifyContent: 'space-between', // label à esquerda, valor à direita
    alignItems: 'center',
    marginBottom: 10,
  },
  highlightLabel: {
    fontSize: 14,
    color: '#666',
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  menuGrid: {
    flexDirection: 'row', // organiza os atalhos em linhas
    flexWrap: 'wrap', // permite quebra em múltiplas linhas
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%', // dois itens por linha (aprox.)
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});
