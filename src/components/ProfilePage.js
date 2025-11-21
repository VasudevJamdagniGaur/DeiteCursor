import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, signOutUser } from '../services/authService';
import firestoreService from '../services/firestoreService';
import Cropper from 'react-easy-crop';
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Edit3,
  Save,
  X,
  Heart,
  Sparkles,
  Star,
  Trash2,
  AlertTriangle,
  LogOut,
  Shield,
  Settings,
  Phone,
  MessageCircle,
  Camera,
  Image
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [pendingPicture, setPendingPicture] = useState(null);
  const [showPicturePreview, setShowPicturePreview] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [bioLastUpdated, setBioLastUpdated] = useState(null);
  const [isBioUpdating, setIsBioUpdating] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    age: '',
    gender: '',
    bio: ''
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setEditData({
        displayName: currentUser.displayName || '',
        age: localStorage.getItem(`user_age_${currentUser.uid}`) || '',
        gender: localStorage.getItem(`user_gender_${currentUser.uid}`) || '',
        bio: localStorage.getItem(`user_bio_${currentUser.uid}`) || ''
      });
      // Load profile picture from localStorage
      const savedPicture = localStorage.getItem(`user_profile_picture_${currentUser.uid}`);
      if (savedPicture) {
        setProfilePicture(savedPicture);
      }

      const savedBioUpdated = localStorage.getItem(`user_bio_updated_${currentUser.uid}`);
      if (savedBioUpdated) {
        setBioLastUpdated(savedBioUpdated);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      await ensureDailyBioSummary();
    };
    run();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let timer;
    const schedule = () => {
      const now = new Date();
      const nextWindow = getNext2AM();
      const delay = Math.max(nextWindow.getTime() - now.getTime(), 0);
      timer = setTimeout(async () => {
        const summary = await generateAutoBioSummary();
        if (summary) {
          persistBioSummary(summary);
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [user, editData.age, editData.gender]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Since Firebase Auth doesn't store custom profile data, 
      // we'll use localStorage for this demo
      localStorage.setItem(`user_age_${user.uid}`, editData.age);
      localStorage.setItem(`user_gender_${user.uid}`, editData.gender);
      localStorage.setItem(`user_bio_${user.uid}`, editData.bio);
      
      // Save profile picture if it exists
      if (profilePicture) {
        localStorage.setItem(`user_profile_picture_${user.uid}`, profilePicture);
        console.log('✅ Profile picture saved to localStorage');
      } else {
        // If profile picture was removed, clear it from localStorage
        localStorage.removeItem(`user_profile_picture_${user.uid}`);
        console.log('✅ Profile picture removed from localStorage');
      }

      // Trigger a custom event to notify other components (like Dashboard) of the change
      window.dispatchEvent(new Event('profilePictureUpdated'));

      setIsEditing(false);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      displayName: user?.displayName || '',
      age: localStorage.getItem(`user_age_${user?.uid}`) || '',
      gender: localStorage.getItem(`user_gender_${user?.uid}`) || '',
      bio: localStorage.getItem(`user_bio_${user?.uid}`) || ''
    });
    // Reset profile picture to saved version
    const savedPicture = localStorage.getItem(`user_profile_picture_${user?.uid}`);
    setProfilePicture(savedPicture || null);
    if (user) {
      const savedUpdated = localStorage.getItem(`user_bio_updated_${user.uid}`);
      setBioLastUpdated(savedUpdated || null);
    }
    setIsEditing(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingPicture(reader.result);
        setShowCropModal(true);
        setShowPicturePreview(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    if (user) {
      localStorage.removeItem(`user_profile_picture_${user.uid}`);
    }
    window.dispatchEvent(new Event('profilePictureUpdated'));
  };

  const getLast2AM = () => {
    const now = new Date();
    const last2AM = new Date(now);
    last2AM.setHours(2, 0, 0, 0);
    if (now < last2AM) {
      last2AM.setDate(last2AM.getDate() - 1);
    }
    return last2AM;
  };

  const getNext2AM = () => {
    const base = getLast2AM();
    base.setDate(base.getDate() + 1);
    return base;
  };

const TOPIC_CATEGORIES = [
  { name: 'work or studies', keywords: ['work', 'office', 'project', 'deadline', 'study', 'exam', 'college', 'school'] },
  { name: 'relationships', keywords: ['friend', 'family', 'mom', 'dad', 'partner', 'relationship', 'love', 'together'] },
  { name: 'wellbeing', keywords: ['health', 'anxiety', 'stress', 'therapy', 'sleep', 'rest', 'mind', 'wellbeing'] },
  { name: 'self-growth', keywords: ['goal', 'growth', 'improve', 'habit', 'plan', 'learn', 'progress'] },
  { name: 'creativity', keywords: ['music', 'art', 'draw', 'paint', 'write', 'creative', 'photography'] },
  { name: 'career decisions', keywords: ['career', 'job', 'interview', 'opportunity', 'startup'] },
];

const MOOD_KEYWORDS = {
  hopeful: ['hope', 'optimistic', 'excited', 'grateful', 'happy', 'joy'],
  stressed: ['stress', 'worried', 'anxious', 'tired', 'exhausted', 'overwhelmed'],
  reflective: ['thinking', 'reflect', 'ponder', 'journal', 'consider', 'realize'],
  determined: ['determined', 'driven', 'focused', 'ambition', 'goal'],
  overwhelmed: ['too much', 'can\'t handle', 'pressure', 'burnt', 'burned', 'burnout'],
};

  const canUpdateBioSummary = () => {
    if (!bioLastUpdated) return true;
    return new Date(bioLastUpdated) < getLast2AM();
  };

  const generateAutoBioSummary = async () => {
    const firstName = user?.displayName?.split(' ')[0] || 'You';
    const age = editData.age || localStorage.getItem(`user_age_${user?.uid}`) || '';
    const gender = editData.gender || localStorage.getItem(`user_gender_${user?.uid}`) || '';

    let summarySentence = null;
    if (user) {
      const insights = await analyzeUserChatHistory(user.uid);
      if (insights && insights.psychologicalInsights) {
        const psych = insights.psychologicalInsights;
        
        // Build sentences in priority order: emotional nature, overall vibe, thought patterns, coping style, core motivations, relationship style
        const orderedSentences = [
          psych.emotionalNature ? `${firstName} ${psych.emotionalNature}.` : null,
          psych.overallVibe ? `${firstName} ${psych.overallVibe}.` : null,
          psych.thoughtPatterns ? `${firstName} ${psych.thoughtPatterns}.` : null,
          psych.copingStyle ? `${firstName} ${psych.copingStyle}.` : null,
          psych.coreMotivations ? `${firstName} ${psych.coreMotivations}.` : null,
          psych.relationshipStyle ? `${firstName} ${psych.relationshipStyle}.` : null
        ].filter(Boolean);

        // Select top 2-3 most relevant insights
        if (orderedSentences.length > 0) {
          const selectedSentences = orderedSentences.slice(0, Math.min(3, orderedSentences.length));
          summarySentence = selectedSentences.join(' ');
        }
      }
    }

    if (summarySentence) {
      return summarySentence;
    }

    // Fallback if no insights available
    const moods = [
      'feel calm and reflective today',
      'are focused on steady growth',
      'are hopeful and optimistic',
      'are taking things one step at a time',
      'are balancing ambition with self-care',
      'are thoughtful and kind in your interactions',
      'bring grounded energy into conversations',
      'are ready to explore new ideas gently',
    ];
    const toneIndex = new Date().getDate() % moods.length;
    const tone = moods[toneIndex];
    const agePart = age ? `At ${age}, ` : '';
    const genderPart = gender ? `${gender} ` : '';
    return `${agePart}${firstName} (${genderPart.trim() || 'they'}) ${tone}.`;
  };

  const persistBioSummary = (summary) => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    localStorage.setItem(`user_bio_${user.uid}`, summary);
    localStorage.setItem(`user_bio_updated_${user.uid}`, timestamp);
    setBioLastUpdated(timestamp);
    setEditData((prev) => ({ ...prev, bio: summary }));
  };

  const ensureDailyBioSummary = async () => {
    if (!user) return;
    const updatedKey = `user_bio_updated_${user.uid}`;
    const lastUpdatedISO = localStorage.getItem(updatedKey);
    if (lastUpdatedISO) {
      setBioLastUpdated(lastUpdatedISO);
    }
    const needsRefresh =
      lastUpdatedISO ? new Date(lastUpdatedISO) < getLast2AM() : false;
    if (needsRefresh) {
      const summary = await generateAutoBioSummary();
      if (summary) {
        persistBioSummary(summary);
      }
    }
  };

  const handleManualBioUpdate = async () => {
    if (!canUpdateBioSummary()) {
      const nextWindow = getNext2AM();
      alert(`You can refresh this summary after ${nextWindow.toLocaleString()}.`);
      return;
    }
    setIsBioUpdating(true);
    const summary = await generateAutoBioSummary();
    if (summary) {
      persistBioSummary(summary);
    }
    setIsBioUpdating(false);
  };

  const handleConfirmPicture = () => {
    if (!pendingPicture) return;
    setProfilePicture(pendingPicture);
    if (user) {
      localStorage.setItem(`user_profile_picture_${user.uid}`, pendingPicture);
      window.dispatchEvent(new Event('profilePictureUpdated'));
    }
    setPendingPicture(null);
    setShowPicturePreview(false);
  };

  const handleCancelPictureSelection = () => {
    setPendingPicture(null);
    setShowPicturePreview(false);
  };

  const onCropComplete = (_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  };

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !pendingPicture) return;
    const croppedImage = await getCroppedImg(pendingPicture, croppedAreaPixels);
    setPendingPicture(croppedImage);
    setShowCropModal(false);
    setShowPicturePreview(true);
  };

  const handleCancelCrop = () => {
    setShowCropModal(false);
    setPendingPicture(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

const analyzeUserChatHistory = async (uid) => {
  try {
    const daysResult = await firestoreService.getAllChatDays(uid);
    if (!daysResult.success || !daysResult.chatDays?.length) {
      return null;
    }

    const sortedDays = [...daysResult.chatDays].sort((a, b) => {
      const da = (a.date || a.id || '').replace(/-/g, '');
      const db = (b.date || b.id || '').replace(/-/g, '');
      return db.localeCompare(da);
    });

    const daysToProcess = sortedDays.slice(0, 90);
    const topicCounts = TOPIC_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: 0 }), {});
    const moodCounts = Object.keys(MOOD_KEYWORDS).reduce((acc, mood) => ({ ...acc, [mood]: 0 }), {});
    
    // Psychological pattern analysis
    let totalMessages = 0;
    let totalWords = 0;
    let questionCount = 0;
    let selfReflectionCount = 0;
    let futureOrientedCount = 0;
    let pastOrientedCount = 0;
    let uncertaintyCount = 0;
    let certaintyCount = 0;
    let problemSolvingCount = 0;
    let emotionalDepthCount = 0;
    let relationshipMentionCount = 0;
    let allUserMessages = [];

    for (const day of daysToProcess) {
      const dateId = day.date || day.id;
      if (!dateId) continue;
      const messagesResult = await firestoreService.getChatMessagesNew(uid, dateId);
      if (!messagesResult?.success || !messagesResult.messages?.length) continue;

      for (const message of messagesResult.messages) {
        if (message.sender !== 'user' || !message.text) continue;
        totalMessages += 1;
        const text = message.text;
        const lower = text.toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
        allUserMessages.push(text);

        // Topic and mood analysis
        TOPIC_CATEGORIES.forEach((cat) => {
          if (cat.keywords.some(keyword => lower.includes(keyword))) {
            topicCounts[cat.name] += 1;
          }
        });

        Object.entries(MOOD_KEYWORDS).forEach(([mood, keywords]) => {
          if (keywords.some(keyword => lower.includes(keyword))) {
            moodCounts[mood] += 1;
          }
        });

        // Psychological pattern detection
        if (text.includes('?') || text.includes('wonder') || text.includes('curious') || text.includes('why') || text.includes('how')) {
          questionCount += 1;
        }

        if (lower.includes('i feel') || lower.includes('i think') || lower.includes('i realize') || lower.includes('i notice') || 
            lower.includes('i wonder') || lower.includes('i\'m') || lower.includes('myself') || lower.includes('self')) {
          selfReflectionCount += 1;
        }

        if (lower.includes('will') || lower.includes('going to') || lower.includes('plan') || lower.includes('future') || 
            lower.includes('hope') || lower.includes('want to') || lower.includes('goal')) {
          futureOrientedCount += 1;
        }

        if (lower.includes('was') || lower.includes('were') || lower.includes('remember') || lower.includes('past') || 
            lower.includes('used to') || lower.includes('before')) {
          pastOrientedCount += 1;
        }

        if (lower.includes('maybe') || lower.includes('perhaps') || lower.includes('might') || lower.includes('could') || 
            lower.includes('uncertain') || lower.includes('not sure') || lower.includes('doubt')) {
          uncertaintyCount += 1;
        }

        if (lower.includes('definitely') || lower.includes('certain') || lower.includes('sure') || lower.includes('know') || 
            lower.includes('always') || lower.includes('never')) {
          certaintyCount += 1;
        }

        if (lower.includes('solve') || lower.includes('fix') || lower.includes('handle') || lower.includes('deal with') || 
            lower.includes('manage') || lower.includes('approach') || lower.includes('strategy')) {
          problemSolvingCount += 1;
        }

        if (lower.includes('deep') || lower.includes('intense') || lower.includes('profound') || lower.includes('meaningful') || 
            lower.includes('significant') || lower.includes('powerful') || lower.includes('overwhelming')) {
          emotionalDepthCount += 1;
        }

        if (lower.includes('friend') || lower.includes('family') || lower.includes('partner') || lower.includes('relationship') || 
            lower.includes('people') || lower.includes('others') || lower.includes('they') || lower.includes('we')) {
          relationshipMentionCount += 1;
        }
      }
    }

    if (totalMessages < 5) {
      return null;
    }

    const topTopics = Object.entries(topicCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const moodRanking = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0);

    // Calculate psychological insights
    const avgWordsPerMessage = totalWords / totalMessages;
    const questionRatio = questionCount / totalMessages;
    const selfReflectionRatio = selfReflectionCount / totalMessages;
    const futureRatio = futureOrientedCount / totalMessages;
    const pastRatio = pastOrientedCount / totalMessages;
    const uncertaintyRatio = uncertaintyCount / totalMessages;
    const problemSolvingRatio = problemSolvingCount / totalMessages;
    const emotionalDepthRatio = emotionalDepthCount / totalMessages;
    const relationshipRatio = relationshipMentionCount / totalMessages;

    // Determine psychological patterns
    const psychologicalInsights = {
      emotionalNature: determineEmotionalNature(moodRanking, emotionalDepthRatio, moodCounts),
      thoughtPatterns: determineThoughtPatterns(questionRatio, selfReflectionRatio, avgWordsPerMessage, uncertaintyRatio),
      copingStyle: determineCopingStyle(problemSolvingRatio, moodRanking, moodCounts),
      coreMotivations: determineCoreMotivations(topTopics, futureRatio, pastRatio),
      relationshipStyle: determineRelationshipStyle(relationshipRatio, selfReflectionRatio),
      overallVibe: determineOverallVibe(moodRanking, emotionalDepthRatio, problemSolvingRatio, futureRatio)
    };

    return {
      topTopics,
      moodRanking,
      psychologicalInsights
    };
  } catch (error) {
    console.error('Error analyzing chat history:', error);
    return null;
  }
};

