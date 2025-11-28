import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import NetInfo from '@react-native-community/netinfo';

// Constants
const API_BASE_URL = 'https://memento-qr91.onrender.com';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const NOTES_KEY = 'cached_notes';
const PENDING_NOTES_KEY = 'pending_notes'; // For offline notes
const SYNC_QUEUE_KEY = 'sync_queue'; // For sync operations

// Types
export interface User {
  id: string;
  email: string;
  fullName?: string;
  profilePicture?: string;
  gender?: string;
  birthDate?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  mood?: string;
  moodEmoji?: string;
  selectedIcon?: string;
  isLocked?: boolean;
  isTimeCapsule?: boolean;
  unlockDate?: string | Date;
  createdAt: string | Date;
  userId: string;
  isOffline?: boolean; // Flag to identify offline notes
  tempId?: string; // Temporary ID for offline notes
}

export interface PendingNote extends Omit<Note, 'id' | 'userId'> {
  tempId: string;
  isOffline: true;
}

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface SignUpEmailParams {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInEmailParams {
  email: string;
  password: string;
}

// Helper function to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Network utility
export const NetworkUtils = {
  async isConnected(): Promise<boolean | null> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected && netInfo.isInternetReachable;
    } catch (error) {
      console.warn('Network check failed:', error);
      return false;
    }
  },

  // Subscribe to network changes
  subscribe(callback: (isConnected: boolean | null) => void) {
    return NetInfo.addEventListener(state => {
      callback(state.isConnected && state.isInternetReachable);
    });
  }
};

// Helper function to get file extension from URI
const getFileExtension = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  return extension || 'jpg';
};

// Helper function to convert image URI to base64 (for React Native)
const getImageAsBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

// Storage Service for Supabase
export const StorageService = {
  async uploadProfilePicture(imageUri: string): Promise<string> {
    try {
      const fileExtension = getFileExtension(imageUri);
      const fileName = `${generateUUID()}.${fileExtension}`;
      const base64Data = await getImageAsBase64(imageUri);

      const { data, error } = await supabase.storage
        .from('users_storage')
        .upload(fileName, decode(base64Data), {
          contentType: `image/${fileExtension}`,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('users_storage')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  async deleteProfilePicture(imageUrl: string): Promise<void> {
    try {
      const fileName = imageUrl.split('/').pop();
      if (!fileName) return;

      const { error } = await supabase.storage
        .from('users_storage')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting profile picture:', error);
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
    }
  }
};

// Enhanced Token Manager with offline support
export const TokenManager = {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  },

  async saveNotesToCache(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes to cache:', error);
      throw error;
    }
  },

  async getCachedNotes(): Promise<Note[]> {
    try {
      const notesData = await AsyncStorage.getItem(NOTES_KEY);
      return notesData ? JSON.parse(notesData) : [];
    } catch (error) {
      console.error('Error getting cached notes:', error);
      return [];
    }
  },

  async clearCachedNotes(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTES_KEY);
    } catch (error) {
      console.error('Error clearing cached notes:', error);
      throw error;
    }
  },

  // New methods for offline support
  async savePendingNotes(notes: PendingNote[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving pending notes:', error);
      throw error;
    }
  },

  async getPendingNotes(): Promise<PendingNote[]> {
    try {
      const notesData = await AsyncStorage.getItem(PENDING_NOTES_KEY);
      return notesData ? JSON.parse(notesData) : [];
    } catch (error) {
      console.error('Error getting pending notes:', error);
      return [];
    }
  },

  async clearPendingNotes(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_NOTES_KEY);
    } catch (error) {
      console.error('Error clearing pending notes:', error);
      throw error;
    }
  },

  async saveSyncQueue(operations: SyncOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(operations));
    } catch (error) {
      console.error('Error saving sync queue:', error);
      throw error;
    }
  },

  async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  },

  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      throw error;
    }
  },

  async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        this.removeToken(),
        this.removeUser(),
        this.clearCachedNotes(),
        this.clearPendingNotes(),
        this.clearSyncQueue()
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }
};

// Auth Service (keeping existing code)
export const AuthService = {
  async signUpWithEmail(params: SignUpEmailParams): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      await TokenManager.saveToken(data.token);
      await TokenManager.saveUser(data.user);

      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  async signInWithEmail(params: SignInEmailParams): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      await TokenManager.saveToken(data.token);
      await TokenManager.saveUser(data.user);

      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async signUpWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sign-up/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google sign up failed');
      }

      await TokenManager.saveToken(data.token);
      await TokenManager.saveUser(data.user);

      return data;
    } catch (error) {
      console.error('Google sign up error:', error);
      throw error;
    }
  },

  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sign-in/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google sign in failed');
      }

      await TokenManager.saveToken(data.token);
      await TokenManager.saveUser(data.user);

      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await TokenManager.clearAuthData();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await TokenManager.getToken();
      return !!token;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      return await TokenManager.getUser();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
};

