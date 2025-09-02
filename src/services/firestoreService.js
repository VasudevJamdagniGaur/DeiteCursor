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
}

export default new FirestoreService();
