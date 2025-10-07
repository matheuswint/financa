import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

export default function ExpensesScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // CATEGORIAS PADRÃO COMO FALLBACK
  const defaultCategories = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 
    'Educação', 'Lazer', 'Compras', 'Outros'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense');

      if (error) {
        console.log('Erro ao carregar categorias, usando padrão:', error);
        setCategories(defaultCategories.map(name => ({ id: name, name })));
      } else {
        // Se não há categorias, usa as padrão
        if (data.length === 0) {
          setCategories(defaultCategories.map(name => ({ id: name, name })));
        } else {
          setCategories(data);
        }
      }
    } catch (error) {
      console.log('Erro crítico, usando categorias padrão:', error);
      setCategories(defaultCategories.map(name => ({ id: name, name })));
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar comprovantes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceipt(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceipt(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !description || !category) {
      Alert.alert('Erro', 'Por favor, preencha valor, descrição e categoria');
      return;
    }

    // Validação do valor
    const amountValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'expense',
          amount: amountValue,
          description,
          category,
          date: date.toISOString().split('T')[0],
          receipt_url: receipt, // Por enquanto sem upload
        });

      if (error) throw error;

      Alert.alert('Sucesso', 'Despesa cadastrada com sucesso!');
      navigation.goBack();
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cadastrar a despesa');
      console.error(error);
    }
    setLoading(false);
  };

  // Função para formatar o valor
  const handleAmountChange = (text) => {
    const cleanedText = text.replace(/[^0-9,.]/g, '');
    const formattedText = cleanedText.replace(',', '.');
    
    if (formattedText === '' || !isNaN(formattedText)) {
      setAmount(cleanedText);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nova Despesa</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Valor (R$)"
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Descrição"
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            Data: {date.toLocaleDateString('pt-BR')}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* SEÇÃO DE CATEGORIAS - MELHORADA */}
        <View style={styles.categoryContainer}>
          <Text style={styles.label}>Categoria:</Text>
          <Text style={styles.subLabel}>
            {categories.length === 0 ? 'Carregando categorias...' : 'Selecione uma categoria:'}
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[
                  styles.categoryButton,
                  category === cat.name && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.name && styles.categoryTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Mostra a categoria selecionada */}
          {category ? (
            <Text style={styles.selectedCategory}>
              Categoria selecionada: <Text style={styles.selectedCategoryName}>{category}</Text>
            </Text>
          ) : (
            <Text style={styles.noCategorySelected}>
              Nenhuma categoria selecionada
            </Text>
          )}
        </View>

        {/* SEÇÃO DE COMPROVANTE (OPCIONAL) */}
        <View style={styles.receiptSection}>
          <Text style={styles.label}>Comprovante (opcional):</Text>
          
          {receipt && (
            <Image source={{ uri: receipt }} style={styles.receiptImage} />
          )}
          
          <View style={styles.receiptButtons}>
            <TouchableOpacity style={styles.receiptButton} onPress={pickImage}>
              <Text style={styles.receiptButtonText}>📁 Galeria</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.receiptButton} onPress={takePhoto}>
              <Text style={styles.receiptButtonText}>📷 Câmera</Text>
            </TouchableOpacity>
            
            {receipt && (
              <TouchableOpacity 
                style={[styles.receiptButton, styles.removeButton]}
                onPress={() => setReceipt(null)}
              >
                <Text style={styles.receiptButtonText}>❌ Remover</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Cadastrando...' : 'Cadastrar Despesa'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginBottom: 5,
    color: '#333',
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoriesScroll: {
    maxHeight: 60,
    marginBottom: 10,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: 'white',
  },
  selectedCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  selectedCategoryName: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noCategorySelected: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  receiptSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  receiptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});