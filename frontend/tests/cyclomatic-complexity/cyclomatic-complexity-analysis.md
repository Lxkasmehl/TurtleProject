# Cyclomatic Complexity Analysis: handleUpload Function

## Function: `handleUpload` in `usePhotoUpload.tsx`

### Code of the Function

```typescript
const handleUpload = async (): Promise<void> => {
  if (files.length === 0 || !preview) return; // Statement 1

  const file = files[0]; // Statement 2
  setUploadState('uploading'); // Statement 3
  setUploadProgress(0); // Statement 4
  setUploadResponse(null); // Statement 5

  // Clear any existing interval
  if (progressIntervalRef.current) {
    // Decision Point 1
    clearInterval(progressIntervalRef.current); // Statement 6
    progressIntervalRef.current = null; // Statement 7
  }

  // Simulate progress animation
  progressIntervalRef.current = setInterval(() => {
    // Statement 8
    setUploadProgress((prev) => {
      if (prev >= 90) {
        // Decision Point 2
        if (progressIntervalRef.current) {
          // Decision Point 3
          clearInterval(progressIntervalRef.current); // Statement 9
          progressIntervalRef.current = null; // Statement 10
        }
        return 90; // Statement 11
      }
      return prev + 10; // Statement 12
    });
  }, 200);

  try {
    // Try block start
    // Get location if available (for all users)
    let location = null; // Statement 13
    setIsGettingLocation(true); // Statement 14
    try {
      // Nested try block start
      location = await getCurrentLocation(); // Statement 15
      if (!location) {
        // Decision Point 4
        console.warn('Location not available or denied by user'); // Statement 16
      }
    } catch (error) {
      // Nested catch block
      console.warn('Failed to get location:', error); // Statement 17
    } finally {
      // Nested finally block
      setIsGettingLocation(false); // Statement 18
    }

    // For admin, check for duplicates
    const response = await uploadPhoto(file, role === 'admin', location); // Statement 19, Decision Point 5

    // Clear interval and set to 100%
    if (progressIntervalRef.current) {
      // Decision Point 6
      clearInterval(progressIntervalRef.current); // Statement 20
      progressIntervalRef.current = null; // Statement 21
    }
    setUploadProgress(100); // Statement 22

    if (response.success) {
      // Decision Point 7
      // If duplicate detected and admin, navigate to match page
      if (response.isDuplicate && role === 'admin' && response.duplicateImageId) {
        // Decision Point 8 (3 conditions)
        // Navigate to turtle match page
        navigate(`/admin/turtle-match/${response.duplicateImageId}`); // Statement 23
        return; // Statement 24
      }

      setUploadState('success'); // Statement 25
      setUploadResponse(response.message); // Statement 26
      setImageId(response.imageId || null); // Statement 27
      setIsDuplicate(response.isDuplicate || false); // Statement 28
      setPreviousUploadDate(response.previousUploadDate || null); // Statement 29

      if (response.imageId && onSuccess) {
        // Decision Point 9 (2 conditions)
        onSuccess(response.imageId); // Statement 30
      }

      notifications.show({
        // Statement 31
        title: 'Upload Successful!',
        message: response.message,
        color: 'green',
        icon: <IconCheck size={18} />,
        autoClose: 5000,
      });
    } else {
      // Else branch
      throw new Error(response.message); // Statement 32
    }
  } catch (error: unknown) {
    // Outer catch block
    // Clear interval on error
    if (progressIntervalRef.current) {
      // Decision Point 10
      clearInterval(progressIntervalRef.current); // Statement 33
      progressIntervalRef.current = null; // Statement 34
    }
    setUploadProgress(0); // Statement 35
    setUploadState('error'); // Statement 36
    const errorMessage = // Statement 37
      error && typeof error === 'object' && 'message' in error // Decision Point 11 (3 conditions)
        ? (error.message as string) // Statement 38
        : 'Upload failed. Please try again.'; // Statement 39

    setUploadResponse(errorMessage); // Statement 40

    notifications.show({
      // Statement 41
      title: 'Upload Failed',
      message: errorMessage,
      color: 'red',
      icon: <IconAlertCircle size={18} />,
      autoClose: 5000,
    });
  }
};
```

## Cyclomatic Complexity Calculation

### Method 1: Count Decision Points

Cyclomatic Complexity (CC) is calculated as: **CC = Number of decision points + 1**

**Decision Points:**

