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
  where,
  increment
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
   * Get all chat days for a user (for calendar display)
   */
  async getAllChatDays(uid) {
    try {
      console.log('📅 FIRESTORE: Getting all chat days for calendar...');
      
      const daysRef = collection(this.db, `users/${uid}/days`);
      const snapshot = await getDocs(daysRef);
      
      const chatDays = [];
      snapshot.forEach((doc) => {
        chatDays.push({
          id: doc.id,
          date: doc.id,
          ...doc.data()
        });
      });
      
      console.log('📅 FIRESTORE: Found', chatDays.length, 'chat days');
      console.log('📅 FIRESTORE: Sample chat days:', chatDays.slice(0, 3));
      return { success: true, chatDays };
    } catch (error) {
      console.error('❌ FIRESTORE: Error getting chat days:', error);
      return { success: false, error: error.message, chatDays: [] };
    }
  }

  /**
   * Get all reflection days for calendar indicators
   */
  async getAllReflectionDays(uid) {
    try {
      console.log('📅 FIRESTORE: Getting all reflection days for calendar...');
      
      // First try the new structure: users/{uid}/days/{dateId}/reflection/meta
      const daysRef = collection(this.db, `users/${uid}/days`);
      const snapshot = await getDocs(daysRef);
      
      const reflectionDays = [];
      
      // Check each day for reflection data
      for (const doc of snapshot.docs) {
        const dayData = doc.data();
        const dateId = doc.id;
        
        // Check if this day has reflection data in the new structure
        try {
          const reflectionRef = doc(this.db, `users/${uid}/days/${dateId}/reflection/meta`);
          const reflectionSnap = await getDoc(reflectionRef);
          
          if (reflectionSnap.exists()) {
            console.log('📅 FIRESTORE: Found reflection for', dateId);
            reflectionDays.push({
              id: dateId,
              date: dateId,
              ...dayData,
              hasReflection: true
            });
          }
        } catch (reflectionError) {
          console.log('📅 FIRESTORE: No reflection subcollection for', dateId);
        }
      }
      
      console.log('📅 FIRESTORE: Found', reflectionDays.length, 'reflection days in new structure');
      
      // If no reflections found in new structure, try old structure as fallback
      if (reflectionDays.length === 0) {
        console.log('📅 FIRESTORE: No reflections in new structure, trying old structure...');
        const reflectionDaysRef = collection(this.db, `users/${uid}/dayReflections`);
        const oldSnapshot = await getDocs(reflectionDaysRef);
        
        oldSnapshot.forEach((doc) => {
          reflectionDays.push({
            id: doc.id,
            date: doc.id,
            ...doc.data()
          });
        });
        
        console.log('📅 FIRESTORE: Found', reflectionDays.length, 'reflection days in old structure');
      }
      
      console.log('📅 FIRESTORE: Total reflection days:', reflectionDays.length);
      console.log('📅 FIRESTORE: Sample reflection days:', reflectionDays.slice(0, 3));
      return { success: true, reflectionDays };
    } catch (error) {
      console.error('❌ FIRESTORE: Error getting reflection days:', error);
      return { success: false, error: error.message, reflectionDays: [] };
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
   * NEW STRUCTURE: Save chat message to /users/{uid}/days/{dateId}/messages/{messageId}
   */
  async saveChatMessageNew(uid, dateId, messageData) {
    try {
      console.log('💾 FIRESTORE NEW: Saving chat message...');
      console.log('💾 FIRESTORE NEW: uid:', uid, 'dateId:', dateId, 'messageData:', messageData);
      
      // Create message in new structure
      const messageRef = doc(collection(this.db, `users/${uid}/days/${dateId}/messages`));
      await setDoc(messageRef, {
        role: messageData.sender === 'user' ? 'user' : 'assistant',
        text: messageData.text,
        ts: serverTimestamp()
      });

      console.log('💾 FIRESTORE NEW: Message saved with ID:', messageRef.id);

      // Update day info
      const dayRef = doc(this.db, `users/${uid}/days/${dateId}`);
      await setDoc(dayRef, {
        date: dateId,
        lastMessageAt: serverTimestamp(),
        messageCount: increment(1)
      }, { merge: true });

      console.log('💾 FIRESTORE NEW: Day info updated');
      return { success: true, messageId: messageRef.id };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error saving chat message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW STRUCTURE: Get chat messages from /users/{uid}/days/{dateId}/messages
   */
  async getChatMessagesNew(uid, dateId) {
    try {
      console.log('📖 FIRESTORE NEW: Getting chat messages...');
      const messagesRef = collection(this.db, `users/${uid}/days/${dateId}/messages`);
      const q = query(messagesRef, orderBy('ts', 'asc'));
      const snapshot = await getDocs(q);
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          sender: data.role === 'user' ? 'user' : 'ai',
          text: data.text,
          timestamp: data.ts?.toDate() || new Date()
        });
      });

      console.log('📖 FIRESTORE NEW: Retrieved', messages.length, 'messages');
      return { success: true, messages };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error getting chat messages:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  /**
   * NEW STRUCTURE: Save reflection to /users/{uid}/days/{dateId}/reflection/meta
   */
  async saveReflectionNew(uid, dateId, reflectionData) {
    try {
      console.log('💾 FIRESTORE NEW: Saving reflection...');
      const reflectionRef = doc(this.db, `users/${uid}/days/${dateId}/reflection/meta`);
      
      await setDoc(reflectionRef, {
        summary: reflectionData.summary,
        mood: reflectionData.mood || 'neutral',
        score: reflectionData.score || 50,
        insights: reflectionData.insights || [],
        updatedAt: serverTimestamp(),
        source: 'auto'
      });

      console.log('💾 FIRESTORE NEW: Reflection saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error saving reflection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW STRUCTURE: Get reflection from /users/{uid}/days/{dateId}/reflection/meta
   */
  async getReflectionNew(uid, dateId) {
    try {
      console.log('📖 FIRESTORE NEW: Getting reflection...');
      const reflectionRef = doc(this.db, `users/${uid}/days/${dateId}/reflection/meta`);
      const snapshot = await getDoc(reflectionRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('📖 FIRESTORE NEW: Found reflection:', data.summary);
        return { 
          success: true, 
          reflection: data.summary,
          fullData: data
        };
      } else {
        console.log('📖 FIRESTORE NEW: No reflection found');
        return { success: true, reflection: null };
      }
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error getting reflection:', error);
      return { success: false, error: error.message, reflection: null };
    }
  }

  /**
   * NEW STRUCTURE: Save mood chart data to /users/{uid}/days/{dateId}/moodChart/daily
   */
  async saveMoodChartNew(uid, dateId, moodData) {
    try {
      console.log('💾 FIRESTORE NEW: Saving mood chart...');
      const moodRef = doc(this.db, `users/${uid}/days/${dateId}/moodChart/daily`);
      
      await setDoc(moodRef, {
        happiness: moodData.happiness,
        anxiety: moodData.anxiety,
        stress: moodData.stress,
        energy: moodData.energy,
        updatedAt: serverTimestamp()
      });

      console.log('💾 FIRESTORE NEW: Mood chart saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error saving mood chart:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW STRUCTURE: Save emotional balance to /users/{uid}/days/{dateId}/emotionalBalance/daily
   */
  async saveEmotionalBalanceNew(uid, dateId, balanceData) {
    try {
      console.log('💾 FIRESTORE NEW: Saving emotional balance...');
      const balanceRef = doc(this.db, `users/${uid}/days/${dateId}/emotionalBalance/daily`);
      
      await setDoc(balanceRef, {
        positive: balanceData.positive,
        negative: balanceData.negative,
        neutral: balanceData.neutral,
        updatedAt: serverTimestamp()
      });

      console.log('💾 FIRESTORE NEW: Emotional balance saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error saving emotional balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW STRUCTURE: Get mood chart data for multiple days
   */
  async getMoodChartDataNew(uid, days = 7) {
    try {
      console.log(`📊 FIRESTORE NEW: Getting mood chart data for ${days} days...`);
      
      const moodData = [];
      
      // Get the current date ID in India timezone
      const todayDateId = getDateId(new Date());
      console.log(`📊 FIRESTORE NEW: Today's date ID (India timezone): ${todayDateId}`);
      
      // Parse today's date to get year, month, day
      const [todayYear, todayMonth, todayDay] = todayDateId.split('-').map(Number);
      
      // Get data for each day in the range
      for (let i = days - 1; i >= 0; i--) {
        // Create a date object from today's India timezone date and subtract days
        // Note: Month is 0-indexed in JavaScript Date
        const targetDate = new Date(todayYear, todayMonth - 1, todayDay - i);
        const dateId = targetDate.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
        console.log(`📊 FIRESTORE NEW: Checking mood data for date: ${dateId} (${i} days ago)`);
        
        try {
          const moodRef = doc(this.db, `users/${uid}/days/${dateId}/moodChart/daily`);
          const snapshot = await getDoc(moodRef);
          
          if (snapshot.exists()) {
            const data = snapshot.data();
            console.log(`📊 FIRESTORE NEW: ✅ Found mood data for ${dateId}:`, data);
            console.log(`📊 FIRESTORE NEW: ✅ Raw values - H:${data.happiness} E:${data.energy} A:${data.anxiety} S:${data.stress}`);
            console.log(`📊 FIRESTORE NEW: ✅ Firestore path was: users/${uid}/days/${dateId}/moodChart/daily`);
            
            const dayData = {
              date: dateId,
              day: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              happiness: data.happiness || 0,
              anxiety: data.anxiety || 0,
              stress: data.stress || 0,
              energy: data.energy || 0
            };
            
            console.log(`📊 FIRESTORE NEW: ✅ Pushing to array:`, dayData);
            moodData.push(dayData);
          } else {
            // No data for this day
            console.log(`📊 FIRESTORE NEW: ❌ No mood data for ${dateId}, using defaults`);
            console.log(`📊 FIRESTORE NEW: ❌ Checked path: users/${uid}/days/${dateId}/moodChart/daily`);
            console.log(`📊 FIRESTORE NEW: ❌ This means NO DATA was saved to Firestore for this date`);
            moodData.push({
              date: dateId,
              day: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              happiness: 0,
              anxiety: 0,
              stress: 0,
              energy: 0
            });
          }
        } catch (dayError) {
          console.error(`❌ Error getting mood data for ${dateId}:`, dayError);
          // Only add defaults if this is a permissions/network error, not if no data exists
          if (dayError.code === 'permission-denied' || dayError.code === 'unavailable') {
            moodData.push({
              date: dateId,
              day: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              happiness: 50,
              anxiety: 25,
              stress: 25,
              energy: 50
            });
          } else {
            // For other errors (like no data), add zeros
            moodData.push({
              date: dateId,
              day: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              happiness: 0,
              anxiety: 0,
              stress: 0,
              energy: 0
            });
          }
        }
      }
      
      console.log(`📊 FIRESTORE NEW: ✅ Retrieved mood data for ${moodData.length} days`);
      console.log(`📊 FIRESTORE NEW: ✅ Complete array:`, moodData);
      console.log(`📊 FIRESTORE NEW: ✅ Oct 8 data in array:`, moodData.find(d => d.day && d.day.includes('Oct 8')));
      return { success: true, moodData };
    } catch (error) {
      console.error('❌ FIRESTORE NEW: Error getting mood chart data:', error);
      return { success: false, error: error.message, moodData: [] };
    }
  }
}

export default new FirestoreService();
