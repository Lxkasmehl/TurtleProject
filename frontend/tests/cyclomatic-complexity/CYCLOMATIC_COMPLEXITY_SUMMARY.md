# Cyclomatic Complexity Analysis - Summary

## Task

Select a procedure, identify its cyclomatic complexity, and create enough test cases so that all statements in the procedure are executed at least once.

## Selected Function

**`handleUpload`** in `frontend/src/hooks/usePhotoUpload.tsx`

This function was selected because it:

- Has multiple decision points
- Contains various execution paths
- Includes error handling
- Handles different roles (Admin vs. Community)
- Performs asynchronous operations

## Cyclomatic Complexity

### Calculation

Cyclomatic Complexity is calculated as: **CC = Number of decision points + 1**

**Decision points in `handleUpload`:**

1. `if (files.length === 0 || !preview)` - Early Return Check
2. `if (progressIntervalRef.current)` - Interval Cleanup (line 97)
3. `if (prev >= 90)` - Progress Limit Check (line 105)
4. `if (progressIntervalRef.current)` - Interval Cleanup in callback (line 106)
5. `if (!location)` - Location Check (line 123)
6. `role === 'admin'` - Role Check (line 133)
7. `if (progressIntervalRef.current)` - Interval Cleanup after upload (line 136)
8. `if (response.success)` - Success Check (line 142)
9. `if (response.isDuplicate && role === 'admin' && response.duplicateImageId)` - Duplicate Check (line 144)
10. `if (response.imageId && onSuccess)` - Callback Check (line 156)
11. `if (progressIntervalRef.current)` - Interval Cleanup in error handler (line 172)
12. `error && typeof error === 'object' && 'message' in error` - Error Type Check (line 179)
13. Try-Catch Block - +1

**Cyclomatic Complexity = 13 + 1 = 14**

### Interpretation

- **CC = 14** means **high complexity**
- The function has many different execution paths
- Recommendation: Split the function into smaller functions to reduce complexity

## Statements in the Function

The function contains **41 different statements**, all of which must be tested:

1. Early return check
2. File extraction
   3-5. State initialization (uploading, progress, response)
   6-7. Interval cleanup (if present)
3. Progress interval setup
   9-12. Progress callback logic
   13-18. Location handling (with try-catch-finally)
4. Photo upload call
   20-21. Interval cleanup after upload
5. Set progress to 100%
   23-24. Navigation on duplicate (Admin)
   25-29. Success state updates
6. onSuccess callback (if present)
7. Success notification
8. Error throw (if !success)
   33-41. Error handling (interval cleanup, state updates, notifications)

## Test Cases

**15 test cases** were created to cover all statements:

### Test Case 1: Early Return - No Files

- **Purpose:** Statement 1 (early return)
- **Setup:** `files = []`, `preview = null`
- **Expected:** Function returns immediately

### Test Case 2: Early Return - No Preview

- **Purpose:** Statement 1 (early return)
- **Setup:** `files = [file]`, `preview = null`
- **Expected:** Function returns immediately

### Test Case 3: Successful Upload (Community, with Location)

- **Purpose:** Statements 2-5, 8, 13-15, 18-19, 22, 25-29, 31
- **Setup:** Community User, location available, successful upload
- **Expected:** Success notification, upload successful

### Test Case 4: Successful Upload (Community, without Location)

- **Purpose:** Statements 6-7, 16, 19, 22, 25-29, 31
- **Setup:** Community User, no location, existing interval
- **Expected:** Upload successful despite missing location

### Test Case 5: Location Error (Upload still successful)

- **Purpose:** Statement 17 (catch block)
- **Setup:** Location API throws error
- **Expected:** Upload still successful

### Test Case 6-7: Progress Animation

- **Purpose:** Statements 9-12 (Progress logic)
- **Setup:** Upload running, progress observed
- **Expected:** Progress displayed correctly

### Test Case 8: Admin Upload with Duplicate

- **Purpose:** Statements 20-21, 23-24
- **Setup:** Admin User, duplicate detected
- **Expected:** Navigation to Match Page

### Test Case 9: Admin Upload without Duplicate (with Callback)

- **Purpose:** Statement 30
- **Setup:** Admin User, new photo, onSuccess present
- **Expected:** onSuccess is called

### Test Case 10: Upload without Callback

- **Purpose:** Do NOT execute Statement 30
- **Setup:** Upload without onSuccess
- **Expected:** Upload successful, no callback

### Test Case 11: Upload Error (response.success = false)

- **Purpose:** Statement 32
- **Setup:** Backend returns success: false
- **Expected:** Error is thrown

### Test Case 12: Upload Error with Interval (Error Object)

- **Purpose:** Statements 33-34, 38
- **Setup:** Error with existing interval, Error object with message
- **Expected:** Interval cleared, error message extracted

### Test Case 13: Upload Error without Interval (Generic Error)

- **Purpose:** Statements 35-36, 39-41
- **Setup:** Error without interval, generic error
- **Expected:** Default error message used

### Test Case 14: Upload Error (Error is not an Object)

- **Purpose:** Statement 39 (alternative path)
- **Setup:** Error is primitive value
- **Expected:** Default error message used

### Test Case 15: Upload Error (Error without message)

- **Purpose:** Statement 39 (alternative path)
- **Setup:** Error object without message property
- **Expected:** Default error message used

## Test Implementation

### Files

1. **`cyclomatic-complexity-analysis.md`** - Detailed analysis (English)
2. **`cyclomatic-complexity-handleUpload.spec.ts`** - Playwright test implementation
3. **`CYCLOMATIC_COMPLEXITY_ZUSAMMENFASSUNG.md`** - This summary (English)

### Test Execution

```bash
# Run all tests
npm run test

# Only Cyclomatic Complexity tests
npm run test -- cyclomatic-complexity-handleUpload.spec.ts

# With UI
npm run test:ui
```

## Statement Coverage

With the 15 test cases, all 41 statements are executed at least once:

- ✅ **Early Returns:** TC1, TC2
- ✅ **Normal Flow:** TC3, TC4, TC9
- ✅ **Location Handling:** TC4, TC5
- ✅ **Progress Animation:** TC6-7
- ✅ **Duplicate Detection:** TC8
- ✅ **Error Handling:** TC11-15
- ✅ **State Management:** All tests

## Conclusion

- **Cyclomatic Complexity:** 14 (high)
- **Number of Statements:** 41
- **Number of Test Cases:** 15
- **Statement Coverage:** 100% (all statements are executed at least once)

The `handleUpload` function is complex enough to serve as an example for Cyclomatic Complexity Analysis. With the created test cases, complete statement coverage can be achieved.

## Recommendations

1. **Refactoring:** The function could be split into smaller functions:

   - `handleLocationRetrieval()`
   - `handleProgressAnimation()`
   - `handleUploadResponse()`
   - `handleUploadError()`

2. **Reduce Complexity:** Some nested conditions could be extracted into separate functions.

3. **Testability:** The function is already well testable, but mocking the backend would facilitate unit tests.
