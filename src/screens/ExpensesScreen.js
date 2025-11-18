// Arquivo: src/screens/ExpensesScreen.js
// Tela para cadastrar uma nova despesa.

import React, { useState, useEffect } from 'react';
import {
  View, // container básico que empilha elementos (div equivalente)
  Text, // componente para exibir texto
  TextInput, // campo de entrada de texto
  TouchableOpacity, // botão que responde ao toque (muda opacidade)
  StyleSheet, // utilitário para criar estilos
  Alert, // para mostrar alertas nativos ao usuário
  ScrollView, // área rolável para o conteúdo da tela
  Image, // para exibir imagens (comprovante)
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // seletor nativo de data
import * as ImagePicker from 'expo-image-picker'; // utilitário expo para escolher/tirar fotos
import { useAuth } from '../contexts/AuthContext'; // hook do contexto de autenticação (pega user)
import { supabase } from '../config/supabase'; // cliente Supabase para acessar o banco

export default function ExpensesScreen({ navigation }) {
  // Estados (variáveis reativas do componente):
  const [amount, setAmount] = useState(''); // valor digitado (string) — formatado pelo usuário
  const [description, setDescription] = useState(''); // descrição da despesa
  const [category, setCategory] = useState(''); // categoria selecionada (nome)
  const [date, setDate] = useState(new Date()); // data da despesa (objeto Date)
  const [showDatePicker, setShowDatePicker] = useState(false); // controla se o DatePicker está visível
  const [receipt, setReceipt] = useState(null); // URI da imagem do comprovante (opcional)
  const [categories, setCategories] = useState([]); // lista de categorias carregadas do banco ou padrão
  const [loading, setLoading] = useState(false); // indica se o submit está em andamento (previne múltiplos envios)
  const { user } = useAuth(); // usuário autenticado (necessário para associar a transação ao user)

  // CATEGORIAS PADRÃO COMO FALLBACK: usadas se o usuário não tiver categorias no banco
  const defaultCategories = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde',
    'Educação', 'Lazer', 'Compras', 'Outros'
  ];

  // useEffect: carrega categorias assim que o componente monta
  useEffect(() => {
    loadCategories(); // busca categorias do Supabase (ou usa padrão)
    // [] -> roda somente na montagem
  }, []);

  // loadCategories: tenta carregar categorias do usuário no Supabase, com fallback para padrão
  const loadCategories = async () => {
    try {
      // consulta a tabela "categories" filtrando por user_id e tipo 'expense'
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense');

      if (error) {
        // se der erro, loga e usa categorias padrão
        console.log('Erro ao carregar categorias, usando padrão:', error);
        setCategories(defaultCategories.map(name => ({ id: name, name })));
      } else {
        // se não houver categorias no banco, também usa padrão
        if (!data || data.length === 0) {
          setCategories(defaultCategories.map(name => ({ id: name, name })));
        } else {
          // caso tenha categorias, usa os dados retornados (objeto com id, name, etc)
          setCategories(data);
        }
      }
    } catch (error) {
      // captura qualquer exceção inesperada e usa fallback
      console.log('Erro crítico, usando categorias padrão:', error);
      setCategories(defaultCategories.map(name => ({ id: name, name })));
    }
  };

  // pickImage: abre a galeria para o usuário escolher uma imagem
  const pickImage = async () => {
    // pede permissão para acessar a galeria (iOS/Android)
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      // avisa o usuário se a permissão for negada
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar comprovantes.');
      return;
    }

    // abre o seletor de imagens
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // só imagens
      allowsEditing: true, // permite cortar/editar levemente
      aspect: [4, 3], // proporção sugerida
      quality: 0.8, // qualidade da imagem (0-1)
    });

    // resultado tem .canceled (expo >= 46) e .assets com URIs
    if (!result.canceled) {
      // salva a URI do primeiro asset selecionado
      setReceipt(result.assets[0].uri);
    }
  };

  // takePhoto: abre a câmera para tirar uma foto e usar como comprovante
  const takePhoto = async () => {
    // pede permissão para usar a câmera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }

    // abre a câmera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceipt(result.assets[0].uri);
    }
  };

  // handleSubmit: valida os campos, converte valores e envia a transação para o Supabase
  const handleSubmit = async () => {
    // valida campos obrigatórios: amount, description e category
    if (!amount || !description || !category) {
      Alert.alert('Erro', 'Por favor, preencha valor, descrição e categoria');
      return;
    }

    // validação do valor: converte vírgula para ponto e transforma em float
    const amountValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero');
      return;
    }

    // marca que está carregando para desabilitar botão e evitar múltiplos envios
    setLoading(true);
    try {
      // insere a transação na tabela "transactions"
      // note: date é salvo como string "YYYY-MM-DD" (split remove hora/UTC)
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id, // associa ao usuário atual
          type: 'expense', // tipo fixo: despesa
          amount: amountValue, // valor numérico
          description, // texto descritivo
          category, // nome da categoria selecionada
          date: date.toISOString().split('T')[0], // salva data sem hora
          receipt_url: receipt, // apenas URI local por enquanto (sem upload)
        });

      if (error) throw error; // se o supabase retornar erro, vai para o catch

      // sucesso: avisa usuário e volta à tela anterior
      Alert.alert('Sucesso', 'Despesa cadastrada com sucesso!');
      navigation.goBack();
      
    } catch (error) {
      // mostra alerta genérico e loga o erro para debug
      Alert.alert('Erro', 'Não foi possível cadastrar a despesa');
      console.error(error);
    }
    // independentemente do resultado, desativa o loading
    setLoading(false);
  };

  // handleAmountChange: formata/filtra os caracteres aceitos no campo de valor
  const handleAmountChange = (text) => {
    // remove tudo que não for dígito, vírgula ou ponto
    const cleanedText = text.replace(/[^0-9,.]/g, '');
    // converte vírgula para ponto para facilitar parseFloat (mas guarda original para exibir)
    const formattedText = cleanedText.replace(',', '.');
    
    // permite string vazia para apagar e também apenas números válidos
    if (formattedText === '' || !isNaN(formattedText)) {
      setAmount(cleanedText); // guarda a versão com vírgula/ponto como o usuário digita
    }
  };

  // JSX: estrutura visual da tela (formulário)
  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho simples com título */}
      <View style={styles.header}>
        <Text style={styles.title}>Nova Despesa</Text>
      </View>

      {/* Formulário: campos de valor, descrição, data, categoria, comprovante e botão */}
      <View style={styles.form}>
        {/* Campo de valor: mostra teclado numérico decimal */}
        <TextInput
          style={styles.input}
          placeholder="Valor (R$)"
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
        />

        {/* Campo de descrição */}
        <TextInput
          style={styles.input}
          placeholder="Descrição"
          value={description}
          onChangeText={setDescription}
        />

        {/* Botão que abre o DatePicker (renderizado abaixo quando showDatePicker true) */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            Data: {date.toLocaleDateString('pt-BR')}
          </Text>
        </TouchableOpacity>

        {/* DateTimePicker nativo: só aparece quando showDatePicker é true */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false); // fecha o picker após seleção/cancelamento
              if (selectedDate) setDate(selectedDate); // atualiza a data se houver seleção
            }}
          />
        )}

        {/* SEÇÃO DE CATEGORIAS - renderiza opções horizontais */}
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
            {/* Mapeia as categorias e cria botões; usa cat.id ou cat.name como key */}
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[
                  styles.categoryButton,
                  category === cat.name && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(cat.name)} // ao tocar, marca a categoria selecionada
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

          {/* Mostra a categoria atualmente selecionada (ou aviso se nenhuma) */}
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
          
          {/* Se já existe um receipt (URI), mostra a imagem */}
          {receipt && (
            <Image source={{ uri: receipt }} style={styles.receiptImage} />
          )}
          
          {/* Botões para abrir galeria, câmera e remover comprovante */}
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
                onPress={() => setReceipt(null)} // remove a URI do comprovante
              >
                <Text style={styles.receiptButtonText}>❌ Remover</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Botão de envio: desabilitado enquanto 'loading' for true */}
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

// Estilos: descrevem aparência dos componentes acima
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a tela
    backgroundColor: '#f5f5f5',
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
    flexDirection: 'row', // organiza botões em linha
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
