/*
  Arquivo: src/screens/LoginScreen.js
  Objetivo: Tela de login do app. Aqui o usuário informa email e senha.
*/

import React, { useState } from 'react';
import {
  View,                 // elemento container, equivalente a <div> no web
  Text,                 // exibe texto na tela
  TextInput,            // campo editável para o usuário digitar
  TouchableOpacity,     // botão que responde ao toque (muda opacidade)
  StyleSheet,           // cria objeto de estilos similar a CSS
  Alert,                // mostra alertas nativos (popups simples)
  KeyboardAvoidingView, // evita que o teclado cubra os inputs (iOS/Android)
  Platform,             // detecta plataforma (iOS/Android) para comportamentos condicionais
  ScrollView,           // permite rolar o conteúdo quando necessário
} from 'react-native';
import { useAuth } from '../contexts/AuthContext'; // hook do contexto de autenticação

// Componente padrão exportado: recebe 'navigation' para navegar entre telas
export default function LoginScreen({ navigation }) {
  // ----- Estados locais (variáveis reativas) -----
  const [email, setEmail] = useState('');       // guarda o email digitado pelo usuário
  const [password, setPassword] = useState(''); // guarda a senha digitada
  const [loading, setLoading] = useState(false); // indica se a requisição de login está em andamento

  // Pega a função signIn do contexto de autenticação (implementada em AuthContext)
  // signIn geralmente faz a chamada ao backend/supabase e retorna { error } ou usuário
  const { signIn } = useAuth();

  // Função chamada ao pressionar o botão "Entrar"
  const handleLogin = async () => {
    // Validação simples: verifica se ambos os campos foram preenchidos
    if (!email || !password) {
      // Mostra um alerta nativo informando para preencher os campos
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return; // interrompe execução se estiver faltando algo
    }

    // Sinaliza que a operação começou (desabilita o botão)
    setLoading(true);

    // Chama signIn com email e senha e aguarda a resposta
    // signIn deve retornar um objeto com possivelmente a propriedade 'error'
    const { error } = await signIn(email, password);
    
    // Se o backend retornou erro, mostra mensagem para o usuário
    if (error) {
      // Exibe o texto do erro (se disponível) ou uma mensagem genérica
      Alert.alert('Erro', error.message || 'Erro ao efetuar login');
    } else {
      // Se não houve erro, navega para a tela principal do app (Dashboard)
      // navigation.navigate('Dashboard') assume que existe rota chamada 'Dashboard'
      navigation.navigate('Dashboard');
    }

    // Finaliza o estado de loading independentemente do resultado
    setLoading(false);
  };

  // JSX: estrutura visual da tela de login
  // - KeyboardAvoidingView evita que o teclado cubra os inputs
  // - ScrollView garante que em telas pequenas o conteúdo possa rolar
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // padding para iOS, height para Android
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Cabeçalho com título e subtítulo */}
        <View style={styles.header}>
          <Text style={styles.title}>Controle Financeiro</Text>
          <Text style={styles.subtitle}>Faça login na sua conta</Text>
        </View>

        {/* Área do formulário contendo inputs e botões */}
        <View style={styles.form}>
          {/* Campo de email:
              - keyboardType sugere teclado especializado para emails
              - autoCapitalize="none" evita capitalização automática no início
          */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}               // valor controlado pelo estado
            onChangeText={setEmail}     // atualiza o estado quando o usuário digita
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {/* Campo de senha:
              - secureTextEntry oculta o texto digitado (pontos)
          */}
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Botão de login:
              - mostra texto "Entrando..." enquanto loading for true
              - disabled impede múltiplos envios durante loading
          */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          {/* Link para tela de cadastro:
              - navega para a rota 'Register' ao ser pressionado
          */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Não tem uma conta? Cadastre-se
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ----- Estilos (organizam aparência visual) -----
// Cada chave do objeto styles é usada acima por style={styles.nome}
const styles = StyleSheet.create({
  container: {
    flex: 1,                 // ocupa toda a área disponível da tela
    backgroundColor: '#f5f5f5', // cor de fundo leve
  },
  scrollContainer: {
    flexGrow: 1,             // permite que o ScrollView expanda até preencher verticalmente
    justifyContent: 'center',// centraliza verticalmente o conteúdo
    padding: 20,             // espaçamento interno em volta
  },
  header: {
    alignItems: 'center',    // centraliza horizontalmente o título/subtítulo
    marginBottom: 40,        // espaço abaixo do cabeçalho
  },
  title: {
    fontSize: 28,            // tamanho maior para o título
    fontWeight: 'bold',      // negrito
    color: '#333',           // cor do texto
    marginBottom: 8,         // pequeno espaço entre título e subtítulo
  },
  subtitle: {
    fontSize: 16,
    color: '#666',           // cor secundária mais clara
  },
  form: {
    width: '100%',           // ocupa toda a largura disponível
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,        // cantos arredondados
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',     // borda sutil
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF', // azul padrão para ação principal
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc', // cor quando o botão está desabilitado
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
