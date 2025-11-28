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
  // Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
// import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

// Import our auth service
import { AuthService } from "../services/authService";

// Configure Google Sign-In (call this in your App.js or main component)
// GoogleSignin.configure({
//   webClientId: 'your-web-client-id-from-firebase-console',
// });

const Login: React.FC = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Option 1: Use your existing signInWithEmail method
      const response = await AuthService.signInWithEmail({
        email,
        password,
      });

      console.log("Login successful:", response);

      // Navigate to welcome page
      navigation.navigate("welcome" as never);
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      // Handle specific errors
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleGoogleLogin = async () => {
  //   setIsGoogleLoading(true);

  //   try {
  //     // Check if your device supports Google Play
  //     await GoogleSignin.hasPlayServices({
  //       showPlayServicesUpdateDialog: true,
  //     });

  //     // Get the users ID token
  //     const { data } = await GoogleSignin.signIn();

  //     // Create a Google credential with the token
  //     const googleCredential = auth.GoogleAuthProvider.credential(
  //       data?.idToken as string
  //     );

  //     // Sign-in the user with the credential
  //     const userCredential = await auth().signInWithCredential(
  //       googleCredential
  //     );
  //     const firebaseIdToken = await userCredential.user.getIdToken();

  //     // Authenticate with your backend
  //     const response = await AuthService.signInWithGoogle(firebaseIdToken);

  //     console.log("Google login successful:", response);

  //     // Navigate to welcome page
  //     navigation.navigate("welcome" as never);
  //   } catch (error: any) {
  //     console.error("Google login error:", error);

  //     let errorMessage = "Google login failed. Please try again.";

  //     if (error.code === "SIGN_IN_CANCELLED") {
  //       // User cancelled the login flow
  //       return;
  //     } else if (error.code === "IN_PROGRESS") {
  //       errorMessage = "Google sign in is already in progress.";
  //     } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
  //       errorMessage = "Play services not available or outdated.";
  //     } else if (error.message) {
  //       errorMessage = error.message;
  //     }

  //     Alert.alert("Error", errorMessage);
  //   } finally {
  //     setIsGoogleLoading(false);
  //   }
  // };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Enter your email address and we'll send you a password reset link.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reset Email",
          onPress: () => sendPasswordReset(),
        },
      ]
    );
  };

  const sendPasswordReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert(
        "Email Sent",
        "Password reset email has been sent to your email address."
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleSignUp = () => {
    navigation.navigate("signup" as never);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Log in</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Enter Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Remember Me & Forgot Password */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <Text style={styles.dividerText}>Or continue with</Text>

        {/* Google Login Button */}
        {/* <TouchableOpacity
          style={[
            styles.googleButton,
            isGoogleLoading && styles.googleButtonDisabled,
          ]}
          onPress={handleGoogleLogin}
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
        </TouchableOpacity> */}

        {/* Sign Up Section */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>You don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 50,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F5f5f5",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 20,
    top: 15,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4A9EFF",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4A9EFF",
  },
  rememberMeText: {
    color: "white",
    fontSize: 14,
  },
  forgotPasswordText: {
    color: "white",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  loginButton: {
    backgroundColor: "#2E7CB8",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 30,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  dividerText: {
    color: "white",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14,
    opacity: 0.8,
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
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  signUpText: {
    color: "white",
    fontSize: 14,
    opacity: 0.8,
  },
  signUpLink: {
    color: "#4A9EFF",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default Login;
