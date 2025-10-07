// src/screens/CategoriesScreen.js
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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

export default function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setCategories(data);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erro', 'Por favor, digite um nome para a categoria');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: newCategoryType,
        });

      if (error) throw error;

      setNewCategoryName('');
      loadCategories();
      Alert.alert('Sucesso', 'Categoria adicionada com sucesso!');
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar a categoria');
      console.error(error);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta categoria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', categoryId);

            if (error) {
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            } else {
              loadCategories();
            }
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }) => (
    <View style={[
      styles.categoryCard,
      { borderLeftColor: item.type === 'income' ? '#34C759' : '#FF3B30' }
    ]}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={[
          styles.categoryType,
          { color: item.type === 'income' ? '#34C759' : '#FF3B30' }
        ]}>
          {item.type === 'income' ? 'Receita' : 'Despesa'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCategory(item.id)}
      >
        <Text style={styles.deleteButtonText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.sectionTitle}>Adicionar Nova Categoria</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nome da categoria"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              newCategoryType === 'expense' && styles.typeButtonSelected,
            ]}
            onPress={() => setNewCategoryType('expense')}
          >
            <Text style={[
              styles.typeButtonText,
              newCategoryType === 'expense' && styles.typeButtonTextSelected,
            ]}>
              Despesa
            </Text>
          </TouchableOpacity>

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
        
        {categories.length === 0 ? (
          <Text style={styles.noCategoriesText}>
            Nenhuma categoria cadastrada
          </Text>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
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
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
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
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 5,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  categoryInfo: {
    flex: 1,
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