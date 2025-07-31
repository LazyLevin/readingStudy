# Troubleshooting Chart Data Issues

## Problem
The graphs and statistics in the admin tab are not showing any data, even though the list with data is filled.

## Possible Causes and Solutions

### 1. Firebase Data Structure Issues

**Check if data is being saved correctly:**
- Go to the admin page
- Open browser console (F12)
- Run: `testFirebaseData()` (if the test script is loaded)
- Check the console output for data validation results

**Expected data structure:**
\`\`\`javascript
// reading_study_results collection
{
  sessionId: "string",
  nickname: "string", 
  phase: 1 or 2,
  readingTime: number,
  score: number,
  mistakeRatio: number,
  testGroup: number,
  technique: "string"
}

// users collection with subcollections
users/{userId} = {
  nickname: "string",
  testGroup: number,
  technique: "string"
}

users/{userId}/results/phase1 = {
  readingTime: number,
  score: number,
  mistakeRatio: number
}

users/{userId}/results/phase2 = {
  readingTime: number,
  score: number,
  mistakeRatio: number
}
\`\`\`

### 2. Environment Variables

**Check if Firebase is properly configured:**
- Verify that all Firebase environment variables are set in `.env.local`:
  \`\`\`
  NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
  \`\`\`

### 3. Data Validation Issues

**Check the debug information:**
- The admin page now shows debug information at the top
- Look for warnings about "No valid results found"
- Check the data counts for each chart type

### 4. Chart Data Preparation

**Common issues:**
- Data type mismatches (strings vs numbers)
- Missing required fields
- Division by zero in calculations
- Invalid data filtering

**Debug steps:**
1. Check browser console for error messages
2. Look at the debug information panel
3. Verify that both phase1 and phase2 data exist for each user
4. Ensure readingTime values are positive numbers

### 5. Firebase Rules

**Check Firebase security rules:**
- Ensure the admin user has read access to all collections
- Verify that the authentication is working properly

### 6. Manual Data Verification

**Test with sample data:**
1. Complete the reading study as a test user
2. Check if data appears in Firebase console
3. Verify the data structure matches expectations
4. Check if the admin page can fetch the data

### 7. Chart Library Issues

**If charts still don't render:**
- Check if Recharts library is properly installed
- Verify that ResponsiveContainer has proper dimensions
- Check for JavaScript errors in console

## Quick Fix Steps

1. **Clear browser cache and reload**
2. **Check Firebase console** to verify data exists
3. **Run the test script** in browser console
4. **Check debug information** on admin page
5. **Verify environment variables** are set correctly
6. **Complete a test study** to generate fresh data

## Debug Information

The admin page now includes:
- Debug information panel showing data counts
- Console logging for data preparation steps
- Validation checks for chart data
- Error messages for missing or invalid data

If the issue persists, check the browser console for detailed error messages and the debug information panel for data validation results.
