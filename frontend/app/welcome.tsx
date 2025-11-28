import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

// Type untuk navigation
type NavigationProp = {
  navigate: (screen: string) => void;
  setOptions: (options: any) => void;
};

const Welcome: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Menghilangkan header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleContinue = () => {
    // Navigasi ke halaman beranda
    navigation.navigate("beranda");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#051E2C" />

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/memento-logo.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome to Memento</Text>
          <Text style={styles.subtitle}>A Smarter Way to Remember</Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 60,
  },
  logoContainer: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 180,
    height: 180,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: "#B8D4E3",
    textAlign: "center",
    fontWeight: "400",
    lineHeight: 24,
    opacity: 0.9,
  },
  buttonContainer: {
    width: "100%",
    paddingBottom: 20,
  },
  continueButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default Welcome;
