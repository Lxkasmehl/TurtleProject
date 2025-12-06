# Part 4 – Testing, Maintenance, Security, and Project Management

## Test Plan

### Overview

The frontend testing strategy for TurtleTracker focuses on ensuring reliability, security, and user experience across all critical user flows. Our testing approach combines multiple testing methodologies to achieve comprehensive coverage of the React-based application.

### Potential Risks and Mitigation Strategies

**Risk 1: Photo Upload Failures**

- **Risk**: Network interruptions, invalid file formats, or backend unavailability could cause upload failures, leading to data loss and poor user experience.
- **Mitigation**: Implement robust error handling with user-friendly notifications, automatic retry mechanisms for transient failures, and client-side file validation before upload attempts. Progress indicators provide transparency during uploads.

**Risk 2: Authentication Token Expiration**

- **Risk**: Users may lose their session unexpectedly, causing frustration when attempting to access protected resources or perform actions.
- **Mitigation**: Implement token refresh mechanisms, automatic session restoration on app startup via `AuthProvider`, and graceful handling of 401 responses with automatic logout and redirect to login.

**Risk 3: Location Permission Denials**

- **Risk**: Users may deny location permissions, affecting data quality for turtle tracking.
- **Mitigation**: The system gracefully handles location failures by allowing uploads to proceed without location data, with clear warnings logged. Location requests are made only when necessary and with proper user consent.

**Risk 4: Cross-Browser Compatibility Issues**

- **Risk**: Different browsers may handle file uploads, location APIs, or CSS differently, causing inconsistent user experiences.
- **Mitigation**: Comprehensive end-to-end testing using Playwright across Chromium, Firefox, and WebKit engines. Progressive enhancement ensures core functionality works even if advanced features fail.

**Risk 5: State Management Race Conditions**

- **Risk**: Concurrent uploads or rapid state changes could lead to inconsistent UI states or memory leaks.
- **Mitigation**: Proper cleanup of intervals and event listeners in React hooks, use of refs for interval management, and state updates that are idempotent and safe to call multiple times.

### Types of Tests

**1. End-to-End Tests (E2E) using Playwright**

- Full user journey testing using Playwright framework
- Test complete workflows: login → upload → view records → admin operations
- Cross-browser testing across Chromium, Firefox, and WebKit engines
- Mobile viewport testing (Mobile Chrome, Mobile Safari)
- Examples:
  - Navigation tests: Testing page routing and mobile menu functionality
  - Admin photo upload tests: Testing duplicate detection and match page navigation
  - Admin turtle records tests: Testing data display and filtering
  - Admin turtle match tests: Testing duplicate matching functionality

**2. White Box Testing Analysis**

- Code coverage analysis using cyclomatic complexity metrics
- Statement coverage, branch coverage, and path coverage analysis
- Focus on complex functions with high decision points (e.g., `handleUpload` function with cyclomatic complexity of 14)
- Test case derivation based on control flow graph analysis

### Detailed White Box Testing: Photo Upload Functionality

The `handleUpload` function in `usePhotoUpload.tsx` is a critical component with a cyclomatic complexity of 14, making it an ideal candidate for comprehensive white box testing. This function handles file uploads, location retrieval, duplicate detection, progress tracking, and error management.

#### Requirement Focus: Photo Upload with Duplicate Detection

**Requirement**: "As an admin user, when I upload a photo of a turtle plastron, the system must detect if this turtle has been seen before and immediately navigate me to the match page for verification."

#### White Box Test Cases (10+ Test Cases)

**Test Case 1: Early Return - No Files Selected**

- **Input**: `files = []`, `preview = null`
- **Expected Path**: Function returns immediately at line 89
- **Coverage**: Statement 1 (early return check)
- **Verification**: No API calls made, no state changes

**Test Case 2: Early Return - No Preview Available**

- **Input**: `files = [file]`, `preview = null`
- **Expected Path**: Function returns immediately at line 89
- **Coverage**: Statement 1 (OR condition in early return)
- **Verification**: Function exits before any upload logic