// Helper functions to determine psychological patterns
const determineEmotionalNature = (moodRanking, emotionalDepthRatio, moodCounts) => {
  if (moodRanking.length === 0) return null;
  
  const topMood = moodRanking[0][0];
  const isDeep = emotionalDepthRatio > 0.15;
  const isStressed = (moodCounts.stressed || 0) > (moodCounts.hopeful || 0);
  const isReflective = (moodCounts.reflective || 0) > 0;

  if (isDeep && isReflective) {
    return 'tends to experience emotions deeply and reflect on their inner world with thoughtful awareness';
  } else if (topMood === 'hopeful' && !isStressed) {
    return 'maintains a generally optimistic and forward-looking emotional outlook';
  } else if (topMood === 'stressed' || topMood === 'overwhelmed') {
    return 'is candid about emotional challenges and navigates stress with openness';
  } else if (topMood === 'reflective') {
    return 'approaches emotions with introspection and thoughtful consideration';
  } else if (topMood === 'determined') {
    return 'channels emotions into focused determination and growth-oriented energy';
  }
  return 'expresses emotions authentically and navigates feelings with genuine awareness';
};

const determineThoughtPatterns = (questionRatio, selfReflectionRatio, avgWordsPerMessage, uncertaintyRatio) => {
  const isCurious = questionRatio > 0.2;
  const isIntrospective = selfReflectionRatio > 0.3;
  const isDetailed = avgWordsPerMessage > 15;
  const isUncertain = uncertaintyRatio > 0.15;

  if (isCurious && isIntrospective) {
    return 'thinks through questions with curiosity and self-awareness, often exploring ideas from multiple angles';
  } else if (isCurious && !isIntrospective) {
    return 'approaches thinking with an inquisitive mind, seeking to understand the world around them';
  } else if (isIntrospective && isDetailed) {
    return 'engages in deep, reflective thinking with attention to nuance and detail';
  } else if (isUncertain && isIntrospective) {
    return 'thinks with openness to complexity, comfortable with uncertainty and multiple perspectives';
  } else if (isDetailed) {
    return 'thinks in a thorough and considered manner, paying attention to details and context';
  }
  return 'thinks with clarity and directness, processing experiences thoughtfully';
};

