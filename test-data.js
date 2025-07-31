// Test script to verify Firebase data structure
// Run this in the browser console on the admin page to debug data issues

async function testFirebaseData() {
  console.log("Testing Firebase data structure...");
  
  try {
    // Test reading_study_results collection
    const resultsSnapshot = await getDocs(collection(db, "reading_study_results"));
    console.log("reading_study_results collection:");
    console.log(`Total documents: ${resultsSnapshot.size}`);
    
    const resultsData = [];
    resultsSnapshot.forEach((doc) => {
      const data = doc.data();
      resultsData.push({
        id: doc.id,
        sessionId: data.sessionId,
        nickname: data.nickname,
        phase: data.phase,
        readingTime: data.readingTime,
        score: data.score,
        mistakeRatio: data.mistakeRatio,
        testGroup: data.testGroup,
        technique: data.technique
      });
    });
    
    console.log("Sample results:", resultsData.slice(0, 3));
    
    // Test users collection
    const usersSnapshot = await getDocs(collection(db, "users"));
    console.log("\nusers collection:");
    console.log(`Total documents: ${usersSnapshot.size}`);
    
    const usersData = [];
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Test user results subcollection
      const resultsSnapshot = await getDocs(collection(db, "users", userDoc.id, "results"));
      const userResults = {};
      
      resultsSnapshot.forEach((resultDoc) => {
        userResults[resultDoc.id] = resultDoc.data();
      });
      
      usersData.push({
        id: userDoc.id,
        nickname: userData.nickname,
        testGroup: userData.testGroup,
        technique: userData.technique,
        results: userResults
      });
    }
    
    console.log("Sample users:", usersData.slice(0, 3));
    
    // Validate data structure
    console.log("\nData validation:");
    
    const validResults = resultsData.filter(r => 
      r.sessionId && 
      r.nickname && 
      typeof r.phase === 'number' &&
      typeof r.readingTime === 'number' &&
      r.readingTime > 0
    );
    
    console.log(`Valid results: ${validResults.length}/${resultsData.length}`);
    
    const validUsers = usersData.filter(u => 
      u.results.phase1 && 
      u.results.phase2 &&
      typeof u.results.phase1.readingTime === 'number' &&
      typeof u.results.phase2.readingTime === 'number'
    );
    
    console.log(`Valid users: ${validUsers.length}/${usersData.length}`);
    
    return {
      results: resultsData,
      users: usersData,
      validResults,
      validUsers
    };
    
  } catch (error) {
    console.error("Error testing Firebase data:", error);
    return null;
  }
}

// Export for use in browser console
window.testFirebaseData = testFirebaseData;
