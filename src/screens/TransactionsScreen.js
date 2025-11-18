// src/screens/TransactionsScreen.js
// Esta tela lista, filtra e permite excluir transações do usuário.

import React, { useState, useEffect } from 'react';
import {
  View,               // container básico (equivalente a <div> no web)
  Text,               // exibe texto na tela
  TouchableOpacity,   // botão que reage ao toque (mudança de opacidade)
  StyleSheet,         // cria objeto de estilos parecido com CSS
  FlatList,           // lista performática para muitos itens
  Alert,              // mostra alertas nativos de confirmação/erro
  RefreshControl,     // controle de pull-to-refresh usado dentro de FlatList/ScrollView
  TextInput,          // campo de busca/filtragem
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // componente nativo para escolher datas
import { useAuth } from '../contexts/AuthContext'; // hook que fornece o usuário autenticado
import { supabase } from '../config/supabase'; // cliente Supabase para acessar o banco de dados

// Componente principal exportado: recebe 'navigation' para navegar entre telas
export default function TransactionsScreen({ navigation }) {
  // --- Estados locais (variáveis reativas do componente) ---
  const [transactions, setTransactions] = useState([]); // todas as transações carregadas do banco
  const [filteredTransactions, setFilteredTransactions] = useState([]); // resultado após aplicar filtros
  const [refreshing, setRefreshing] = useState(false); // indica se o pull-to-refresh está ativo
  const [filterType, setFilterType] = useState('all'); // filtro por tipo: 'all' | 'income' | 'expense'
  const [filterCategory, setFilterCategory] = useState(''); // filtro por texto na categoria
  // startDate inicial é o primeiro dia do mês atual (útil como filtro padrão)
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date()); // endDate padrão = hoje
  const [showStartDatePicker, setShowStartDatePicker] = useState(false); // controla exibição do DatePicker de início
  const [showEndDatePicker, setShowEndDatePicker] = useState(false); // controla exibição do DatePicker de fim
  const [searchText, setSearchText] = useState(''); // texto de busca livre (descrição ou categoria)
  const { user } = useAuth(); // usuário autenticado vindo do contexto

  // --- useEffect: carrega transações quando o componente monta ---
  useEffect(() => {
    // Ao montar o componente, buscar as transações do usuário no banco
    loadTransactions();
    // [] -> executa apenas uma vez na montagem
  }, []);

  // --- useEffect: recalcula a lista filtrada sempre que dependências mudam ---
  useEffect(() => {
    // Sempre que transactions ou qualquer critério de filtro mudar, reaplica os filtros
    filterTransactions();
  }, [transactions, filterType, filterCategory, startDate, endDate, searchText]);

  // Função que carrega transações do Supabase para este usuário
  const loadTransactions = async () => {
    // Faz consulta na tabela "transactions" filtrando por user_id
    // Ordena por data decrescente para mostrar transações mais recentes primeiro
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (!error) {
      // Atualiza estado com as transações retornadas (array de objetos)
      setTransactions(data);
    } else {
      // Em caso de erro, logamos para depuração (poderia também mostrar alerta)
      console.error('Erro ao carregar transações:', error);
    }
  };

  // Função que aplica todos os filtros sobre a lista de transações
  const filterTransactions = () => {
    // Começa com a lista completa
    let filtered = transactions;

    // 1) Filtra por tipo se necessário (income/despesa)
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // 2) Filtra por categoria (se o usuário digitar algo em filterCategory)
    // - Usa includes para permitir busca parcial (case-insensitive)
    if (filterCategory) {
      filtered = filtered.filter(t => 
        (t.category || '').toLowerCase().includes(filterCategory.toLowerCase())
      );
    }

    // 3) Filtra por intervalo de datas (startDate <= t.date <= endDate)
    // - Converte a string t.date para Date para comparação segura
    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      // Normalmente queremos ignorar horário; aqui comparamos diretamente os objetos Date
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // 4) Filtra por texto de busca na descrição ou categoria
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }

    // Atualiza o estado com o resultado final
    setFilteredTransactions(filtered);
  };

  // Função chamada ao puxar para atualizar (pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);   // mostra indicador de refresh
    await loadTransactions(); // recarrega do banco
    setRefreshing(false);  // esconde indicador
  };

  // Exclui uma transação pedindo confirmação ao usuário
  const handleDeleteTransaction = async (transactionId) => {
    // Mostra um alert nativo com opções de cancelar/excluir
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' }, // apenas fecha o alerta
        {
          text: 'Excluir',
          style: 'destructive',
          // onPress será executado se o usuário confirmar exclusão
          onPress: async () => {
            // Chama Supabase para deletar pela coluna 'id'
            const { error } = await supabase
              .from('transactions')
              .delete()
              .eq('id', transactionId);

            if (error) {
              // Se houve erro ao excluir, informa o usuário
              Alert.alert('Erro', 'Não foi possível excluir a transação');
              console.error('Erro ao excluir transação:', error);
            } else {
              // Se sucesso, recarrega a lista para refletir a remoção
              loadTransactions();
            }
          },
        },
      ]
    );
  };

  // Função que renderiza cada item da lista (usada por FlatList)
  const renderTransaction = ({ item }) => (
    // Cada transação é exibida em um "card" com borda colorida conforme tipo
    <TouchableOpacity
      style={[
        styles.transactionCard,
        // Usa borda verde para receita (income) e vermelha para despesa (expense)
        { borderLeftColor: item.type === 'income' ? '#34C759' : '#FF3B30' }
      ]}
    >
      {/* Informação textual da transação (descrição, categoria, data) */}
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionCategory}>{item.category}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.date).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      
      {/* Valor e botão de excluir alinhados à direita */}
      <View style={styles.transactionAmountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'income' ? '#34C759' : '#FF3B30' }
        ]}>
          {/* Mostra + para receitas e - para despesas seguido do valor formatado */}
          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(item.id)} // chama exclusão com id
        >
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // --- JSX retornado pelo componente: estrutura da tela ---
  return (
    <View style={styles.container}>
      {/* Cabeçalho com título da tela */}
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
      </View>

      {/* Área de filtros: busca, tipo e intervalo de datas */}
      <View style={styles.filters}>
        {/* Campo de busca livre (descrição ou categoria) */}
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          value={searchText}        // valor controlado pelo estado
          onChangeText={setSearchText} // atualiza estado enquanto digita (debounce poderia ser adicionado)
        />

        {/* Linha de botões de filtro por tipo */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={styles.filterButtonText}>Todas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterType === 'income' && styles.filterButtonActive]}
            onPress={() => setFilterType('income')}
          >
            <Text style={styles.filterButtonText}>Receitas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterType === 'expense' && styles.filterButtonActive]}
            onPress={() => setFilterType('expense')}
          >
            <Text style={styles.filterButtonText}>Despesas</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros de data: mostra os intervalos e abre DatePicker ao tocar */}
        <View style={styles.dateFilters}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)} // abre seletor de data inicial
          >
            <Text style={styles.dateButtonText}>
              De: {startDate.toLocaleDateString('pt-BR')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)} // abre seletor de data final
          >
            <Text style={styles.dateButtonText}>
              Até: {endDate.toLocaleDateString('pt-BR')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DateTimePicker: aparece condicionalmente quando os estados correspondentes são true */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false); // fecha o picker (seja seleção ou cancelamento)
              if (selectedDate) setStartDate(selectedDate); // atualiza a data inicial se houver seleção
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false); // fecha o picker
              if (selectedDate) setEndDate(selectedDate); // atualiza a data final
            }}
          />
        )}
      </View>

      {/* FlatList exibe a lista filtrada de transações.
          - refreshControl permite pull-to-refresh para recarregar do servidor.
          - ListEmptyComponent mostra mensagem quando não há itens. */}
      <FlatList
        data={filteredTransactions} // array já filtrado
        renderItem={renderTransaction} // função que renderiza cada item
        keyExtractor={(item) => item.id} // chave única (deve ser string; ajustar se for number)
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhuma transação encontrada
          </Text>
        }
        contentContainerStyle={styles.listContent} // padding interno da lista
      />
    </View>
  );
}

// --- Estilos: descrevem aparência visual dos componentes acima ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // cor de fundo da tela
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60, // espaço superior para status bar / notch
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filters: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 1, // separador visual entre filtros e lista
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row', // organiza botões em linha
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterButton: {
    flex: 1, // cada botão tenta ocupar espaço igual
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF', // cor quando ativo
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  dateFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  dateButtonText: {
    fontSize: 12,
    color: '#333',
  },
  listContent: {
    padding: 15,
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row', // descrição à esquerda, valor à direita
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4, // linha lateral colorida indicando tipo
  },
  transactionInfo: {
    flex: 1, // ocupa o espaço disponível antes do valor
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end', // alinha valor e botão à direita
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 50,
  },
});
