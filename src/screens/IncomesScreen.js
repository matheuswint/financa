// src/screens/IncomesScreen.js
// Tela para cadastrar uma nova receita.

import React, { useState, useEffect } from 'react';
import {
  View, // container básico que agrupa elementos
  Text, // componente de texto
  TextInput, // campo de texto editável
  TouchableOpacity, // botão que reage ao toque (opacidade)
  StyleSheet, // utilitário para criar estilos
  Alert, // mostra alertas nativos ao usuário
  ScrollView, // área rolável para toda a tela
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // seletor nativo de data
import { useAuth } from '../contexts/AuthContext'; // hook do contexto de autenticação (fornece user)
import { supabase } from '../config/supabase'; // cliente Supabase para ler/gravar no banco

// Componente principal exportado: recebe 'navigation' para navegar entre telas
export default function IncomesScreen({ navigation }) {
  // --- Estados locais (cada const cria uma "variável reativa" do componente) ---
  const [amount, setAmount] = useState(''); // valor digitado como string (ex: "1500.00")
  const [description, setDescription] = useState(''); // descrição da receita (texto)
  const [source, setSource] = useState(''); // fonte da receita (ex: "Salário")
  const [date, setDate] = useState(new Date()); // data selecionada (objeto Date)
  const [showDatePicker, setShowDatePicker] = useState(false); // controla visibilidade do DateTimePicker
  const [categories, setCategories] = useState([]); // lista de categorias/fonte carregadas do banco
  const [loading, setLoading] = useState(false); // indica se o envio está em andamento
  const { user } = useAuth(); // usuário autenticado (necessário para associar a receita ao user)

  // useEffect: executa quando o componente monta para carregar categorias uma vez
  useEffect(() => {
    loadCategories(); // busca categorias de receitas do Supabase
    // vazia -> roda só na montagem
  }, []);

  // loadCategories: busca categorias do tipo 'income' para este usuário
  const loadCategories = async () => {
    // Faz uma consulta simples na tabela 'categories'
    const { data, error } = await supabase
      .from('categories')
      .select('*') // seleciona todas as colunas
      .eq('user_id', user.id) // filtra somente categorias do usuário logado
      .eq('type', 'income'); // filtra apenas categorias de receita

    // Se a consulta funcionou sem erro, atualiza o estado com os dados retornados
    if (!error) {
      // data é um array de objetos: [{ id, user_id, name, type, created_at }, ...]
      setCategories(data);
    } else {
      // Em caso de erro, loga para depuração e deixa as categorias vazias
      console.error('Erro ao carregar categorias de receita:', error);
      setCategories([]); // fallback: lista vazia -> usuário pode digitar manualmente a fonte
    }
  };

  // handleSubmit: valida campos e insere a receita na tabela 'transactions'
  const handleSubmit = async () => {
    // Valida campos obrigatórios: amount, description e source (fonte)
    if (!amount || !description || !source) {
      Alert.alert('Erro', 'Por favor, preencha valor, descrição e fonte');
      return; // não prossegue se algo estiver vazio
    }

    // Converte o valor de string para número (float)
    // Usa parseFloat direto; em produção poderia tratar vírgula/locale antes
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      // Se não for número válido, mostra erro e não envia
      Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero');
      return;
    }

    // Indica que está carregando para evitar múltiplos envios
    setLoading(true);

    try {
      // Insere a nova transação no Supabase
      // A tabela 'transactions' deve ter colunas compatíveis: user_id, type, amount, description, category, date
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id, // associa ao usuário atual
          type: 'income', // marca como receita
          amount: parsedAmount, // valor numérico
          description: description, // descrição livre
          category: source, // usa "source" no campo category para manter consistência com demais transações
          date: date.toISOString().split('T')[0], // salva apenas a data no formato YYYY-MM-DD
        });

      // Se o Supabase retornou erro, lança para o catch
      if (error) throw error;

      // Sucesso: informa o usuário e volta para a tela anterior
      Alert.alert('Sucesso', 'Receita cadastrada com sucesso!');
      navigation.goBack();

    } catch (error) {
      // Erro genérico: mostra alerta e loga para depuração
      Alert.alert('Erro', 'Não foi possível cadastrar a receita');
      console.error('Erro ao inserir receita:', error);
    } finally {
      // Sempre desliga o indicador de loading
      setLoading(false);
    }
  };

  // Renderização da UI: formulário dentro de um ScrollView para caber em telas pequenas
  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho simples com título */}
      <View style={styles.header}>
        <Text style={styles.title}>Nova Receita</Text>
      </View>

      {/* Área do formulário com espaçamento */}
      <View style={styles.form}>
        {/* Campo valor: input numérico */}
        <TextInput
          style={styles.input}
          placeholder="Valor (R$)"
          value={amount} // valor controlado pelo estado
          onChangeText={setAmount} // atualiza o estado ao digitar
          keyboardType="numeric" // teclado numérico
        />

        {/* Campo descrição: texto livre */}
        <TextInput
          style={styles.input}
          placeholder="Descrição"
          value={description}
          onChangeText={setDescription}
        />

        {/* Campo fonte: texto livre (pode ser preenchido com sugestão abaixo) */}
        <TextInput
          style={styles.input}
          placeholder="Fonte (ex: Salário, Freelance)"
          value={source}
          onChangeText={setSource}
        />

        {/* Campo que abre o DatePicker: mostra a data atual formatada */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)} // abre o seletor de data
        >
          <Text style={styles.dateText}>
            Data: {date.toLocaleDateString('pt-BR')} {/* formata para pt-BR */}
          </Text>
        </TouchableOpacity>

        {/* DateTimePicker nativo: só renderiza quando showDatePicker = true */}
        {showDatePicker && (
          <DateTimePicker
            value={date} // valor atual
            mode="date" // apenas seleção de data
            display="default" // modo nativo
            onChange={(event, selectedDate) => {
              setShowDatePicker(false); // fecha o picker (seleção ou cancelamento)
              if (selectedDate) setDate(selectedDate); // atualiza apenas se usuário escolheu uma data
            }}
          />
        )}

        {/* Seção de categorias/fonte sugeridas: rolagem horizontal */}
        <View style={styles.categoryContainer}>
          <Text style={styles.label}>Fontes Sugeridas:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id} // chave única para cada item
                style={styles.categoryButton}
                onPress={() => setSource(cat.name)} // ao tocar, preenche o campo 'source'
              >
                <Text style={styles.categoryText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Botão de envio: fica desabilitado enquanto loading for true */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Cadastrando...' : 'Cadastrar Receita'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Estilos: descrevem a aparência dos componentes acima
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a tela
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60, // espaço para status bar / notch
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryText: {
    color: '#333',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#34C759', // verde para indicar ação positiva
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc', // cor quando desabilitado
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
