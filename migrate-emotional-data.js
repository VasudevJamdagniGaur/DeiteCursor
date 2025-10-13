// Migration script to move emotional data from localStorage to Firestore
// Run this in your browser console

console.log('🔄 Starting emotional data migration...');

// Get current user
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  console.error('❌ No user found. Please log in first.');
} else {
  console.log('✅ User found:', user.uid);
  
  // Get emotional data from localStorage
  const emotionalDataKey = `emotional_data_${user.uid}`;
  const emotionalData = JSON.parse(localStorage.getItem(emotionalDataKey) || '[]');
  
  console.log(`📊 Found ${emotionalData.length} emotional records in localStorage`);
  
  if (emotionalData.length === 0) {
    console.log('ℹ️ No emotional data found in localStorage');
  } else {
    console.log('📋 Emotional data samples:', emotionalData.slice(0, 3));
    
    // Show what we'll migrate
    console.log('🔄 Will migrate the following data:');
    emotionalData.forEach((record, index) => {
      console.log(`${index + 1}. ${record.date}: H:${record.happiness} E:${record.energy} A:${record.anxiety} S:${record.stress}`);
    });
    
    // Ask for confirmation
    const confirmMigration = confirm(`Found ${emotionalData.length} emotional records. Migrate to Firestore?`);
    
    if (confirmMigration) {
      console.log('🚀 Starting migration...');
      
      // Import firestoreService dynamically
      import('./src/services/firestoreService.js').then(async (module) => {
        const firestoreService = module.default;
        let migrated = 0;
        
        for (const record of emotionalData) {
          try {
            const result = await firestoreService.saveMoodChartNew(user.uid, record.date, {
              happiness: record.happiness,
              energy: record.energy,
              anxiety: record.anxiety,
              stress: record.stress
            });
            
            if (result.success) {
              migrated++;
              console.log(`✅ Migrated ${record.date}: H:${record.happiness} E:${record.energy} A:${record.anxiety} S:${record.stress}`);
            } else {
              console.error(`❌ Failed to migrate ${record.date}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Error migrating ${record.date}:`, error);
          }
        }
        
        console.log(`🎉 Migration complete! ${migrated}/${emotionalData.length} records migrated`);
        
        if (migrated > 0) {
          // Mark migration as complete
          localStorage.setItem('emotional_data_migrated', 'true');
          
          // Clear mood chart cache to force refresh
          const cacheKeys = Object.keys(localStorage).filter(key =>
            key.includes('emotional_wellbeing') || key.includes('moodChart')
          );
          cacheKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared cache:', key);
          });
          
          alert(`✅ Migration successful!\n\nMigrated ${migrated} emotional records to Firestore.\n\nPlease refresh the Emotional Wellbeing page to see your mood chart!`);
        }
      }).catch(error => {
        console.error('❌ Error importing firestoreService:', error);
        alert('❌ Migration failed. Please check console for details.');
      });
    } else {
      console.log('❌ Migration cancelled by user');
    }
  }
}
