import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getDateId } from '../utils/dateUtils';

class FirestoreService {
  constructor() {
    this.db = db;
  }

  /**
   * Ensure user document exists
   */
  async ensureUser(uid, userData = {}) {
    try {
      const userRef = doc(this.db, `users/${uid}`);
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        ...userData
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error ensuring user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create or update a chat day document
   */
  async ensureChatDay(uid, dateId) {
    try {
      const chatDayRef = doc(this.db, `users/${uid}/chats/${dateId}`);
      await setDoc(chatDayRef, {
        date: dateId,
        messageCount: 0,
        lastMessageAt: serverTimestamp(),
        summary: null
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error ensuring chat day:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a message to a chat day
   */
  async addMessage(uid, dateId, messageData) {
    try {
      // Ensure chat day exists first
      await this.ensureChatDay(uid, dateId);
      
      // Add the message
      const messagesRef = collection(this.db, `users/${uid}/chats/${dateId}/messages`);
      const messageRef = await addDoc(messagesRef, {
        ...messageData,
        ts: serverTimestamp()
      });

      // Update chat day counters
      const chatDayRef = doc(this.db, `users/${uid}/chats/${dateId}`);
      
      // Get current message count
      const chatDaySnap = await getDoc(chatDayRef);
      const currentCount = chatDaySnap.exists() ? chatDaySnap.data().messageCount || 0 : 0;
      
      await setDoc(chatDayRef, {
        messageCount: currentCount + 1,
        lastMessageAt: serverTimestamp()
      }, { merge: true });

      return { success: true, messageId: messageRef.id };
    } catch (error) {
      console.error('Error adding message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get messages for a specific chat day
   */
  async getMessages(uid, dateId) {
    try {
      const messagesRef = collection(this.db, `users/${uid}/chats/${dateId}/messages`);
      const q = query(messagesRef, orderBy('ts', 'asc'));
      const snapshot = await getDocs(q);
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.ts?.toDate() || new Date()
        });
      });

      return { success: true, messages };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  /**
   * Get recent chat days for a user
   */
  async getRecentChatDays(uid, limitCount = 14) {
    try {
      const chatsRef = collection(this.db, `users/${uid}/chats`);
      const q = query(chatsRef, orderBy('date', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const chatDays = [];
      snapshot.forEach(doc => {
        chatDays.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, chatDays };
    } catch (error) {
      console.error('Error getting recent chat days:', error);
      return { success: false, error: error.message, chatDays: [] };
    }
  }

  /**
   * Save or update a day reflection
   */
  async saveDayReflection(uid, dateId, reflectionData) {
    try {
      const reflectionRef = doc(this.db, `users/${uid}/dayReflections/${dateId}`);
      
      // Check if reflection already exists
      const existingSnap = await getDoc(reflectionRef);
      const isUpdate = existingSnap.exists();
      
      await setDoc(reflectionRef, {
        date: dateId,
        ...reflectionData,
        updatedAt: serverTimestamp(),
        ...(isUpdate ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error saving day reflection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a day reflection
   */
  async getDayReflection(uid, dateId) {
    try {
      const reflectionRef = doc(this.db, `users/${uid}/dayReflections/${dateId}`);
      const snapshot = await getDoc(reflectionRef);
      
      if (snapshot.exists()) {
        return { 
          success: true, 
          reflection: {
            id: snapshot.id,
            ...snapshot.data()
          }
        };
      } else {
        return { success: true, reflection: null };
      }
    } catch (error) {
      console.error('Error getting day reflection:', error);
      return { success: false, error: error.message, reflection: null };
    }
  }

  /**
   * Get recent day reflections
   */
  async getRecentReflections(uid, limitCount = 14) {
    try {
      const reflectionsRef = collection(this.db, `users/${uid}/dayReflections`);
      const q = query(reflectionsRef, orderBy('date', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const reflections = [];
      snapshot.forEach(doc => {
        reflections.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, reflections };
    } catch (error) {
      console.error('Error getting recent reflections:', error);
      return { success: false, error: error.message, reflections: [] };
    }
  }

  /**
   * Get chat day info (without messages)
   */
  async getChatDay(uid, dateId) {
    try {
      const chatDayRef = doc(this.db, `users/${uid}/chats/${dateId}`);
      const snapshot = await getDoc(chatDayRef);
      
      if (snapshot.exists()) {
        return { 
          success: true, 
          chatDay: {
            id: snapshot.id,
            ...snapshot.data()
          }
        };
      } else {
        return { success: true, chatDay: null };
      }
    } catch (error) {
      console.error('Error getting chat day:', error);
      return { success: false, error: error.message, chatDay: null };
    }
  }

  /**
   * Save or update daily highlights cache
   */
  async saveHighlightsCache(uid, period, highlightsData) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const cacheRef = doc(this.db, `users/${uid}/highlightsCache/${period}`);
      
      await setDoc(cacheRef, {
        period: period,
        lastUpdated: today,
        updatedAt: serverTimestamp(),
        highlights: highlightsData,
        createdAt: serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error saving highlights cache:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cached highlights for a period
   */
  async getHighlightsCache(uid, period) {
    try {
      const cacheRef = doc(this.db, `users/${uid}/highlightsCache/${period}`);
      const snapshot = await getDoc(cacheRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        const today = new Date().toISOString().split('T')[0];
        
        // Check if cache is from today
        const isToday = data.lastUpdated === today;
        
        return { 
          success: true, 
          cache: {
            id: snapshot.id,
            ...data,
            isValid: isToday
          }
        };
      } else {
        return { success: true, cache: null };
      }
    } catch (error) {
      console.error('Error getting highlights cache:', error);
      return { success: false, error: error.message, cache: null };
    }
  }

  /**
   * Check if highlights cache needs updating (not from today)
   */
  async needsHighlightsUpdate(uid, period) {
    try {
      const result = await this.getHighlightsCache(uid, period);
      if (!result.success) {
        return { success: false, needsUpdate: true };
      }
      
      // If no cache exists or cache is not from today, needs update
      const needsUpdate = !result.cache || !result.cache.isValid;
      
      return { success: true, needsUpdate };
    } catch (error) {
      console.error('Error checking highlights update need:', error);
      return { success: false, error: error.message, needsUpdate: true };
    }
  }

  /**
   * Get all chat messages across all dates for a user
   */
  async getAllChatMessages(uid, limitDays = null) {
    try {
      // First get all chat days
      const chatsRef = collection(this.db, `users/${uid}/chats`);
      let q;
      
      if (limitDays) {
        // Calculate date limit
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - limitDays);
        const limitDateId = limitDate.toISOString().split('T')[0];
        
        q = query(chatsRef, 
          where('date', '>=', limitDateId),
          orderBy('date', 'desc')
        );
      } else {
        q = query(chatsRef, orderBy('date', 'desc'));
      }
      
      const chatDaysSnapshot = await getDocs(q);
      
      const allMessages = [];
      const messagePromises = [];
      
      // Get messages for each chat day
      chatDaysSnapshot.forEach(chatDayDoc => {
        const dateId = chatDayDoc.id;
        const messagesRef = collection(this.db, `users/${uid}/chats/${dateId}/messages`);
        const messagesQuery = query(messagesRef, orderBy('ts', 'asc'));
        
        messagePromises.push(
          getDocs(messagesQuery).then(messagesSnapshot => {
            const dayMessages = [];
            messagesSnapshot.forEach(messageDoc => {
              const data = messageDoc.data();
              dayMessages.push({
                id: messageDoc.id,
                dateId: dateId,
                ...data,
                timestamp: data.ts?.toDate() || new Date()
              });
            });
            return dayMessages;
          })
        );
      });
      
      // Wait for all message queries to complete
      const messageArrays = await Promise.all(messagePromises);
      
      // Flatten and sort all messages by timestamp
      messageArrays.forEach(dayMessages => {
        allMessages.push(...dayMessages);
      });
      
      // Sort by timestamp (oldest first for context building)
      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      return { success: true, messages: allMessages };
    } catch (error) {
      console.error('Error getting all chat messages:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  /**
   * Get recent chat messages (last N days)
   */
  async getRecentChatMessages(uid, days = 30) {
    try {
      return await this.getAllChatMessages(uid, days);
    } catch (error) {
      console.error('Error getting recent chat messages:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }
}

export default new FirestoreService();
