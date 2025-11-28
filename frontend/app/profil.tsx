import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ApiService, AuthService, User } from "@/services/authService";

// Type untuk navigation
type NavigationProp = {
  navigate: (screen: string) => void;
  goBack: () => void;
  setOptions: (options: any) => void;
};

const EditProfile: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalProfileImage, setOriginalProfileImage] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Hilangkan header default
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Load current user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoadingProfile(true);

      // Try to get user from local storage first
      const localUser = await AuthService.getCurrentUser();
      if (localUser) {
        setCurrentUser(localUser);
        setFullName(localUser.fullName || "");
        setEmail(localUser.email || "");
        setProfileImage(localUser.profilePicture || null);
        setOriginalProfileImage(localUser.profilePicture || null);
      }

      // Then try to get fresh data from API
      try {
        const freshUserData = await ApiService.getUserProfile();
        setCurrentUser(freshUserData);
        setFullName(freshUserData.fullName || "");
        setEmail(freshUserData.email || "");
        setProfileImage(freshUserData.profilePicture || null);
        setOriginalProfileImage(freshUserData.profilePicture || null);
      } catch (apiError) {
        console.warn("Could not fetch fresh user data, using cached data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleHome = () => {
    navigation.navigate("beranda"); // Sesuaikan dengan nama screen home Anda
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to change your profile picture."
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll handle base64 conversion in the API service
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name cannot be empty");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Email cannot be empty");
      return;
    }

    // Validasi email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare update data
      const updateData: Partial<User> = {
        fullName: fullName.trim(),
        email: email.trim(),
      };

      // Check if profile image has changed
      const hasNewImage = profileImage && profileImage !== originalProfileImage;
      const imageUri = hasNewImage ? profileImage : undefined;

      // Update profile with or without new image
      const updatedUser = await ApiService.updateUserProfile(
        updateData,
        imageUri
      );

      console.log("Profile updated successfully:", updatedUser);

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while fetching profile data
  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A1929" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleHome} style={styles.headerButton}>
          <Ionicons name="home-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                onError={(error) => {
                  console.error("Error loading profile image:", error);
                  setProfileImage(null);
                }}
              />
            ) : (
              <View style={styles.defaultProfileImage}>
                <Ionicons name="person" size={60} color="#666" />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={pickImage}
              disabled={isLoading}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileLabel}>Your Profile</Text>
          {profileImage && profileImage !== originalProfileImage && (
            <Text style={styles.imageChangedLabel}>Image will be updated</Text>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#666"
              editable={!isLoading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button - Fixed at bottom */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.saveButtonLoading}>
              <ActivityIndicator size="small" color="#0A1929" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  loadingText: {
    color: "#999",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#0A1929",
  },
  headerButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  profileImageSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1A2332",
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00BCD4",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0A1929",
  },
  profileLabel: {
    fontSize: 16,
    color: "#999",
    fontWeight: "400",
  },
  imageChangedLabel: {
    fontSize: 12,
    color: "#00BCD4",
    fontWeight: "400",
    marginTop: 5,
  },
  formSection: {
    gap: 25,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
    marginLeft: 5,
  },
  textInput: {
    backgroundColor: "#00BCD4",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: "#0A1929",
    fontWeight: "500",
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 15,
    backgroundColor: "#0A1929",
    borderTopWidth: 1,
    borderTopColor: "#1A2332",
  },
  saveButton: {
    backgroundColor: "#00BCD4",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0A1929",
  },
});

export default EditProfile;
