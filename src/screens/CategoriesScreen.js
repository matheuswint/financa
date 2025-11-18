// Arquivo: src/screens/CategoriesScreen.js
// Este componente exibe e gerencia as categorias do usuário (adicionar, listar, excluir).

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext'; // Hook que fornece o usuário autenticado
import { supabase } from '../config/supabase'; // Cliente supabase para acessar o banco

export default function CategoriesScreen({ navigation }) {
  // Estado local:
  const [categories, setCategories] = useState([]); // lista de categorias carregadas do banco
  const [newCategoryName, setNewCategoryName] = useState(''); // nome digitado para nova categoria
  const [newCategoryType, setNewCategoryType] = useState('expense'); // tipo selecionado: 'expense' ou 'income'
  const [loading, setLoading] = useState(false); // indicador de carregamento quando adiciona categoria
  const { user } = useAuth(); // usuário atual vindo do contexto de autenticação

  // useEffect executa uma vez ao montar o componente para carregar categorias iniciais
  useEffect(() => {
    loadCategories(); // chama função que busca as categorias no supabase
    // Dependências vazias => roda apenas na montagem
  }, []);

  // Função que busca as categorias do usuário no Supabase
  const loadCategories = async () => {
    // Faz uma consulta na tabela 'categories', filtrando pelo user_id do usuário atual
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }); // ordena do mais recente para o mais antigo

    // Se não houve erro, atualiza o estado com os dados retornados
    if (!error) {
      setCategories(data);
    }
    // Se houver erro, opcionalmente poderíamos tratar/mostrar uma mensagem. Aqui apenas não atualiza.
  };

  // Função chamada ao clicar em "Adicionar Categoria"
  const handleAddCategory = async () => {
    // Validação simples: não permite nome vazio ou só espaços
    if (!newCategoryName.trim()) {
      Alert.alert('Erro', 'Por favor, digite um nome para a categoria');
      return; // sai da função se inválido
    }

    setLoading(true); // ativa indicador de carregamento (desabilita botão)
    try {
      // Insere a nova categoria na tabela 'categories'
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id, // associa a categoria ao usuário atual
          name: newCategoryName.trim(), // usa o nome limpo
          type: newCategoryType, // tipo: 'expense' ou 'income'
        });

      if (error) throw error; // lança para cair no catch e mostrar erro

      // Se inseriu com sucesso, limpa o campo, recarrega a lista e mostra alerta de sucesso
      setNewCategoryName('');
      loadCategories(); // recarrega as categorias para refletir a nova
      Alert.alert('Sucesso', 'Categoria adicionada com sucesso!');
      
    } catch (error) {
      // Em caso de erro na inserção, mostra alerta e loga no console para debug
      Alert.alert('Erro', 'Não foi possível adicionar a categoria');
      console.error(error);
    }
    setLoading(false); // desativa indicador de carregamento
  };

  // Função para excluir uma categoria (recebe o id da categoria)
  const handleDeleteCategory = async (categoryId) => {
    // Mostra uma confirmação antes de excluir para evitar exclusões acidentais
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta categoria?',
      [
        { text: 'Cancelar', style: 'cancel' }, // só fecha o alerta
        {
          text: 'Excluir',
          style: 'destructive',
          // Se usuário confirmar, executa a deleção no banco
          onPress: async () => {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', categoryId); // deleta pela coluna 'id'

            if (error) {
              // Se houve erro na exclusão, informa o usuário
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            } else {
              // Se deletou com sucesso, recarrega a lista
              loadCategories();
            }
          },
        },
      ]
    );
  };

  // Função que rendeiriza cada item da lista de categorias (usada pelo FlatList)
  const renderCategory = ({ item }) => (
    // card visual da categoria
    <View style={[
      styles.categoryCard,
      // borda colorida à esquerda: verde para receita, vermelho para despesa
      { borderLeftColor: item.type === 'income' ? '#34C759' : '#FF3B30' }
    ]}>
      <View style={styles.categoryInfo}>
        {/* Nome da categoria */}
        <Text style={styles.categoryName}>{item.name}</Text>
        {/* Texto que mostra se é Receita ou Despesa com cor condicional */}
        <Text style={[
          styles.categoryType,
          { color: item.type === 'income' ? '#34C759' : '#FF3B30' }
        ]}>
          {item.type === 'income' ? 'Receita' : 'Despesa'}
        </Text>
      </View>

      {/* Botão que exclui a categoria ao ser pressionado */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCategory(item.id)} // chama função de exclusão passando o id
      >
        <Text style={styles.deleteButtonText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  // JSX do componente: estrutura visual da tela
  return (
    <View style={styles.container}>
      {/* Cabeçalho com título */}
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
      </View>

      {/* ScrollView que contém o formulário e a lista de categorias */}
      <ScrollView style={styles.form}>
        <Text style={styles.sectionTitle}>Adicionar Nova Categoria</Text>
        
        {/* Campo de texto para o nome da nova categoria */}
        <TextInput
          style={styles.input}
          placeholder="Nome da categoria"
          value={newCategoryName} // valor controlado pelo estado
          onChangeText={setNewCategoryName} // atualiza o estado ao digitar
        />

        {/* Seletor de tipo: Despesa ou Receita */}
        <View style={styles.typeSelector}>
          {/* Botão para selecionar 'Despesa' */}
          <TouchableOpacity
            style={[
              styles.typeButton,
              newCategoryType === 'expense' && styles.typeButtonSelected, // estilo quando selecionado
            ]}
            onPress={() => setNewCategoryType('expense')} // altera o estado para 'expense'
          >
            <Text style={[
              styles.typeButtonText,
              newCategoryType === 'expense' && styles.typeButtonTextSelected,
            ]}>
              Despesa
            </Text>
          </TouchableOpacity>

          {/* Botão para selecionar 'Receita' */}
          <TouchableOpacity
            style={[
              styles.typeButton,
              newCategoryType === 'income' && styles.typeButtonSelected,
            ]}
            onPress={() => setNewCategoryType('income')}
          >
            <Text style={[
              styles.typeButtonText,
              newCategoryType === 'income' && styles.typeButtonTextSelected,
            ]}>
              Receita
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botão para adicionar a categoria.
            - Fica desabilitado enquanto 'loading' for true.
            - Mostra texto diferente durante o envio. */}
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddCategory}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? 'Adicionando...' : 'Adicionar Categoria'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Minhas Categorias</Text>
        
        {/* Se não houver categorias, mostra uma mensagem; senão, lista com FlatList */}
        {categories.length === 0 ? (
          <Text style={styles.noCategoriesText}>
            Nenhuma categoria cadastrada
          </Text>
        ) : (
          <FlatList
            data={categories} // array de categorias
            renderItem={renderCategory} // função que renderiza cada item
            keyExtractor={(item) => item.id} // chave única para cada item (id)
            scrollEnabled={false} // desabilita scroll interno porque já estamos em um ScrollView
          />
        )}
      </ScrollView>
    </View>
  );
}

// Estilos da tela usando StyleSheet do React Native
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a tela
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60, // espaço extra em cima para status bar / notch
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
  typeSelector: {
    flexDirection: 'row', // coloca os botões lado a lado
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 5,
  },
  typeButton: {
    flex: 1, // cada botão ocupa metade do espaço disponível
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF', // cor de fundo quando selecionado
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  typeButtonTextSelected: {
    color: 'white', // texto branco quando o botão está selecionado
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc', // cor de botão desabilitado
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row', // conteúdo em linha (texto + botão)
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4, // linha vertical na esquerda para indicar tipo
  },
  categoryInfo: {
    flex: 1, // ocupa o espaço restante, empurra o botão para a direita
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryType: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noCategoriesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});