**Test Case 3: Successful Upload - Community User with Location**

- **Input**: Valid file, preview exists, `role = 'community'`, location available
- **Expected Path**: Lines 92-140, 150-166
- **Coverage**: Statements 2-5, 13-15, 18-19, 22, 25-29, 31
- **Verification**: Upload state transitions to 'success', progress reaches 100%, success notification displayed

**Test Case 4: Successful Upload - Existing Interval Cleanup**

- **Input**: Valid file, `progressIntervalRef.current` already set
- **Expected Path**: Lines 97-100, then normal upload flow
- **Coverage**: Statements 6-7 (interval cleanup)
- **Verification**: Previous interval cleared before starting new upload

**Test Case 5: Location Retrieval Failure - Upload Continues**

- **Input**: Valid file, `getCurrentLocation()` throws error
- **Expected Path**: Lines 121-130 (catch block), then upload continues
- **Coverage**: Statements 17-18 (error handling in nested try-catch)
- **Verification**: Warning logged, upload proceeds without location, `isGettingLocation` set to false

**Test Case 6: Location Unavailable - Null Return**

- **Input**: Valid file, `getCurrentLocation()` returns `null`
- **Expected Path**: Lines 122-125
- **Coverage**: Statements 15-16 (null check and warning)
- **Verification**: Warning logged, upload continues with `location = null`

**Test Case 7: Progress Animation - Reaches 90% Cap**

- **Input**: Upload in progress, progress callback executed multiple times
- **Expected Path**: Lines 104-113, specifically when `prev >= 90`
- **Coverage**: Statements 9-11 (interval cleanup within progress callback)
- **Verification**: Progress stops at 90%, interval cleared, progress doesn't exceed 90% until upload completes

**Test Case 8: Admin Duplicate Detection - Navigate to Match Page**

- **Input**: `role = 'admin'`, `response.isDuplicate = true`, `response.duplicateImageId = 'img_456'`
- **Expected Path**: Lines 136-140, 144-148
- **Coverage**: Statements 20-21, 23-24 (duplicate detection and navigation)
- **Verification**: Interval cleared, navigation to `/admin/turtle-match/img_456`, function returns early, no success notification

**Test Case 9: Admin Upload - Success with Callback**

- **Input**: `role = 'admin'`, `onSuccess` callback defined, successful upload
- **Expected Path**: Lines 142-166, specifically line 156-158
- **Coverage**: Statement 30 (`onSuccess` callback execution)
- **Verification**: `onSuccess(response.imageId)` called with correct image ID

**Test Case 10: Upload Error - Backend Returns Failure**

- **Input**: `response.success = false`, `response.message = 'Upload failed'`
- **Expected Path**: Lines 142, 167-169, then catch block 170-192
- **Coverage**: Statement 32 (error thrown), Statements 33-41 (error handling)
- **Verification**: Error state set, progress reset to 0, error notification displayed with correct message

**Test Case 11: Upload Error - Network Failure**

- **Input**: `uploadPhoto()` throws network error
- **Expected Path**: Catch block 170-192, specifically error message extraction
- **Coverage**: Statements 35-36, 38-41 (error message handling)
- **Verification**: Generic error message displayed if error object lacks message property

**Test Case 12: Upload Error - Invalid Error Object**

- **Input**: `uploadPhoto()` throws primitive value (string) instead of Error object
- **Expected Path**: Lines 178-181 (error message extraction with type checking)
- **Coverage**: Statement 39 (default error message fallback)
- **Verification**: Default error message "Upload failed. Please try again." displayed

**Test Case 13: Progress Animation - Increment Below 90%**

- **Input**: Upload in progress, `prev < 90`
- **Expected Path**: Lines 104-113, specifically the else branch
- **Coverage**: Statement 12 (progress increment)
- **Verification**: Progress increases by 10% each interval tick

**Test Case 14: Interval Cleanup on Error**

