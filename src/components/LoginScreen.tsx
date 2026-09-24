import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!serverUrl.trim() || !username.trim()) {
      Alert.alert("Attenzione", "Inserisci l'indirizzo del server e lo username.");
      return;
    }

    setIsLoading(true);
    try {
      await login(serverUrl.trim(), username.trim(), password);
    } catch (err: any) {
      Alert.alert("Errore di accesso", err.message || "Impossibile connettersi al server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Jellyboxd</Text>
          <Text style={styles.subtitle}>La tua libreria Jellyfin, con eleganza.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>SERVER JELLYFIN</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.238:8096"
            placeholderTextColor="#677b8c"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Il tuo username"
            placeholderTextColor="#677b8c"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="La tua password"
            placeholderTextColor="#677b8c"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.buttonText}>CONNETTITI</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Supporta Direct Play e sincronizzazione automatica dei progressi.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 22,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ab",
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1f252c",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#677b8c",
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#14181c",
    borderWidth: 1,
    borderColor: "#2c3440",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#00e054",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#00e054",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },
  footerText: {
    color: "#567",
    fontSize: 12,
    textAlign: "center",
    marginTop: 28,
  },
});
