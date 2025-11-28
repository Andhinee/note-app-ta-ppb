import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for auth token
      const token = await AsyncStorage.getItem("authToken");

      if (token) {
        // Optional: Verify token is still valid
        // You can add token validation logic here if needed

        // Navigate to beranda if token exists
        navigation.reset({
          index: 0,
          routes: [{ name: "beranda" as never }],
        });
      } else {
        // No token found, stay on current screen
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A9EFF" />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#051E2C",
  },
});

export default AuthWrapper;