- **Input**: Upload fails, `progressIntervalRef.current` exists
- **Expected Path**: Lines 172-175 in catch block
- **Coverage**: Statements 33-34 (interval cleanup on error)
- **Verification**: Interval cleared even when error occurs, preventing memory leaks

**Test Case 15: Success Without Callback**

- **Input**: Successful upload, `onSuccess = undefined`
- **Expected Path**: Lines 142-166, skipping lines 156-158
- **Coverage**: Verify Statement 30 is NOT executed
- **Verification**: Upload succeeds, but callback is not called when undefined

These test cases provide comprehensive coverage of all decision points, branches, and statements within the `handleUpload` function, ensuring robust validation of the photo upload requirement with special focus on admin duplicate detection functionality.

---

## Security Requirements

### Misuse Cases in Use Case Diagram

The frontend architecture addresses security through several misuse cases that must be prevented:

**Misuse Case 1: Unauthorized Access to Admin Routes**

- **Threat**: Non-admin users attempting to access `/admin/turtle-match` or `/admin/users` routes
- **Mitigation**: Route protection via role-based checks in `Navigation` component, redirecting unauthorized users to home page

**Misuse Case 2: Token Theft via XSS**

- **Threat**: Malicious scripts stealing authentication tokens from localStorage
- **Mitigation**: Content Security Policy (CSP) headers, input sanitization, and avoiding `dangerouslySetInnerHTML`. Tokens stored in httpOnly cookies would be preferred in production.

**Misuse Case 3: File Upload Attacks**

- **Threat**: Malicious file uploads (oversized files, executable scripts disguised as images)
- **Mitigation**: Client-side file validation in `validateFile()` function checking MIME types, file size limits, and file extensions before upload

**Misuse Case 4: Location Data Privacy Violation**

- **Threat**: Unauthorized access to user location data
- **Mitigation**: Location only requested when necessary, user consent required, location data not stored in localStorage, transmitted only during authenticated upload requests

### Architecture Design Choices Addressing Security

The frontend employs a **defense-in-depth** strategy: (1) **Component-level authorization** checks user roles before rendering admin UI elements, (2) **API request interception** via `apiRequest()` automatically includes Bearer tokens and handles 401 responses, (3) **Input validation** occurs at multiple layers (client-side file validation, type checking with TypeScript), and (4) **State management isolation** using Redux ensures user data is centralized and protected from direct manipulation. The separation of concerns between `AuthProvider`, route guards, and API service layers creates multiple security checkpoints.

---

## Socio-Technical System Analysis

Yes, TurtleTracker is a **socio-technical system**. It integrates social and technical elements: (1) **Social dimension**: Community members contribute turtle sightings, creating a collaborative conservation effort that relies on human participation, trust, and engagement. The system includes gamification plans (leaderboards, achievements) to motivate participation. (2) **Technical dimension**: React frontend, backend APIs, image processing algorithms, and database systems handle the technical infrastructure. (3) **Interaction**: The system's value emerges from the interaction between these dimensions—technology enables community engagement, while social participation generates the data that makes the technical system valuable. The role-based access control (community vs. admin) reflects social hierarchies (citizen scientists vs. researchers), and the user experience design must account for varying technical literacy levels among community members. The system's success depends on both technical reliability and social adoption, making it inherently socio-technical.

---

## Teamwork Management and Motivation

Our frontend team uses **agile methodologies** with weekly sprints and daily standups to maintain communication and track progress. We employ **Git feature branches** for parallel development, with code reviews required before merging to ensure quality. **Clear task assignment** via GitHub issues with labels (bug, feature, enhancement) helps team members understand priorities. We maintain **transparency** through regular demos of completed features, celebrating milestones like successful E2E test implementations. **Pair programming** sessions for complex features like the photo upload hook improve code quality and knowledge sharing. **Flexible work schedules** accommodate different time zones and commitments, with asynchronous communication via GitHub discussions for non-urgent matters. Regular **retrospectives** help identify process improvements and address any blockers, ensuring the team stays motivated and productive.
