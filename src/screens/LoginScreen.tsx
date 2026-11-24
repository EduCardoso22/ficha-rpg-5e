import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { resetPassword, signIn, signInAsGuest, signUp, traduzErroAuth } from '@/services/auth';

export default function LoginScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cadastro, setCadastro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const enviar = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await (cadastro ? signUp(email, senha) : signIn(email, senha));
      // O redirecionamento é feito pelo guard em _layout (Stack.Protected)
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      const textoErro =
        code === 'auth/user-not-found' || code === 'auth/invalid-credential'
          ? 'E-mail não cadastrado na plataforma.'
          : traduzErroAuth(e);
      setMsg(textoErro);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro de Autenticação', textoErro);
      }
    } finally {
      setBusy(false);
    }
  };

  const entrarConvidado = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await signInAsGuest();
    } catch (e) {
      setMsg(traduzErroAuth(e));
    } finally {
      setBusy(false);
    }
  };

  const esqueci = async () => {
    if (!email) return setMsg('Digite seu e-mail primeiro.');
    try {
      await resetPassword(email);
      setMsg('E-mail de redefinição enviado.');
    } catch (e) {
      setMsg(traduzErroAuth(e));
    }
  };

  const input = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.container,
              styles.editorialCard,
              {
                backgroundColor: t.backgroundElement,
                borderColor: t.border,
                borderTopColor: t.primary,
              },
            ]}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: t.text }]}>Fichas D&D</Text>
            <Txt style={{ textAlign: 'center', marginBottom: 18, color: t.textSecondary }}>
              {cadastro ? 'Crie sua conta de aventureiro' : 'Entre para acessar suas fichas e campanhas'}
            </Txt>
            <TextInput
              style={input}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (msg) setMsg(null);
              }}
              placeholder="E-mail"
              placeholderTextColor={t.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={input}
              value={senha}
              onChangeText={(v) => {
                setSenha(v);
                if (msg) setMsg(null);
              }}
              placeholder="Senha"
              placeholderTextColor={t.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={enviar}
            />
            {msg ? (
              <View style={[styles.errorBox, { borderColor: t.danger }]}>
                <Ionicons name="alert-circle" size={18} color={t.danger} />
                <Text style={[styles.errorText, { color: t.danger }]}>{msg}</Text>
              </View>
            ) : null}
            {busy ? (
              <ActivityIndicator color={t.primary} />
            ) : (
              <Button
                title={cadastro ? 'Cadastrar' : 'Entrar'}
                onPress={enviar}
                disabled={!email || senha.length < 6}
              />
            )}
            <Button
              title={cadastro ? 'Já tenho conta' : 'Criar conta'}
              variant="ghost"
              onPress={() => {
                setCadastro((v) => !v);
                setMsg(null);
              }}
            />
            {!cadastro ? <Button title="Esqueci a senha" variant="ghost" onPress={esqueci} /> : null}
            <View style={[styles.divider, { backgroundColor: t.border }]} />
            <Button
              title="Continuar como Convidado (Offline)"
              variant="ghost"
              onPress={entrarConvidado}
              disabled={busy}
            />
            <Pressable
              onPress={() => Linking.openURL('https://instagram.com/Edu0_22_')}
              style={styles.credits}>
              <Text style={[styles.creditsTxt, { color: t.textSecondary }]}>
                Desenvolvido por Eduardo Cardoso Oliveira
              </Text>
              <View style={styles.instaRow}>
                <Ionicons name="logo-instagram" size={14} color={t.primary} />
                <Text style={[styles.creditsLink, { color: t.primary }]}>@Edu0_22_</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 12 },
  editorialCard: {
    borderWidth: 1,
    borderTopWidth: 4,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 34, fontWeight: '900', textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { fontSize: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  divider: { height: 1, marginVertical: 4 },
  credits: { marginTop: 16, alignItems: 'center', gap: 4 },
  creditsTxt: { fontSize: 12, textAlign: 'center' },
  instaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditsLink: { fontSize: 12, fontWeight: '700' },
});
