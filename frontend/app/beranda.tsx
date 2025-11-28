import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import Toast from "react-native-toast-message";
import {
  ApiService,
  NetworkUtils,
  Note,
  TokenManager,
} from "@/services/authService";

// Type untuk navigation
type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  setOptions: (options: any) => void;
};

type SyncStatus = {
  pending: number;
  success: number;
  failed: number;
};

const Beranda: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showPinModal, setPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [selectedLockedNote, setSelectedLockedNote] = useState<Note | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    pending: number;
    success: number;
    failed: number;
  } | null>(null);

  const filters = ["All", "Mood", "Time Capsule", "Secret Note"];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const checkPendingSync = async () => {
      const pendingCount = await ApiService.getPendingSyncCount();
      if (pendingCount > 0) {
        setSyncStatus({ pending: pendingCount, success: 0, failed: 0 });
      }
    };

    checkPendingSync();
  }, []);

  useEffect(() => {
    const unsubscribe = NetworkUtils.subscribe(async (isConnected) => {
      setIsOffline(!isConnected);
      if (isConnected) {
        // Auto-sync when connection is restored
        handleSync();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const pendingCount = await ApiService.getPendingSyncCount();
      if (pendingCount === 0) {
        setSyncStatus(null);
        return;
      }

      setSyncStatus({ pending: pendingCount, success: 0, failed: 0 });
      const result = await ApiService.syncPendingNotes();
      setSyncStatus({
        pending: 0,
        success: result.success,
        failed: result.failed,
      });

      // Refresh notes after sync
      await loadNotes();

      // Show success message
      if (result.success > 0) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${result.success} notes. ${
            result.failed > 0 ? `Failed to sync ${result.failed} notes.` : ""
          }`
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Sync Error", "Failed to sync notes. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load notes using the ApiService
  const loadNotes = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      // Check network status
      const isConnected = await NetworkUtils.isConnected();

      // Get both cached and pending notes initially
      const [cachedNotes, pendingNotes] = await Promise.all([
        TokenManager.getCachedNotes(),
        TokenManager.getPendingNotes(),
      ]);

      // If offline and we have cached data, use it
      if (!isConnected) {
        setIsOffline(true);
        const combinedNotes = [
          ...cachedNotes,
          ...pendingNotes.map((note) => ({
            ...note,
            id: note.tempId,
            userId: "temp",
            isOffline: true,
          })),
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotes(combinedNotes);

        if (combinedNotes.length === 0) {
          Alert.alert(
            "Offline Mode",
            "You're offline and no cached notes are available. Please check your internet connection."
          );
        }
        return;
      }

      // Online: Try to sync pending notes first if any exist
      if (pendingNotes.length > 0) {
        setIsSyncing(true);
        try {
          const syncResult = await ApiService.syncPendingNotes();
          if (syncResult.success > 0) {
            // Some notes were synced successfully
            Toast.show({
              type: "success",
              text1: "Sync Complete",
              text2: `Successfully synced ${syncResult.success} notes${
                syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ""
              }`,
            });
          }
        } catch (syncError) {
          console.warn("Failed to sync pending notes:", syncError);
          // Continue with loading even if sync fails
        } finally {
          setIsSyncing(false);
        }
      }

      // Fetch fresh notes from server
      const response = await ApiService.makeAuthenticatedRequest("/notes");
      const serverNotes = await response.json();

      if (!response.ok) {
        throw new Error(serverNotes.error || "Failed to fetch notes");
      }

      // Cache the fresh notes
      await TokenManager.saveNotesToCache(serverNotes);

      // Get updated pending notes after sync
      const remainingPendingNotes = await TokenManager.getPendingNotes();

      // Combine server notes with any remaining pending notes
      const combinedNotes = [
        ...serverNotes,
        ...remainingPendingNotes.map((note) => ({
          ...note,
          id: note.tempId,
          userId: "temp",
          isOffline: true,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotes(combinedNotes);
      setIsOffline(false);
    } catch (error) {
      console.error("Failed to load notes:", error);

      try {
        // Fallback to cached notes
        const [cachedNotes, pendingNotes] = await Promise.all([
          TokenManager.getCachedNotes(),
          TokenManager.getPendingNotes(),
        ]);

        const combinedNotes = [
          ...cachedNotes,
          ...pendingNotes.map((note) => ({
            ...note,
            id: note.tempId,
            userId: "temp",
            isOffline: true,
          })),
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotes(combinedNotes);
        setIsOffline(true);

        if (combinedNotes.length === 0) {
          Alert.alert(
            "Connection Error",
            "Unable to load notes and no cached data available. Please check your internet connection and try again."
          );
        } else {
          Toast.show({
            type: "info",
            text1: "Offline Mode",
            text2: "Showing cached notes. Pull to refresh when online.",
          });
        }
      } catch (cacheError) {
        console.error("Failed to load cached notes:", cacheError);
        Alert.alert(
          "Error",
          "Failed to load notes. Please restart the app and try again."
        );
        setNotes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh notes
  const refreshNotes = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleAddNote = () => {
    navigation.navigate("create");
  };

  const handleSettings = () => {
    navigation.navigate("setting");
  };

  function handleTrash() {
    if (notes.length === 0) {
      Alert.alert("No Notes", "There are no notes to delete.");
      return;
    }
    setShowDeleteModal(true);
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) {
      Alert.alert("No Selection", "Please select notes to delete.");
      return;
    }

    Alert.alert(
      "Delete Notes",
      `Are you sure you want to delete ${selectedNotes.length} note(s)? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await ApiService.deleteMultipleNotes(selectedNotes);
              setSelectedNotes([]);
              setShowDeleteModal(false);
              Alert.alert("Success", "Selected notes have been deleted.");
              await loadNotes(); // Refresh the notes list
            } catch (error) {
              console.error("Failed to delete notes:", error);
              Alert.alert(
                "Error",
                "Failed to delete some notes. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleCancelDelete = () => {
    setSelectedNotes([]);
    setShowDeleteModal(false);
  };

  // Check if device supports biometric authentication
  const checkBiometricSupport = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error("Error checking biometric support:", error);
      return false;
    }
  };

  // Authenticate with biometrics
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Secret Note",
        cancelLabel: "Use PIN",
        fallbackLabel: "Use PIN",
      });
      return result.success;
    } catch (error) {
      console.error("Biometric authentication error:", error);
      return false;
    }
  };

  // Show PIN input modal
  const showPinInput = (note: Note) => {
    setSelectedLockedNote(note);
    setPinInput("");
    setPinModal(true);
  };

  // Verify PIN (simplified - in real app you'd verify against system PIN)
  const verifyPin = () => {
    // For demo purposes, we'll accept any 4-digit PIN
    // In a real app, you'd integrate with the system's PIN verification
    if (pinInput.length >= 4) {
      setPinModal(false);
      setPinInput("");
      if (selectedLockedNote) {
        navigation.navigate("editNote", { id: selectedLockedNote.id });
      }
      setSelectedLockedNote(null);
    } else {
      Alert.alert("Invalid PIN", "Please enter a valid PIN");
    }
  };

  const handlePinCancel = () => {
    setPinModal(false);
    setPinInput("");
    setSelectedLockedNote(null);
  };

  // Handle note press with authentication
  const handleNotePress = async (note: Note) => {
    // Check if it's a time capsule that hasn't unlocked yet
    if (note.isTimeCapsule && note.unlockDate) {
      const unlockDate = new Date(note.unlockDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      unlockDate.setHours(0, 0, 0, 0);

      if (unlockDate > today) {
        Alert.alert(
          "Time Capsule Locked",
          `This note will unlock on ${unlockDate.toLocaleDateString()}. You can't open it yet!`,
          [{ text: "OK", style: "default" }]
        );
        return;
      }
    }

    // Check if it's a secret note that needs authentication
    if (note.isLocked) {
      const supportsBiometric = await checkBiometricSupport();

      if (supportsBiometric) {
        const biometricSuccess = await authenticateWithBiometrics();
        if (biometricSuccess) {
          navigation.navigate("editNote", { id: note.id });
        } else {
          // If biometric fails, show PIN option
          showPinInput(note);
        }
      } else {
        // No biometric support, use PIN
        showPinInput(note);
      }
    } else {
      // Regular note, open directly
      navigation.navigate("editNote", { id: note.id });
    }
  };

  // Map note to display format with updated category logic
  const mapNoteToDisplayFormat = (note: Note) => {
    let category = "Mood";
    let icon = "color-palette";

    // Check if it's a secret note (has isLocked = true)
    if (note.isLocked) {
      category = "Secret Note";
      icon = "lock-closed";
    }
    // Check if it's a time capsule (has isTimeCapsule = true and unlockDate)
    else if (note.isTimeCapsule && note.unlockDate) {
      category = "Time Capsule";
      icon = "hourglass";
    }
    // Check if it's a mood note (has mood value)
    else if (note.mood && note.mood.trim() !== "") {
      category = "Mood";
      icon = "color-palette";
    }

    return {
      ...note,
      category,
      icon,
      createdAt: new Date(note.createdAt),
    };
  };

  // Filter notes based on selected filter
  const filteredNotes = notes.map(mapNoteToDisplayFormat).filter((note) => {
    const matchesFilter =
      selectedFilter === "All" || note.category === selectedFilter;
    const matchesSearch =
      note.title.toLowerCase().includes(searchText.toLowerCase()) ||
      note.content.toLowerCase().includes(searchText.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#051E2C" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
        <Toast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#051E2C" />

      {/* Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline mode</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Memento Notes</Text>
        <View style={styles.headerActions}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#4A9EFF" />
          ) : (syncStatus as SyncStatus)?.pending > 0 ? (
            <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
              <Ionicons name="cloud-upload-outline" size={24} color="#4A9EFF" />
              <Text style={styles.syncCount}>
                {(syncStatus as SyncStatus).pending}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={refreshNotes} style={styles.headerButton}>
            <Ionicons name="refresh-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleTrash} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddNote} style={styles.headerButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSettings}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notes Content Area */}
      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshNotes}
            colors={["#4A9EFF"]}
            tintColor="#4A9EFF"
          />
        }
      >
        {filteredNotes.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="document-text-outline"
                size={60}
                color="#4A9EFF"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {notes.length === 0 ? "No Notes Yet" : "No Matching Notes"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {notes.length === 0
                ? "Tap the + button to create your first note"
                : "Try adjusting your search or filter"}
            </Text>
          </View>
        ) : (
          /* Notes List */
          <View style={styles.notesGrid}>
            {filteredNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onPress={() => handleNotePress(note)}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.noteIconContainer}>
                    <Ionicons
                      name={note.icon as any}
                      size={16}
                      color="#4A9EFF"
                    />
                  </View>
                  <Text style={styles.noteCategory}>{note.category}</Text>
                  {/* Show lock indicator for secret notes */}
                  {note.isLocked && (
                    <Ionicons
                      name="lock-closed"
                      size={12}
                      color="#FFD700"
                      style={styles.lockIndicator}
                    />
                  )}
                  {/* Show time capsule indicator */}
                  {note.isTimeCapsule && note.unlockDate && (
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color="#FF6B6B"
                      style={styles.timeCapsuleIndicator}
                    />
                  )}
                </View>
                <Text style={styles.noteTitle} numberOfLines={2}>
                  {note.title}
                </Text>
                <Text style={styles.noteContent} numberOfLines={3}>
                  {note.content}
                </Text>
                <View style={styles.noteFooter}>
                  <Text style={styles.noteDate}>
                    {note.createdAt.toLocaleDateString()}
                  </Text>
                  {/* Show unlock date for time capsules */}
                  {note.isTimeCapsule && note.unlockDate && (
                    <Text style={styles.unlockDate}>
                      Unlocks: {new Date(note.unlockDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Notes to Delete</Text>
              <TouchableOpacity onPress={handleCancelDelete}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={notes.map(mapNoteToDisplayFormat)}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalNoteItem,
                    selectedNotes.includes(item.id) &&
                      styles.modalNoteItemSelected,
                  ]}
                  onPress={() => toggleNoteSelection(item.id)}
                >
                  <View style={styles.modalNoteContent}>
                    <View style={styles.modalNoteHeader}>
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color="#4A9EFF"
                      />
                      <Text style={styles.modalNoteTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.modalNoteCategory}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={styles.checkbox}>
                    {selectedNotes.includes(item.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  selectedNotes.length === 0 &&
                    styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleDeleteSelected}
                disabled={selectedNotes.length === 0}
              >
                <Text style={styles.modalDeleteText}>
                  Delete ({selectedNotes.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Input Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalContainer}>
            <View style={styles.pinModalHeader}>
              <Ionicons name="lock-closed" size={40} color="#4A9EFF" />
              <Text style={styles.pinModalTitle}>Enter PIN</Text>
              <Text style={styles.pinModalSubtitle}>
                Enter your device PIN to unlock this secret note
              </Text>
            </View>

            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                secureTextEntry
                keyboardType="numeric"
                placeholder="Enter PIN"
                placeholderTextColor="#999"
                maxLength={10}
                autoFocus
              />
            </View>

            <View style={styles.pinModalActions}>
              <TouchableOpacity
                style={styles.pinCancelButton}
                onPress={handlePinCancel}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pinUnlockButton,
                  pinInput.length < 4 && styles.pinUnlockButtonDisabled,
                ]}
                onPress={verifyPin}
                disabled={pinInput.length < 4}
              >
                <Text style={styles.pinUnlockText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddNote}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051E2C",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: "white",
    fontSize: 14,
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#051E2C",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A3A4A",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  filterContainer: {
    paddingVertical: 10,
  },
  filterScrollContainer: {
    paddingHorizontal: 20,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4A9EFF",
  },
  filterTabActive: {
    backgroundColor: "#4A9EFF",
  },
  filterTabText: {
    color: "#4A9EFF",
    fontSize: 14,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "white",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2E7CB8",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Notes Styles
  notesGrid: {
    paddingVertical: 10,
  },
  noteCard: {
    backgroundColor: "#1A3A4A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A4A5A",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  noteIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  noteCategory: {
    fontSize: 12,
    color: "#4A9EFF",
    fontWeight: "500",
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
    lineHeight: 22,
  },
  noteContent: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
    marginBottom: 12,
  },
  noteDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1A3A4A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2A4A5A",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  modalList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  modalNoteItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A4A5A",
  },
  modalNoteItemSelected: {
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    borderRadius: 8,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  modalNoteContent: {
    flex: 1,
  },
  modalNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  modalNoteTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
    marginLeft: 8,
  },
  modalNoteCategory: {
    fontSize: 12,
    color: "#4A9EFF",
    marginLeft: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4A9EFF",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#2A4A5A",
    alignItems: "center",
  },
  modalCancelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  modalDeleteButtonDisabled: {
    backgroundColor: "#4A4A4A",
  },
  modalDeleteText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  // PIN Modal Styles
  pinModalContainer: {
    backgroundColor: "#1A3A4A",
    borderRadius: 20,
    margin: 20,
    padding: 30,
    alignItems: "center",
  },
  pinModalHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  pinModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
    marginBottom: 8,
  },
  pinModalSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  pinInputContainer: {
    width: "100%",
    marginBottom: 30,
  },
  pinInput: {
    backgroundColor: "#2A4A5A",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: "white",
    textAlign: "center",
    letterSpacing: 4,
  },
  // Lock and Time Capsule Indicators
  lockIndicator: {
    marginLeft: "auto",
  },
  timeCapsuleIndicator: {
    marginLeft: "auto",
  },

  // Note Footer
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  // Unlock Date Text
  unlockDate: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // PIN Modal Actions
  pinModalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },

  pinCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2A4A5A",
    alignItems: "center",
  },

  pinCancelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },

  pinUnlockButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4A9EFF",
    alignItems: "center",
  },

  pinUnlockButtonDisabled: {
    backgroundColor: "#4A4A4A",
    opacity: 0.6,
  },

  pinUnlockText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  syncCount: {
    position: "absolute",
    top: -5,
    right: -10,
    backgroundColor: "#FF6B6B",
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
});

export default Beranda;