1. `if (files.length === 0 || !preview)` - 2 conditions (OR)
2. `if (progressIntervalRef.current)` - line 17
3. `if (prev >= 90)` - line 27
4. `if (progressIntervalRef.current)` - line 29 (within interval)
5. `if (!location)` - line 48
6. `role === 'admin'` - line 61 (as parameter)
7. `if (progressIntervalRef.current)` - line 64
8. `if (response.success)` - line 71
9. `if (response.isDuplicate && role === 'admin' && response.duplicateImageId)` - 3 conditions (AND)
10. `if (response.imageId && onSuccess)` - 2 conditions (AND)
11. `if (progressIntervalRef.current)` - line 107
12. `error && typeof error === 'object' && 'message' in error` - 3 conditions (AND)

**Simplified Count (each if/else/&&/|| as +1):**

- line 9: 1 (OR)
- line 17: 1
- line 27: 1
- line 29: 1
- line 48: 1
- line 61: 1 (implicit)
- line 64: 1
- line 71: 1
- line 74: 1 (complex AND condition)
- line 87: 1 (AND)
- line 107: 1
- line 115: 1 (complex AND condition)
- Try-Catch: +1

**Cyclomatic Complexity = 13 + 1 = 14**

### Method 2: Count Regions

In the control flow graph:

- Number of regions = Number of decision points + 1
- **CC = 14**

## All Statements in the Function

1. Early return check (line 89)
2. `const file = files[0]`
3. `setUploadState('uploading')`
4. `setUploadProgress(0)`
5. `setUploadResponse(null)`
6. `clearInterval(progressIntervalRef.current)` (if interval exists)
7. `progressIntervalRef.current = null` (if interval exists)
8. `setInterval(...)` (start progress animation)
9. `clearInterval(...)` (within progress callback when >= 90)
10. `progressIntervalRef.current = null` (within progress callback)
11. `return 90` (within progress callback)
12. `return prev + 10` (within progress callback)
13. `let location = null`
14. `setIsGettingLocation(true)`
15. `location = await getCurrentLocation()`
16. `console.warn('Location not available...')` (if location null)
17. `console.warn('Failed to get location:', error)` (in catch)
18. `setIsGettingLocation(false)` (in finally)
19. `await uploadPhoto(...)`
20. `clearInterval(...)` (if interval exists after upload)
21. `progressIntervalRef.current = null` (if interval exists)
22. `setUploadProgress(100)`
23. `navigate(...)` (if duplicate as admin)
24. `return` (after navigate)
25. `setUploadState('success')`
26. `setUploadResponse(response.message)`
27. `setImageId(response.imageId || null)`
28. `setIsDuplicate(response.isDuplicate || false)`
29. `setPreviousUploadDate(response.previousUploadDate || null)`
30. `onSuccess(response.imageId)` (if callback exists)
31. `notifications.show({...})` (success notification)
32. `throw new Error(response.message)` (if !response.success)
33. `clearInterval(...)` (in error catch)
34. `progressIntervalRef.current = null` (in error catch)
35. `setUploadProgress(0)` (in error catch)
36. `setUploadState('error')` (in error catch)
37. `const errorMessage = ...` (determine error message)
38. `(error.message as string)` (if error object with message)
39. `'Upload failed. Please try again.'` (default error message)
40. `setUploadResponse(errorMessage)` (in error catch)
41. `notifications.show({...})` (error notification)

## Test Cases for Complete Statement Coverage

### Test Case 1: Early Return - No Files

**Purpose:** Cover Statement 1 (early return)

- **Setup:** `files = []`, `preview = null`
- **Expected:** Function returns immediately, no further statements executed

### Test Case 2: Early Return - No Preview

**Purpose:** Cover Statement 1 (early return)

- **Setup:** `files = [file]`, `preview = null`
- **Expected:** Function returns immediately

### Test Case 3: Successful Upload without existing Interval (Community User, with Location)

**Purpose:** Cover Statements 2-5, 8, 13-15, 18-19, 22, 25-29, 31

- **Setup:**
  - `files = [validFile]`, `preview = 'data:image/png;base64,...'`
  - `progressIntervalRef.current = null`
  - `role = 'community'`
  - `getCurrentLocation()` returns location
  - `uploadPhoto()` returns `{success: true, message: 'Success', imageId: 'img_123'}`
- **Expected:**
  - Upload state is set to 'uploading'
  - Progress animation starts
  - Location is retrieved
  - Upload successful
  - Success notification is displayed

### Test Case 4: Successful Upload with existing Interval (Community User, without Location)

**Purpose:** Cover Statements 6-7, 16, 19, 22, 25-29, 31

