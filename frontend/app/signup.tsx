import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

// Import your auth service
import { AuthService } from "../services/authService";

// Type untuk navigation
type NavigationProp = {
  navigate: (screen: string) => void;
  goBack: () => void;
  setOptions: (options: any) => void;
};

const SignUp: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Menghilangkan header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleCreateAccount = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      // Use your AuthService to sign up
      const response = await AuthService.signUpWithEmail({
        email,
        password,
        fullName: name,
      });

      console.log("Sign up successful:", response);

      // Show success message and navigate
      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("welcome"), // or wherever you want to navigate after signup
        },
      ]);
    } catch (error: any) {
      console.error("Sign up error:", error);

      let errorMessage = "Sign up failed. Please try again.";

      // Handle specific errors
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please choose a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);

    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Get the users ID token
      const { data } = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(
        data?.idToken as string
      );

      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(
        googleCredential
      );
      const firebaseIdToken = await userCredential.user.getIdToken();

      // Sign up with your backend using Google
      const response = await AuthService.signUpWithGoogle(firebaseIdToken);

      console.log("Google sign up successful:", response);

      // Navigate to welcome page
      navigation.navigate("welcome");
    } catch (error: any) {
      console.error("Google sign up error:", error);

      let errorMessage = "Google sign up failed. Please try again.";

      if (error.code === "SIGN_IN_CANCELLED") {
        // User cancelled the login flow
        return;
      } else if (error.code === "IN_PROGRESS") {
        errorMessage = "Google sign up is already in progress.";
      } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        errorMessage = "Play services not available or outdated.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogIn = () => {
    // Navigate to login page
    navigation.navigate("index"); // or "login" depending on your route name
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#051E2C" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Memento</Text>
          <Text style={styles.subtitle}>Let's create an account!</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Name"
              placeholderTextColor="#8A8A8A"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading && !isGoogleLoading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Email"
              placeholderTextColor="#8A8A8A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isGoogleLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Password"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
              editable={!isLoading && !isGoogleLoading}
            />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (isLoading || isGoogleLoading) && styles.createButtonDisabled,
            ]}
            onPress={handleCreateAccount}
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLogIn}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <Text style={styles.dividerText}>Or continue with</Text>

          {/* Google Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              (isLoading || isGoogleLoading) && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <>
                <Image
                  source={require("../assets/images/google-logo.png")}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051E2C",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#B8D4E3",
    fontWeight: "400",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F5f5f5",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  createButton: {
    backgroundColor: "#3B82A6",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  loginText: {
    color: "#B8D4E3",
    fontSize: 14,
  },
  loginLink: {
    color: "#4A9EFF",
    fontSize: 14,
    fontWeight: "600",
  },
  dividerText: {
    color: "#B8D4E3",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: "#e8e8e8",
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default SignUp;