const determineCopingStyle = (problemSolvingRatio, moodRanking, moodCounts) => {
  const isProblemSolver = problemSolvingRatio > 0.2;
  const isStressed = (moodCounts.stressed || 0) > 0;
  const isResilient = (moodCounts.overwhelmed || 0) > 0 && (moodCounts.determined || 0) > 0;

  if (isProblemSolver && isResilient) {
    return 'copes by actively seeking solutions while maintaining resilience through challenges';
  } else if (isProblemSolver) {
    return 'copes by taking an action-oriented approach, focusing on practical solutions';
  } else if (isResilient) {
    return 'copes with challenges by staying resilient and finding strength in difficult moments';
  } else if (isStressed) {
    return 'copes by being open about difficulties and processing stress through expression';
  }
  return 'copes with life\'s challenges through thoughtful reflection and adaptive responses';
};

const determineCoreMotivations = (topTopics, futureRatio, pastRatio) => {
  const isFutureFocused = futureRatio > pastRatio + 0.1;
  const isPastReflective = pastRatio > futureRatio + 0.1;
  const hasGrowthTopics = topTopics.some(t => t === 'self-growth' || t === 'career decisions');

  if (isFutureFocused && hasGrowthTopics) {
    return 'is driven by growth and forward momentum, actively working toward future goals';
  } else if (isFutureFocused) {
    return 'is motivated by future possibilities and maintaining a sense of forward direction';
  } else if (isPastReflective) {
    return 'draws motivation from reflection on past experiences and learning from them';
  } else if (hasGrowthTopics) {
    return 'is motivated by personal development and continuous improvement';
  }
  return 'finds motivation in meaningful connections and authentic experiences';
};