- **Setup:**
  - `files = [validFile]`, `preview = 'data:image/png;base64,...'`
  - `progressIntervalRef.current = setInterval(...)` (already exists)
  - `role = 'community'`
  - `getCurrentLocation()` returns `null`
  - `uploadPhoto()` returns `{success: true, message: 'Success', imageId: 'img_123'}`
- **Expected:**
  - Existing interval is cleared
  - New interval is started
  - Location warning is logged
  - Upload successful without location

### Test Case 5: Location Error (but upload successful)

**Purpose:** Cover Statement 17

- **Setup:**
  - `files = [validFile]`, `preview = 'data:image/png;base64,...'`
  - `getCurrentLocation()` throws an error
  - `uploadPhoto()` returns `{success: true, message: 'Success', imageId: 'img_123'}`
- **Expected:**
  - Location error is logged
  - Upload still successful

### Test Case 6: Progress Animation reaches 90% (within interval)

**Purpose:** Cover Statements 9-11

- **Setup:**
  - Upload running, progress interval is active
  - `prev >= 90` is reached
- **Expected:**
  - Interval is stopped
  - Progress stays at 90%

### Test Case 7: Progress Animation under 90% (within interval)

**Purpose:** Cover Statement 12

- **Setup:**
  - Upload running, progress interval is active
  - `prev < 90`
- **Expected:**
  - Progress is increased by 10

### Test Case 8: Admin Upload with Duplicate Detection - Navigate to Match Page

**Purpose:** Cover Statements 20-21, 23-24

- **Setup:**
  - `role = 'admin'`
  - `files = [validFile]`, `preview = 'data:image/png;base64,...'`
  - `progressIntervalRef.current` exists
  - `uploadPhoto()` returns `{success: true, isDuplicate: true, duplicateImageId: 'img_456'}`
- **Expected:**
  - Interval is cleared
  - Navigation to `/admin/turtle-match/img_456`
  - Function returns early (no success notification)

### Test Case 9: Admin Upload without Duplicate (but with onSuccess Callback)

**Purpose:** Cover Statement 30

- **Setup:**
  - `role = 'admin'`
  - `onSuccess` callback is defined
  - `uploadPhoto()` returns `{success: true, imageId: 'img_789', message: 'Success'}`
- **Expected:**
  - `onSuccess('img_789')` is called
  - Success notification is displayed

### Test Case 10: Upload without onSuccess Callback

**Purpose:** Do NOT execute Statement 30

- **Setup:**
  - `onSuccess = undefined`
  - `uploadPhoto()` returns `{success: true, imageId: 'img_789'}`
- **Expected:**
  - `onSuccess` is not called
  - Success notification is displayed

### Test Case 11: Upload Error - response.success = false

**Purpose:** Cover Statement 32

- **Setup:**
  - `uploadPhoto()` returns `{success: false, message: 'Upload failed'}`
- **Expected:**
  - Error is thrown
  - Catch block is executed

### Test Case 12: Upload Error with existing Interval - Error Object with message

**Purpose:** Cover Statements 33-34, 38

- **Setup:**
  - `progressIntervalRef.current` exists
  - `uploadPhoto()` throws error with `{message: 'Custom error'}` property
  - Error is an object with 'message' property
- **Expected:**
  - Interval is cleared
  - Error message is extracted from error object
  - Error notification is displayed

### Test Case 13: Upload Error without existing Interval - Generic Error

**Purpose:** Cover Statements 35-36, 39-41

- **Setup:**
  - `progressIntervalRef.current = null`
  - `uploadPhoto()` throws a generic error (not an object or without message)
- **Expected:**
  - Default error message is used
  - Error notification is displayed

### Test Case 14: Upload Error - Error is not an Object

**Purpose:** Cover Statement 39 (alternative path)

- **Setup:**
  - `uploadPhoto()` throws a primitive value (e.g., string)
- **Expected:**
  - Default error message is used

### Test Case 15: Upload Error - Error Object without message Property

**Purpose:** Cover Statement 39 (alternative path)

- **Setup:**
  - `uploadPhoto()` throws an object without 'message' property
- **Expected:**
  - Default error message is used

## Test Implementation

The following test cases should be implemented in a test file to cover all statements:

```typescript
// Example structure for test implementation
describe('handleUpload - Statement Coverage Tests', () => {
  // Test Case 1-15 as described above
});
```

## Summary

- **Cyclomatic Complexity:** 14
- **Number of Statements:** 41
- **Number of Test Cases Required:** 15 (to execute all statements at least once)
- **Complexity:** High - The function has many decision points and various execution paths

The `handleUpload` function is complex enough to serve as an example for Cyclomatic Complexity Analysis. With the 15 test cases, all statements can be executed at least once.
