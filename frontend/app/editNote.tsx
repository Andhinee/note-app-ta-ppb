import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ApiService, Note } from "@/services/authService";

// Type voor navigation
type NavigationProp = {
  navigate: (screen: string) => void;
  goBack: () => void;
  setOptions: (options: any) => void;
};

// Type voor route params
type RouteParams = {
  noteId: string;
};

// Mood data with colors and emojis
const moodData = [
  {
    mood: "HAPPY",
    emoji: "😊",
    color: "#E76F8A", // Warm dusky pink
    description: "Happiness",
  },
  {
    mood: "SAD",
    emoji: "😢",
    color: "#2E5A7A", // Dark desaturated blue
    description: "Sadness",
  },
  {
    mood: "ANGRY",
    emoji: "😠",
    color: "#A33232", // Deep blood red
    description: "Anger",
  },
  {
    mood: "FEAR",
    emoji: "😨",
    color: "#5D3A84", // Dark royal violet
    description: "Fear",
  },
  {
    mood: "CALM",
    emoji: "😌",
    color: "#4B5563", // Cool slate gray
    description: "Calm",
  },
  {
    mood: "SURPRISE",
    emoji: "😲",
    color: "#BAA426", // Burnt sienna brown
    description: "Surprise",
  },
];

const EditNote: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Note data
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("painters-palette");
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [selectedMoodEmoji, setSelectedMoodEmoji] = useState<string>("");
  const [selectedMoodColor, setSelectedMoodColor] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [unlockDate, setUnlockDate] = useState<Date | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Menghilangkan header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Load note data when component mounts
  useEffect(() => {
    loadNoteData();
    console.log("params.noteId:", params.noteId);
  }, [params.noteId]);

  // Track changes
  useEffect(() => {
    if (note) {
      const hasChanged =
        title !== note.title ||
        content !== (note.content || "") ||
        selectedMoodColor !== note.color ||
        selectedMood !== (note.mood || "") ||
        isLocked !== (note.isLocked || false) ||
        isTimeCapsule !== (note.isTimeCapsule || false) ||
        unlockDate?.toISOString() !== note.unlockDate;

      setHasChanges(hasChanged);
    }
  }, [title, content, selectedMood, isLocked, isTimeCapsule, unlockDate, note]);

  const loadNoteData = async () => {
    try {
      setLoading(true);
      const noteData = await ApiService.getNoteById(params.noteId);

      setNote(noteData);
      setTitle(noteData.title);
      setContent(noteData.content || "");

      // Set mood data if exists
      if (noteData.mood) {
        const moodItem = moodData.find((m) => m.mood === noteData.mood);
        if (moodItem) {
          setSelectedMood(noteData.mood);
          setSelectedMoodEmoji(moodItem.emoji);
          setSelectedMoodColor(moodItem.color);
        }
      }

      // Set color if exists (fallback for direct color)
      if (noteData.color && !selectedMoodColor) {
        setSelectedMoodColor(noteData.color);
      }

      // Set lock status
      setIsLocked(noteData.isLocked || false);
      if (noteData.isLocked) {
        setSelectedIcon("lock");
      }

      // Set time capsule status
      setIsTimeCapsule(noteData.isTimeCapsule || false);
      if (noteData.unlockDate) {
        setUnlockDate(new Date(noteData.unlockDate));
        setSelectedIcon("jam-pasir");
      }
    } catch (error) {
      console.error("Error loading note:", error);
      Alert.alert("Error", "Failed to load note. Please try again.", [
        {
          text: "Go Back",
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          {
            text: "Don't Save",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Save",
            onPress: handleSave,
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in both title and content");
      return;
    }

    try {
      setSaving(true);

      const updateData: Partial<Note> = {
        title: title.trim(),
        content: content.trim(),
        mood: selectedMood || undefined,
        color: selectedMoodColor || undefined,
        isLocked,
        isTimeCapsule,
        unlockDate: unlockDate?.toISOString() || undefined,
      };

      await ApiService.updateNote(params.noteId, updateData);

      Alert.alert("Success", "Note updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating note:", error);
      Alert.alert("Error", "Failed to update note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleIconPress = (iconName: string) => {
    setSelectedIcon(iconName);

    // Show mood selector when painters-palette (color icon) is clicked
    if (iconName === "painters-palette") {
      setShowMoodSelector(true);
    }

    // Handle lock icon - mutually exclusive with time capsule
    if (iconName === "lock") {
      setIsLocked(true);
      // Clear time capsule if it was set
      setIsTimeCapsule(false);
      setUnlockDate(null);
    }

    // Handle hourglass icon - mutually exclusive with lock
    if (iconName === "jam-pasir") {
      // Clear lock if it was set
      setIsLocked(false);
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && selectedDate > new Date()) {
      setUnlockDate(selectedDate);
      setIsTimeCapsule(true);
    } else if (selectedDate) {
      Alert.alert(
        "Invalid Date",
        "Please select a future date for the time capsule."
      );
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleMoodSelect = (mood: string, emoji: string, color: string) => {
    setSelectedMood(mood);
    setSelectedMoodEmoji(emoji);
    setSelectedMoodColor(color);
    setShowMoodSelector(false);
  };

  const iconOptions = [
    {
      name: "painters-palette",
      source: require("../assets/images/painters-palette.png"),
    },
    { name: "lock", source: require("../assets/images/lock.png") },
    { name: "jam-pasir", source: require("../assets/images/jam-pasir.png") },
  ];

  // Show loading spinner while loading note data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        selectedMoodColor ? { backgroundColor: selectedMoodColor } : {},
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={selectedMoodColor || "#0F172A"}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          {iconOptions.map((icon) => (
            <TouchableOpacity
              key={icon.name}
              style={[
                styles.iconButton,
                selectedIcon === icon.name && styles.selectedIconButton,
              ]}
              onPress={() => handleIconPress(icon.name)}
              activeOpacity={0.7}
            >
              <Image
                source={icon.source}
                style={styles.icon}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          value={title}
          onChangeText={setTitle}
          multiline={false}
          maxLength={100}
        />

        {/* Content Input */}
        <TextInput
          style={styles.contentInput}
          placeholder="Write your note here."
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          value={content}
          onChangeText={setContent}
          multiline={true}
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {/* Time Capsule Display */}
        {isTimeCapsule && unlockDate && (
          <View
            style={[
              styles.timeCapsuleContainer,
              selectedMoodColor ? { backgroundColor: selectedMoodColor } : {},
            ]}
          >
            <View style={styles.timeCapsuleHeader}>
              <Text style={styles.timeCapsuleIcon}>⏳</Text>
              <Text style={styles.timeCapsuleTitle}>Time Capsule</Text>
            </View>
            <Text style={styles.timeCapsuleDate}>
              Unlock Date: {formatDate(unlockDate)}
            </Text>
            <TouchableOpacity
              style={styles.removeTimeCapsuleButton}
              onPress={() => {
                setIsTimeCapsule(false);
                setUnlockDate(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.removeTimeCapsuleText}>
                Remove Time Capsule
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Locked Note Display */}
        {isLocked && (
          <View
            style={[
              styles.lockedContainer,
              selectedMoodColor ? { backgroundColor: selectedMoodColor } : {},
            ]}
          >
            <View style={styles.lockedHeader}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedTitle}>Private Note</Text>
            </View>
            <Text style={styles.lockedDescription}>
              This note is marked as private and will require authentication to
              view.
            </Text>
            <TouchableOpacity
              style={styles.removeLockedButton}
              onPress={() => setIsLocked(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.removeLockedText}>Remove Lock</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Save Button - Show only if there are changes */}
      {hasChanges && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Mood Selector Modal */}
      <Modal
        visible={showMoodSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoodSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Pick a mood that suits you today!
            </Text>

            <View style={styles.moodGrid}>
              {moodData.map((moodItem) => (
                <TouchableOpacity
                  key={moodItem.mood}
                  style={[
                    styles.moodButton,
                    { backgroundColor: moodItem.color },
                  ]}
                  onPress={() =>
                    handleMoodSelect(
                      moodItem.mood,
                      moodItem.emoji,
                      moodItem.color
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.moodEmoji}>{moodItem.emoji}</Text>
                  <Text style={styles.moodLabel}>{moodItem.mood}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMoodSelector(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={unlockDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  backArrow: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedIconButton: {
    borderColor: "#FFFFFF",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  contentInput: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    minHeight: 400,
    paddingTop: 10,
  },
  timeCapsuleContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeCapsuleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timeCapsuleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timeCapsuleTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  timeCapsuleDate: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  removeTimeCapsuleButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
  },
  removeTimeCapsuleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.8,
  },
  lockedContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lockedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  lockedTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  lockedDescription: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  removeLockedButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
  },
  removeLockedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
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
  saveButtonDisabled: {
    backgroundColor: "#64748B",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 15,
  },
  moodButton: {
    width: "48%",
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  moodLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default EditNote;