const determineRelationshipStyle = (relationshipRatio, selfReflectionRatio) => {
  const isSocial = relationshipRatio > 0.3;
  const isSelfAware = selfReflectionRatio > 0.25;

  if (isSocial && isSelfAware) {
    return 'navigates relationships with self-awareness and thoughtful consideration of others';
  } else if (isSocial) {
    return 'values connections with others and invests in meaningful relationships';
  } else if (isSelfAware) {
    return 'has a strong relationship with self, engaging in regular self-reflection and inner awareness';
  }
  return 'balances connection with others and personal inner work';
};

const determineOverallVibe = (moodRanking, emotionalDepthRatio, problemSolvingRatio, futureRatio) => {
  if (moodRanking.length === 0) return null;
  
  const topMood = moodRanking[0][0];
  const isDeep = emotionalDepthRatio > 0.15;
  const isProactive = problemSolvingRatio > 0.2;
  const isForwardLooking = futureRatio > 0.25;

  if (topMood === 'hopeful' && isForwardLooking && isProactive) {
    return 'carries an optimistic and proactive energy, moving forward with hope and intention';
  } else if (topMood === 'reflective' && isDeep) {
    return 'maintains a thoughtful and introspective vibe, engaging deeply with inner experiences';
  } else if (topMood === 'determined' && isProactive) {
    return 'radiates focused determination and purposeful energy';
  } else if (isDeep && topMood !== 'stressed') {
    return 'brings depth and authenticity to emotional experiences';
  } else if (topMood === 'hopeful') {
    return 'maintains a hopeful and forward-looking perspective';
  }
  return 'brings genuine presence and authentic engagement to life\'s experiences';
};