// Enhanced API Service with offline support
export const ApiService = {
  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    try {
      const token = await TokenManager.getToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await TokenManager.clearAuthData();
        throw new Error('Authentication expired. Please log in again.');
      }

      return response;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  },

  async getUserProfile(): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest('/user');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user profile');
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  },

  async updateUserProfile(updateData: Partial<User>, profileImageUri?: string): Promise<User> {
    try {
      let profilePictureUrl = updateData.profilePicture;

      if (profileImageUri) {
        try {
          const currentUser = await TokenManager.getUser();
          if (currentUser?.profilePicture) {
            await StorageService.deleteProfilePicture(currentUser.profilePicture);
          }

          profilePictureUrl = await StorageService.uploadProfilePicture(profileImageUri);
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          throw new Error('Failed to upload profile picture');
        }
      }

      const dataToUpdate = {
        ...updateData,
        ...(profilePictureUrl && { profilePicture: profilePictureUrl })
      };

      const response = await this.makeAuthenticatedRequest('/user', {
        method: 'PATCH',
        body: JSON.stringify(dataToUpdate),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user profile');
      }

      await TokenManager.saveUser(data.user);

      return data.user;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  },

  // Enhanced note methods with offline support
  async getAllNotes(forceRefresh: boolean = false): Promise<Note[]> {
    try {
      const isConnected = await NetworkUtils.isConnected();

      // Get cached and pending notes
      const [cachedNotes, pendingNotes] = await Promise.all([
        TokenManager.getCachedNotes(),
        TokenManager.getPendingNotes()
      ]);

      // If offline or no force refresh, return combined cached and pending notes
      if (!isConnected || (!forceRefresh && !navigator.onLine)) {
        return [
          ...cachedNotes,
          ...pendingNotes.map(note => ({
            ...note,
            id: note.tempId,
            userId: 'temp',
            isOffline: true
          }))
        ];
      }

      // Try to sync pending notes if online
      if (pendingNotes.length > 0) {
        await this.syncPendingNotes();
      }

      // Fetch fresh notes from server
      const response = await this.makeAuthenticatedRequest('/notes');
      const serverNotes = await response.json();

      if (!response.ok) {
        throw new Error(serverNotes.error || 'Failed to fetch notes');
      }

      // Cache the fresh notes
      await TokenManager.saveNotesToCache(serverNotes);

      // Get updated pending notes after sync
      const remainingPendingNotes = await TokenManager.getPendingNotes();

      // Combine server notes with any remaining pending notes
      return [
        ...serverNotes,
        ...remainingPendingNotes.map(note => ({
          ...note,
          id: note.tempId,
          userId: 'temp',
          isOffline: true
        }))
      ];
    } catch (error) {
      console.error('Get all notes error:', error);

      // Return cached and pending notes as fallback
      const [cachedNotes, pendingNotes] = await Promise.all([
        TokenManager.getCachedNotes(),
        TokenManager.getPendingNotes()
      ]);

      return [
        ...cachedNotes,
        ...pendingNotes.map(note => ({
          ...note,
          id: note.tempId,
          userId: 'temp',
          isOffline: true
        }))
      ];
    }
  },

  async getNoteById(id: string): Promise<Note> {
    try {
      // Check if it's an offline note first
      const pendingNotes = await TokenManager.getPendingNotes();
      const offlineNote = pendingNotes.find(note => note.tempId === id);

      if (offlineNote) {
        return {
          ...offlineNote,
          id: offlineNote.tempId,
          userId: 'temp',
          isOffline: true
        };
      }

      // Try to get from API
      const response = await this.makeAuthenticatedRequest(`/notes/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get note');
      }

      return data;
    } catch (error) {
      console.error('Get note by ID error:', error);
      throw error;
    }
  },

  async createNote(noteData: Partial<Note>): Promise<Note> {
    try {
      const isConnected = await NetworkUtils.isConnected();
      const currentUser = await TokenManager.getUser();

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (isConnected) {
        // Online: Create note directly
        try {
          const response = await this.makeAuthenticatedRequest('/notes', {
            method: 'POST',
            body: JSON.stringify(noteData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create note');
          }

          // Update cache
          await this.getAllNotes(true);
          return data;
        } catch (apiError) {
          console.warn('API create failed, saving offline:', apiError);
          // Fallback to offline creation
          return this.createOfflineNote(noteData, currentUser);
        }
      } else {
        // Offline: Save note locally
        return this.createOfflineNote(noteData, currentUser);
      }
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  },

  async createOfflineNote(noteData: Partial<Note>, user: User): Promise<Note> {
    try {
      const tempId = generateUUID();
      const now = new Date().toISOString();

      const offlineNote: PendingNote = {
        tempId,
        title: noteData.title || '',
        content: noteData.content || '',
        color: noteData.color,
        mood: noteData.mood,
        moodEmoji: noteData.moodEmoji,
        selectedIcon: noteData.selectedIcon,
        isLocked: noteData.isLocked || false,
        isTimeCapsule: noteData.isTimeCapsule || false,
        unlockDate: noteData.unlockDate,
        createdAt: now,
        isOffline: true
      };

      // Save to pending notes
      const pendingNotes = await TokenManager.getPendingNotes();
      pendingNotes.push(offlineNote);
      await TokenManager.savePendingNotes(pendingNotes);

      // Add to sync queue
      const syncQueue = await TokenManager.getSyncQueue();
      syncQueue.push({
        id: tempId,
        type: 'CREATE',
        data: offlineNote,
        timestamp: now
      });
      await TokenManager.saveSyncQueue(syncQueue);

      return {
        ...offlineNote,
        id: tempId,
        userId: user.id,
        isOffline: true
      };
    } catch (error) {
      console.error('Create offline note error:', error);
      throw error;
    }
  },

  async updateNote(id: string, updateData: Partial<Note>): Promise<Note> {
    try {
      const isConnected = await NetworkUtils.isConnected();

      if (isConnected) {
        const response = await this.makeAuthenticatedRequest(`/notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update note');
        }

        await this.getAllNotes(true);
        return data;
      } else {
        throw new Error('Cannot update notes while offline');
      }
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  },

  async deleteNote(id: string): Promise<void> {
    try {
      const isConnected = await NetworkUtils.isConnected();

      // Check if it's an offline note
      const pendingNotes = await TokenManager.getPendingNotes();
      const offlineNoteIndex = pendingNotes.findIndex(note => note.tempId === id);

      if (offlineNoteIndex !== -1) {
        // Remove from pending notes
        pendingNotes.splice(offlineNoteIndex, 1);
        await TokenManager.savePendingNotes(pendingNotes);

        // Remove from sync queue
        const syncQueue = await TokenManager.getSyncQueue();
        const filteredQueue = syncQueue.filter(op => op.id !== id);
        await TokenManager.saveSyncQueue(filteredQueue);
        return;
      }

      if (isConnected) {
        const response = await this.makeAuthenticatedRequest(`/notes/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete note');
        }

        await this.getAllNotes(true);
      } else {
        throw new Error('Cannot delete synced notes while offline');
      }
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  },

  async deleteMultipleNotes(noteIds: string[]): Promise<void> {
    try {
      const deletePromises = noteIds.map(id => this.deleteNote(id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Delete multiple notes error:', error);
      throw error;
    }
  },

  // Sync methods
  async syncPendingNotes(): Promise<{ success: number; failed: number }> {
    let syncQueue: SyncOperation[] = [];

    try {
      const isConnected = await NetworkUtils.isConnected();
      if (!isConnected) {
        console.log('No internet connection, skipping sync');
        return { success: 0, failed: 0 };
      }

      syncQueue = await TokenManager.getSyncQueue();
      if (syncQueue.length === 0) {
        return { success: 0, failed: 0 };
      }

      let successCount = 0;
      let failedCount = 0;
      const remainingQueue: SyncOperation[] = [];

      for (const operation of syncQueue) {
        try {
          if (operation.type === 'CREATE') {
            // Remove temp fields before syncing
            const { tempId, isOffline, ...noteDataToSync } = operation.data;

            const response = await this.makeAuthenticatedRequest('/notes', {
              method: 'POST',
              body: JSON.stringify(noteDataToSync),
            });

            if (response.ok) {
              successCount++;
              // Remove from pending notes
              const pendingNotes = await TokenManager.getPendingNotes();
              const filteredPending = pendingNotes.filter(note => note.tempId !== operation.id);
              await TokenManager.savePendingNotes(filteredPending);
            } else {
              failedCount++;
              remainingQueue.push(operation);
            }
          }
        } catch (syncError) {
          console.error('Sync operation failed:', syncError);
          failedCount++;
          remainingQueue.push(operation);
        }
      }

      // Update sync queue with failed operations
      await TokenManager.saveSyncQueue(remainingQueue);

      // Refresh notes cache if any sync was successful
      if (successCount > 0) {
        await this.getAllNotes(true);
      }

      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Sync pending notes error:', error);
      return { success: 0, failed: syncQueue.length };
    }
  },

  async getPendingSyncCount(): Promise<number> {
    try {
      const syncQueue = await TokenManager.getSyncQueue();
      return syncQueue.length;
    } catch (error) {
      console.error('Get pending sync count error:', error);
      return 0;
    }
  }
};