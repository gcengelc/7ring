import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, api, isDemoMode } from '@/api';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { EMAIL_REJECTED, isAllowedEmail, normalizeEmail } from '@/lib/format';
import { useApp } from '@/store/AppProvider';
import { colors, fonts, radius } from '@/theme';

type Step = 'mail' | 'code';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { requestCode, verifyCode } = useApp();

  const [step, setStep] = useState<Step>('mail');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSendCode() {
    const value = normalizeEmail(email);
    if (!isAllowedEmail(value)) {
      setError(EMAIL_REJECTED);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestCode(value);
      setEmail(value);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod gönderilemedi. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (code.length !== api.codeLength) {
      setError(`Kod ${api.codeLength} haneli olmalı.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyCode(code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod doğrulanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 46 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>LOGO</Text>
        </View>

        <Text variant="display" style={styles.title}>
          Ring{'\n'}nerede?
        </Text>
        <Text variant="body" style={styles.lede}>
          Kampüste ringi gören öğrenciler bildirir, herkes görür. Devam etmek için e-posta
          adresini gir.
        </Text>

        <View style={styles.spacer} />

        {step === 'mail' ? (
          <View style={styles.form}>
            <Text variant="label" style={styles.fieldLabel}>
              E-posta
            </Text>
            <View style={styles.field}>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v.replace(/\s/g, ''));
                  setError('');
                }}
                placeholder="E-posta adresin"
                placeholderTextColor={colors.onNavy45}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={onSendCode}
                editable={!busy}
                style={styles.input}
                accessibilityLabel="E-posta adresi"
              />
            </View>
            <Text style={styles.error}>{error}</Text>
            <Button label="Doğrulama kodu gönder" tone="accent" loading={busy} onPress={onSendCode} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text variant="label" style={styles.fieldLabel}>
              {email} adresine gönderilen kod
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, api.codeLength));
                setError('');
              }}
              placeholder={`${api.codeLength} haneli kod`}
              placeholderTextColor={colors.onNavy45}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={api.codeLength}
              autoFocus
              editable={!busy}
              onSubmitEditing={onVerify}
              style={styles.codeInput}
              accessibilityLabel="Doğrulama kodu"
            />
            <Text style={styles.error}>{error}</Text>
            <Button label="Giriş yap" tone="accent" loading={busy} onPress={onVerify} />
            <Button
              label="E-postayı değiştir"
              tone="ghost"
              disabled={busy}
              onPress={() => {
                setStep('mail');
                setCode('');
                setError('');
              }}
            />
          </View>
        )}

        {isDemoMode ? (
          <Text style={styles.demoNote}>
            Demo modu: sunucu bağlı değil, 4 haneli herhangi bir kod kabul edilir.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, paddingHorizontal: 30 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.onNavy35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.onNavy62,
  },
  title: { marginTop: 30, color: colors.onNavy },
  lede: { marginTop: 14, color: colors.onNavy62, maxWidth: 270 },
  spacer: { flex: 1, minHeight: 40 },
  form: { gap: 12 },
  fieldLabel: { color: colors.onNavy55, letterSpacing: 1.32, fontSize: 11 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 14,
    backgroundColor: colors.onNavy08,
    borderWidth: 1,
    borderColor: colors.onNavy22,
    borderRadius: radius.control,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.onNavy,
    fontFamily: fonts.medium,
    fontSize: 17,
    padding: 0,
  },
  codeInput: {
    height: 56,
    backgroundColor: colors.onNavy08,
    borderWidth: 1,
    borderColor: colors.onNavy22,
    borderRadius: radius.control,
    color: colors.onNavy,
    fontFamily: fonts.semibold,
    fontSize: 22,
    letterSpacing: 6.6,
    textAlign: 'center',
  },
  error: { minHeight: 18, fontFamily: fonts.regular, fontSize: 12.5, color: colors.amber },
  demoNote: {
    marginTop: 20,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onNavy45,
    textAlign: 'center',
  },
});