const buildListSentence = (items) => {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const start = items.slice(0, -1).join(', ');
  return `${start}, and ${items[items.length - 1]}`;
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/png');
};

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/landing');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleteLoading(true);
    try {
      // Clear local storage data
      localStorage.removeItem(`user_age_${user.uid}`);
      localStorage.removeItem(`user_gender_${user.uid}`);
      localStorage.removeItem(`user_bio_${user.uid}`);
      localStorage.removeItem(`user_profile_picture_${user.uid}`);
      
      // Sign out and redirect
      await signOutUser();
      alert('Account data cleared successfully.');
      navigate('/landing');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getGenderEmoji = (gender) => {
    switch (gender) {
      case 'female': return '👩';
      case 'male': return '👨';
      case 'other': return '🌈';
      default: return '👤';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!user) return null;

  return (
    <>
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: isDarkMode
          ? "#202124"
          : "#FAFAF8",
      }}
    >
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-8 opacity-10">
          <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <div className="absolute top-16 right-12 opacity-12">
          <Sparkles className="w-7 h-7 animate-bounce" style={{ color: "#8AB4F8", animationDuration: '3s' }} />
        </div>
        <div className="absolute bottom-24 left-16 opacity-11">
          <Star className="w-5 h-5 animate-pulse" style={{ color: "#81C995", animationDelay: '1s' }} />
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-8">
          <Star className="w-4 h-4 animate-bounce" style={{ color: "#FDD663", animationDelay: '2s', animationDuration: '4s' }} />
        </div>
        <div className="absolute bottom-1/3 left-1/5 opacity-9">
          <Heart className="w-5 h-5 animate-pulse" style={{ color: "#F28B82", animationDelay: '1.5s' }} />
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#8AB4F8" }} strokeWidth={1.5} />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Your Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Profile Header */}
          <div className="text-center pb-6 border-b border-gray-700/30">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white relative overflow-hidden"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.8)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user.displayName)
                  )}
                </div>
                {/* Change Picture Button - Always available */}
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                  style={{
                    backgroundColor: "rgba(138, 180, 248, 0.9)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    border: "2px solid rgba(42, 42, 45, 0.8)",
                  }}
                  title="Change profile picture"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
                {/* Remove Picture Button - Only show in edit mode and if picture exists */}
                {isEditing && profilePicture && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                    style={{
                      backgroundColor: "rgba(242, 139, 130, 0.9)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                    title="Remove picture"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {user.displayName || 'User'}
            </h2>
            <p className="text-gray-300 text-sm">
              {user.email}
            </p>
          </div>

          {!isEditing ? (
            <>
              {/* Display Mode */}
              <div className="space-y-4 mt-6">
                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Display Name</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {user.displayName || 'Not set'}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Age</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {editData.age ? `${editData.age} years old` : 'Not set'}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Gender</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getGenderEmoji(editData.gender)} {editData.gender || 'Not set'}
                    </span>
                  </div>
                </div>

              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 py-3 px-4 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
                style={{
                  backgroundColor: "rgba(42, 42, 45, 0.8)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Edit3 className="w-4 h-4 inline mr-2" />
                Edit Profile
              </button>
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-300">Age</label>
                  <input
                    type="number"
                    value={editData.age}
                    onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    style={{
                      backgroundColor: "rgba(42, 42, 45, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                    placeholder="Enter your age"
                    min="13"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block mb-3 font-medium text-gray-300">Gender</label>
                  <div className="space-y-2">
                    {[
                      { value: 'female', label: 'Female 👩' },
                      { value: 'male', label: 'Male 👨' },
                      { value: 'other', label: 'Other 🌈' },
                    ].map((option) => (
                      <label key={option.value} className="cursor-pointer block">
                        <input
                          type="radio"
                          name="gender"
                          value={option.value}
                          checked={editData.gender === option.value}
                          onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                          className="sr-only"
                        />
                        <div
                          className={`p-3 text-center rounded-xl border-2 transition-all duration-300 font-medium ${
                            editData.gender === option.value
                              ? 'border-purple-400 text-white'
                              : 'border-gray-600 text-gray-300 hover:border-gray-500'
                          }`}
                          style={{
                            backgroundColor: editData.gender === option.value
                              ? "rgba(129, 201, 149, 0.2)"
                              : "rgba(42, 42, 45, 0.6)",
                          }}
                        >
                          {option.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-300 border border-gray-600 hover:bg-gray-700/20 transition-all duration-300"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Static About Me Section */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-gray-300">About Me</span>
          </div>
          <p className="text-white mb-2">
            {editData.bio || 'No bio added yet'}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Automatically refreshed daily at 02:00 AM to reflect your latest overall vibe.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-xs text-gray-500">
              Last updated:{' '}
              {bioLastUpdated
                ? new Date(bioLastUpdated).toLocaleString()
                : 'Never'}
            </span>
            <button
              onClick={handleManualBioUpdate}
              disabled={isBioUpdating || !canUpdateBioSummary()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                backgroundColor: canUpdateBioSummary()
                  ? "rgba(129, 201, 149, 0.3)"
                  : "rgba(99, 102, 241, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {isBioUpdating
                ? 'Updating...'
                : canUpdateBioSummary()
                ? 'Update summary now'
                : 'Locked until 02:00 AM'}
            </button>
          </div>
        </div>
        {/* Actions Card */}
        <div
          className="backdrop-blur-lg border rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: "#8AB4F8" }} />
            Account Actions
          </h3>

          <button
            onClick={handleSignOut}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-gray-400">Sign out of your account</p>
              </div>
            </div>
          </button>
        </div>

        {/* Helpdesk Section */}
        <div
          className="backdrop-blur-lg border rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(129, 201, 149, 0.15)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            Helpdesk
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            Contact our founders for support and assistance
          </p>

          <button
            onClick={() => window.open('tel:9536138120', '_self')}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">Call Founders</p>
                <p className="text-sm text-gray-400">Call us at +91 9536138120</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.open('https://wa.me/919536138120', '_blank')}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">WhatsApp Message</p>
                <p className="text-sm text-gray-400">Send us a message on WhatsApp</p>
              </div>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(242, 139, 130, 0.15)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(242, 139, 130, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Danger Zone</h3>
            <p className="text-gray-300 mb-6">
              Clear your account data permanently
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
                style={{
                  backgroundColor: "rgba(242, 139, 130, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Clear Account Data
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-xl border-2 border-dashed border-red-500/50"
                  style={{
                    backgroundColor: "rgba(242, 139, 130, 0.08)",
                    border: "1px solid rgba(242, 139, 130, 0.15)",
                  }}
                >
                  <p className="text-sm text-red-300 mb-4">
                    <strong>Warning:</strong> This will clear your profile data, but your account will remain active. You can always add new information later.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50"
                      style={{
                        backgroundColor: "rgba(242, 139, 130, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      {deleteLoading ? 'Clearing...' : 'Yes, Clear Data'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-300 border border-gray-600 hover:bg-gray-700/20 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showCropModal && pendingPicture && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70"
          onClick={handleCancelCrop}
        />
        <div
          className="relative z-10 w-full max-w-xl rounded-3xl p-6 space-y-6"
          style={{
            backgroundColor: "rgba(18, 18, 18, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
          }}
        >
          <h3 className="text-xl font-semibold text-white text-center">Adjust your photo</h3>
          <p className="text-center text-gray-400 text-sm">
            Drag the image or pinch/scroll to zoom. Everything inside the circle will appear on your profile.
          </p>
          <div className="relative w-full h-72 bg-black rounded-2xl overflow-hidden">
            <Cropper
              image={pendingPicture}
              crop={crop}
              zoom={zoom}
              aspect={1}
              showGrid={false}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 w-16">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#8AB4F8]"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleCancelCrop}
              className="flex-1 py-3 rounded-2xl font-semibold text-white border border-gray-600 hover:bg-gray-700/40 transition-all duration-200"
            >
              Retake
            </button>
            <button
              onClick={handleApplyCrop}
              className="flex-1 py-3 rounded-2xl font-semibold text-black"
              style={{
                backgroundColor: "#8AB4F8",
                boxShadow: "0 10px 20px rgba(138, 180, 248, 0.35)",
              }}
            >
              Crop & Continue
            </button>
          </div>
        </div>
      </div>
    )}

    {showPicturePreview && pendingPicture && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70"
          onClick={handleCancelPictureSelection}
        />
        <div
          className="relative z-10 w-full max-w-md rounded-3xl p-6 space-y-6"
          style={{
            backgroundColor: "rgba(18, 18, 18, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
          }}
        >
          <h3 className="text-xl font-semibold text-white text-center">Preview your photo</h3>
          <p className="text-center text-gray-400 text-sm">
            Everything inside the circle will appear on your profile.
          </p>
          <div className="flex justify-center">
            <div
              className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl"
              style={{
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <img
                src={pendingPicture}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleCancelPictureSelection}
              className="flex-1 py-3 rounded-2xl font-semibold text-white border border-gray-600 hover:bg-gray-700/40 transition-all duration-200"
            >
              Retake
            </button>
            <button
              onClick={handleConfirmPicture}
              className="flex-1 py-3 rounded-2xl font-semibold text-black"
              style={{
                backgroundColor: "#8AB4F8",
                boxShadow: "0 10px 20px rgba(138, 180, 248, 0.35)",
              }}
            >
              Use Photo
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
