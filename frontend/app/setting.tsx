import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import your AuthService
import { AuthService } from "../services/authService";

// Type untuk navigation
type NavigationProp = {
  navigate: (screen: string) => void;
  goBack: () => void;
  setOptions: (options: any) => void;
  reset: (options: any) => void;
};

const STORAGE_KEY = "@user_font_size";

const Settings: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [fontSize, setFontSize] = useState<"Small" | "Medium" | "Big">("Small");
  const [sortBy, setSortBy] = useState("By modification date");
  const [showFontOptions, setShowFontOptions] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Mapping tiap pilihan ke ukuran font (dalam poin)
  const fontSizeMap: { [key in "Small" | "Medium" | "Big"]: number } = {
    Small: 14,
    Medium: 18,
    Big: 22,
  };
  const currentFontSize = fontSizeMap[fontSize];

  // Saat komponen mount, ambil fontSize terakhir dari AsyncStorage
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "Small" || saved === "Medium" || saved === "Big") {
          setFontSize(saved);
        }
      } catch (e) {
        console.warn("Gagal memuat fontSize dari storage:", e);
      }
    };
    loadFontSize();
  }, []);

  // Hilangkan header default
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleGoProfil = () => {
    navigation.navigate("profil");
  };

  const handleFontSizePress = () => {
    setShowFontOptions(!showFontOptions);
    setShowSortOptions(false);
  };

  const handleSortPress = () => {
    setShowSortOptions(!showSortOptions);
    setShowFontOptions(false);
  };

  const handleFontSizeChange = async (size: "Small" | "Medium" | "Big") => {
    setFontSize(size);
    setShowFontOptions(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, size);
    } catch (e) {
      console.warn("Gagal menyimpan fontSize ke storage:", e);
    }
  };

  const handleSortChange = (sortOption: string) => {
    setSortBy(sortOption);
    setShowSortOptions(false);
  };

  const handleLogOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => performLogout(),
      },
    ]);
  };

  const performLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Use AuthService to sign out (clears tokens and user data)
      await AuthService.signOut();

      // Reset navigation stack and navigate to index
      navigation.reset({
        index: 0,
        routes: [{ name: "index" }],
      });

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert("Success", "You have been logged out successfully.");
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#051E2C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: currentFontSize + 4 }]}>
          Settings
        </Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <Ionicons name="home-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Content dengan flex layout */}
      <View style={styles.mainContent}>
        {/* Settings Content - ScrollView yang bisa di-scroll */}
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* My Profile */}
          <TouchableOpacity onPress={handleGoProfil} style={styles.settingItem}>
            <Text
              style={[styles.settingItemText, { fontSize: currentFontSize }]}
            >
              My Profile
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Cloud services */}
          <View style={styles.sectionContainer}>
            <Text
              style={[styles.sectionHeader, { fontSize: currentFontSize - 2 }]}
            >
              Cloud services
            </Text>

            {/* Google Account */}
            <TouchableOpacity style={styles.settingItem}>
              <Text
                style={[styles.settingItemText, { fontSize: currentFontSize }]}
              >
                Google Account
              </Text>
              <Image
                source={require("../assets/images/google-logo.png")}
                style={styles.googleLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Font size */}
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.settingItemWithOptions}
              onPress={handleFontSizePress}
            >
              <Text
                style={[styles.settingItemText, { fontSize: currentFontSize }]}
              >
                Font size
              </Text>
              <View style={styles.settingValueContainer}>
                <Text
                  style={[
                    styles.settingValue,
                    { fontSize: currentFontSize - 2 },
                  ]}
                >
                  {fontSize}
                </Text>
                <View style={styles.toggleIndicator}>
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Font size options */}
            {showFontOptions && (
              <View style={styles.optionsContainer}>
                {(["Small", "Medium", "Big"] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionItem,
                      fontSize === size && styles.optionItemSelected,
                    ]}
                    onPress={() => handleFontSizeChange(size)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { fontSize: currentFontSize - 2 },
                        fontSize === size && styles.optionTextSelected,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Sort */}
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.settingItemWithOptions}
              onPress={handleSortPress}
            >
              <Text
                style={[styles.settingItemText, { fontSize: currentFontSize }]}
              >
                Sort
              </Text>
              <View style={styles.settingValueContainer}>
                <Text
                  style={[
                    styles.settingValue,
                    { fontSize: currentFontSize - 2 },
                  ]}
                >
                  {sortBy}
                </Text>
                <View style={styles.toggleIndicator}>
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Sort options */}
            {showSortOptions && (
              <View style={styles.optionsContainer}>
                {(
                  [
                    "By modification date",
                    "By creation date",
                    "By name",
                  ] as const
                ).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionItem,
                      sortBy === option && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSortChange(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { fontSize: currentFontSize - 2 },
                        sortBy === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Log Out - Fixed di bagian bawah */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              isLoggingOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogOut}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="power" size={20} color="#DC2626" />
            )}
            <Text style={[styles.logoutText, { fontSize: currentFontSize }]}>
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#051E2C",
    borderBottomWidth: 1,
    borderBottomColor: "#1A3A4A",
  },
  headerButton: {
    padding: 5,
  },
  headerTitle: {
    fontWeight: "600",
    color: "white",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    fontWeight: "500",
    color: "#999",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1A3A4A",
  },
  settingItemWithOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  settingItemText: {
    color: "white",
    fontWeight: "400",
    // fontSize akan di-override secara inline
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    color: "#999",
    marginRight: 8,
    // fontSize akan di-override secara inline
  },
  toggleIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    marginHorizontal: 1,
  },
  googleLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  optionsContainer: {
    marginTop: 10,
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#1A3A4A",
    paddingLeft: 15,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: "#4A9EFF",
  },
  optionText: {
    color: "#999",
    // fontSize akan di-override secara inline
  },
  optionTextSelected: {
    color: "white",
    fontWeight: "500",
  },
  logoutContainer: {
    borderTopWidth: 1,
    borderTopColor: "#1A3A4A",
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#051E2C",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#0A2432",
    borderRadius: 12,
    justifyContent: "center",
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: "#DC2626",
    marginLeft: 10,
    fontWeight: "500",
    // fontSize akan di-override secara inline
  },
});

export default Settings;
