// src/screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

export default function DashboardScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const { user, signOut } = useAuth();

  const loadDashboardData = async () => {
    try {
      // Carregar transações do usuário
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Calcular saldo
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setBalance(totalIncome - totalExpenses);

      // Preparar dados para o gráfico
      const monthlyData = processMonthlyData(transactions);
      setChartData(monthlyData);

      // Calcular destaques
      const highlightsData = calculateHighlights(transactions);
      setHighlights(highlightsData);

    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar dados do dashboard');
      console.error(error);
    }
  };

  const processMonthlyData = (transactions) => {
    const months = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        months[monthKey].income += transaction.amount;
      } else {
        months[monthKey].expenses += transaction.amount;
      }
    });

    return Object.keys(months).map(key => ({
      month: key,
      income: months[key].income,
      expenses: months[key].expenses,
    }));
  };

  const calculateHighlights = (transactions) => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const highestExpense = expenses.length > 0 
      ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0])
      : null;

    // Calcular categoria mais usada
    const categoryCount = {};
    transactions.forEach(t => {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });

    const mostUsedCategory = Object.keys(categoryCount).length > 0
      ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
      : 'Nenhuma';

    return {
      highestExpense,
      mostUsedCategory,
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Saldo Atual */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Atual</Text>
          <Text style={[
            styles.balanceValue,
            { color: balance >= 0 ? '#34C759' : '#FF3B30' }
          ]}>
            R$ {balance.toFixed(2)}
          </Text>
        </View>

        {/* Gráfico */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Receitas vs Despesas</Text>
          {chartData.length > 0 ? (
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryBar
                data={chartData}
                x="month"
                y="income"
                style={{ data: { fill: '#34C759' } }}
              />
              <VictoryBar
                data={chartData}
                x="month"
                y="expenses"
                style={{ data: { fill: '#FF3B30' } }}
              />
            </VictoryChart>
          ) : (
            <Text style={styles.noDataText}>Nenhum dado disponível</Text>
          )}
        </View>

        {/* Destaques */}
        <View style={styles.highlightsCard}>
          <Text style={styles.cardTitle}>Destaques</Text>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightLabel}>Maior Despesa:</Text>
            <Text style={styles.highlightValue}>
              {highlights.highestExpense 
                ? `R$ ${highlights.highestExpense.amount.toFixed(2)} - ${highlights.highestExpense.description}`
                : 'Nenhuma despesa'
              }
            </Text>
          </View>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightLabel}>Categoria Mais Usada:</Text>
            <Text style={styles.highlightValue}>{highlights.mostUsedCategory}</Text>
          </View>
        </View>

        {/* Menu de Navegação */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
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