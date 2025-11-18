// src/screens/RegisterScreen.js
// Arquivo: tela de cadastro de usuário.

import React, { useState } from 'react'; // importa React e hook useState para estado local
import {
  View,                 // container básico (equivalente a <div> no web)
  Text,                 // componente para exibir texto
  TextInput,            // campo editável para entrada de texto
  TouchableOpacity,     // botão que responde ao toque (diminui opacidade quando clicado)
  StyleSheet,           // utilitário para criar estilos semelhantes a CSS
  Alert,                // mostra alertas nativos (popups simples)
  KeyboardAvoidingView, // evita que o teclado cubra os inputs em iOS/Android
  Platform,             // detecta plataforma (iOS/Android) para comportamento condicional
  ScrollView,           // permite rolar o conteúdo da tela se necessário
} from 'react-native';
import { useAuth } from '../contexts/AuthContext'; // hook do contexto de autenticação (fornece signUp e possivelmente user)

// Componente padrão exportado: tela de registro de conta
export default function RegisterScreen({ navigation }) {
  // Estados locais: guardam valores dos inputs e indicador de carregamento
  const [email, setEmail] = useState(''); // guarda o email digitado pelo usuário
  const [password, setPassword] = useState(''); // guarda a senha digitada
  const [confirmPassword, setConfirmPassword] = useState(''); // guarda a confirmação de senha
  const [loading, setLoading] = useState(false); // indica quando uma requisição está em andamento

  // Pega a função signUp do contexto de autenticação
  // signUp geralmente faz a chamada ao backend/supabase para criar a conta
  const { signUp } = useAuth();

  // Função chamada quando o usuário pressiona o botão "Cadastrar"
  const handleRegister = async () => {
    // Validação 1: garante que todos os campos foram preenchidos
    if (!email || !password || !confirmPassword) {
      // Se algum estiver vazio, mostra um alerta e sai da função
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    // Validação 2: verifica se senha e confirmação são iguais
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    // Validação 3: garante senha com tamanho mínimo (melhora segurança)
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Se passou nas validações, inicia indicador de carregamento
    setLoading(true);

    // Chama a função signUp do contexto passando email e senha
    // Retorna um objeto possivelmente com propriedade 'error'
    const { error } = await signUp(email, password);

    // Se houve erro na criação da conta, exibe mensagem ao usuário
    if (error) {
      // Mostra a mensagem de erro retornada (se houver) ou uma genérica
      Alert.alert('Erro', error.message || 'Não foi possível criar a conta');
    } else {
      // Se registro foi bem-sucedido, informa o usuário e navega para Login
      Alert.alert('Sucesso', 'Conta criada com sucesso! Faça login.');
      navigation.navigate('Login'); // navega para a tela de login
    }

    // Sempre desliga o indicador de carregamento ao finalizar
    setLoading(false);
  };

  // JSX: estrutura visual da tela
  // KeyboardAvoidingView evita que o teclado cubra os inputs (comportamento diferente por plataforma)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 'padding' no iOS, 'height' no Android
    >
      {/* ScrollView com contentContainerStyle para centralizar conteúdo em telas pequenas */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Cabeçalho: título e subtítulo */}
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para começar</Text>
        </View>

        {/* Formulário: inputs e botões */}
        <View style={styles.form}>
          {/* Input de Email:
              - value é controlado pelo estado `email`
              - onChangeText atualiza o estado a cada digitação
              - keyboardType="email-address" sugere teclado apropriado
              - autoCapitalize="none" evita capitalização automática */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {/* Input de Senha:
              - secureTextEntry oculta o texto (mostra pontos) */}
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Input de Confirmar Senha */}
          <TextInput
            style={styles.input}
            placeholder="Confirmar Senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {/* Botão de envio:
              - style muda quando loading for true para indicar desabilitado
              - disabled impede múltiplos envios enquanto requisição está em andamento */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {/* Texto do botão muda dependendo do estado de carregamento */}
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Text>
          </TouchableOpacity>

          {/* Link para voltar à tela de Login:
              - navigation.navigate('Login') assume que existe rota chamada 'Login' */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Já tem uma conta? Faça login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos: definem aparência visual dos componentes acima
// Cada chave é referenciada via styles.nome nos componentes JSX
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a área da tela
    backgroundColor: '#f5f5f5', // cor de fundo suave
  },
  scrollContainer: {
    flexGrow: 1, // permite que o ScrollView cresça para centralizar o conteúdo
    justifyContent: 'center', // centraliza verticalmente
    padding: 20, // espaçamento interno
  },
  header: {
    alignItems: 'center', // centraliza horizontalmente título/subtítulo
    marginBottom: 40, // espaço abaixo do cabeçalho
  },
  title: {
    fontSize: 28, // tamanho maior para o título
    fontWeight: 'bold', // negrito
    color: '#333',
    marginBottom: 8, // pequeno espaço entre título e subtítulo
  },
  subtitle: {
    fontSize: 16,
    color: '#666', // cor secundária
  },
  form: {
    width: '100%', // ocupa toda a largura disponível
  },
  input: {
    backgroundColor: 'white', // fundo branco para o input
    padding: 15, // espaçamento interno
    borderRadius: 10, // cantos arredondados
    marginBottom: 15, // espaço entre inputs
    borderWidth: 1, // borda sutil
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#34C759', // verde para ação positiva
    padding: 15,
    borderRadius: 10,
    alignItems: 'center', // centraliza texto do botão
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc', // cor quando desabilitado
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center', // centraliza o link abaixo do botão
  },
  linkText: {
    color: '#007AFF', // azul para indicar ação de navegação
    fontSize: 14,
  },
});
