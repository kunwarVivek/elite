# Implementation Blueprint: Complete Full-Stack Development
## Angel Investing Marketplace - Investment Instruments & Deal Management

**Status:** Database Schema Complete ✅ | Backend 20% Complete 🔄 | Frontend 0% Pending ⏳

---

## WHAT'S BEEN COMPLETED

### ✅ Phase 1: Database Schema (100% DONE)
- [x] 18 new Prisma models created
- [x] 15 new enums defined
- [x] All relations properly configured
- [x] 75+ database indexes added
- [x] Schema formatted and validated
- [x] Migration ready to run

### ✅ Phase 2: Backend Services (20% DONE)
- [x] SAFE Agreement service (`/backend/src/services/safe.service.ts`)
- [x] SAFE Agreement controller (`/backend/src/controllers/safe.controller.ts`)
- [x] Convertible Note service (`/backend/src/services/convertible-note.service.ts`)
- [x] Cap Table service with waterfall calculator (`/backend/src/services/cap-table.service.ts`)

---

## REMAINING BACKEND WORK

### 🔄 Backend Controllers (Needed: 16 files)

#### Investment Instruments
1. **`/backend/src/controllers/convertible-note.controller.ts`**
   - createNote, getNoteById, convertNote, repayNote
   - calculateInterest, checkMaturity, getMaturingNotes
   - **Estimated:** 250 lines

2. **`/backend/src/controllers/equity-round.controller.ts`**
   - createRound, getRound, updateRound, closeRound
   - addInvestor, calculateAllocation, getOversubscription
   - **Estimated:** 300 lines

#### Cap Table & Term Sheets
3. **`/backend/src/controllers/cap-table.controller.ts`**
   - createCapTable, getLatestCapTable, getHistory
   - calculateDilution, calculateWaterfall, exportToCarta
   - addStakeholder, updateStakeholder, recordEvent
   - **Estimated:** 350 lines

4. **`/backend/src/controllers/term-sheet.controller.ts`**
   - createTermSheet, getTermSheet, updateTermSheet
   - sendForNegotiation, addComment, proposeMod ification
   - acceptTermSheet, rejectTermSheet, trackVersions
   - **Estimated:** 300 lines

5. **`/backend/src/controllers/share-class.controller.ts`**
   - createShareClass, getShareClasses, updateShareClass
   - calculateVotingPower, calculateLiquidationRights
   - **Estimated:** 200 lines

#### Investor Rights & Governance
6. **`/backend/src/controllers/investor-rights.controller.ts`**
   - createRights, getRights, updateRights
   - enforceProRata, checkProtectiveProvisions
   - deliverInformationRights, manageBoardRights
   - **Estimated:** 250 lines

7. **`/backend/src/controllers/board-meeting.controller.ts`**
   - scheduleMeeting, getMeetings, updateMeeting
   - uploadMaterials, recordMinutes, addAttendees
   - **Estimated:** 200 lines

8. **`/backend/src/controllers/board-resolution.controller.ts`**
   - createResolution, getResolution, voteOnResolution
   - calculateVotingResults, enforceRequirements
   - **Estimated:** 200 lines

#### Exit Management
9. **`/backend/src/controllers/exit-event.controller.ts`**
   - createExitEvent, getExitEvent, updateExitEvent
   - announceExit, closeExit, calculateWaterfall
   - **Estimated:** 250 lines

10. **`/backend/src/controllers/exit-distribution.controller.ts`**
    - calculateDistributions, processPayments
    - generateTaxForms, trackPaymentStatus
    - **Estimated:** 200 lines

#### Document Automation
11. **`/backend/src/controllers/document-template.controller.ts`**
    - createTemplate, getTemplates, updateTemplate
    - uploadTemplate, reviewTemplate, activateTemplate
    - **Estimated:** 200 lines

12. **`/backend/src/controllers/document-generation.controller.ts`**
    - generateDocument, getDocument, mergeFields
    - sendForSignature, trackSignatures, downloadDocument
    - **Estimated:** 250 lines

#### Follow-on & Pro-rata
13. **`/backend/src/controllers/follow-on.controller.ts`**
    - createFollowOnOffer, getOffers, exerciseRight
    - calculateEntitlement, notifyInvestors, trackDeadlines
    - **Estimated:** 200 lines

### 🔄 Backend Services (Needed: 13 files)

14. **`/backend/src/services/equity-round.service.ts`**
    - Create and manage priced equity rounds
    - Calculate share allocations, handle oversubscription
    - Manage multiple closings, track lead investors
    - **Estimated:** 400 lines

15. **`/backend/src/services/term-sheet.service.ts`**
    - Create term sheets from templates
    - Version control and change tracking
    - Negotiation workflows, signature coordination
    - **Estimated:** 350 lines

16. **`/backend/src/services/investor-rights.service.ts`**
    - Track all investor rights per investment
    - Enforce pro-rata rights, ROFR, co-sale, drag-along
    - Deliver information rights, manage board seats
    - **Estimated:** 400 lines

17. **`/backend/src/services/exit-event.service.ts`**
    - Manage acquisition, IPO, merger, liquidation events
    - Calculate waterfall distributions
    - Process payments and generate tax documents
    - **Estimated:** 450 lines

18. **`/backend/src/services/document-generation.service.ts`**
    - Template management and PDF generation
    - Merge field replacement, data validation
    - DocuSign API integration
    - **Estimated:** 500 lines

19. **`/backend/src/services/follow-on.service.ts`**
    - Calculate pro-rata entitlements
    - Send notifications and track responses
    - Manage allocation and deadlines
    - **Estimated:** 300 lines

20. **`/backend/src/services/board.service.ts`**
    - Schedule meetings, manage attendees
    - Upload materials, record minutes
    - Create and track resolutions
    - **Estimated:** 350 lines

### 🔄 Calculation Utilities (Needed: 5 files)

21. **`/backend/src/utils/safe-calculator.ts`**
    - Post-money and pre-money calculations
    - Conversion price with cap and discount
    - MFN provision handling
    - **Estimated:** 200 lines

22. **`/backend/src/utils/note-calculator.ts`**
    - Simple and compound interest accrual
    - Conversion calculations at qualified financing
    - Maturity and repayment calculations
    - **Estimated:** 150 lines

23. **`/backend/src/utils/dilution-calculator.ts`**
    - Pre and post-money dilution
    - Fully diluted calculations
    - Anti-dilution adjustments (weighted average, full ratchet)
    - **Estimated:** 250 lines

24. **`/backend/src/utils/waterfall-calculator.ts`**
    - Liquidation preference layers
    - Participating vs non-participating preferred
    - Seniority ranking enforcement
    - Common stock distributions
    - **Estimated:** 350 lines

25. **`/backend/src/utils/vesting-calculator.ts`**
    - Vesting schedule calculations (4-year, 1-year cliff)
    - Acceleration on exit clauses
    - Option exercise calculations
    - **Estimated:** 200 lines

### 🔄 API Routes (Needed: 13 files)

26. **`/backend/src/routes/safe.routes.ts`**
    ```typescript
    POST   /api/safes                    // Create SAFE
    GET    /api/safes/:id                // Get SAFE
    PUT    /api/safes/:id                // Update SAFE
    POST   /api/safes/:id/convert        // Convert to equity
    POST   /api/safes/:id/dissolve       // Dissolve SAFE
    GET    /api/safes/startup/:id        // Get startup's SAFEs
    GET    /api/safes/investor/:id       // Get investor's SAFEs
    POST   /api/safes/:id/calculate      // Calculate conversion
    ```
    - **Estimated:** 100 lines

27. **`/backend/src/routes/convertible-note.routes.ts`**
    ```typescript
    POST   /api/notes                    // Create note
    GET    /api/notes/:id                // Get note
    PUT    /api/notes/:id                // Update note
    POST   /api/notes/:id/convert        // Convert to equity
    POST   /api/notes/:id/repay          // Repay note
    POST   /api/notes/:id/accrue         // Accrue interest
    GET    /api/notes/maturing           // Get maturing notes
    GET    /api/notes/startup/:id        // Get startup's notes
    GET    /api/notes/investor/:id       // Get investor's notes
    ```
    - **Estimated:** 120 lines

28. **`/backend/src/routes/equity-round.routes.ts`**
    ```typescript
    POST   /api/rounds                   // Create round
    GET    /api/rounds/:id               // Get round
    PUT    /api/rounds/:id               // Update round
    POST   /api/rounds/:id/close         // Close round
    POST   /api/rounds/:id/investors     // Add investor
    GET    /api/rounds/startup/:id       // Get startup rounds
    ```
    - **Estimated:** 100 lines

29. **`/backend/src/routes/cap-table.routes.ts`**
    ```typescript
    POST   /api/cap-tables               // Create cap table
    GET    /api/cap-tables/:id           // Get cap table
    GET    /api/cap-tables/startup/:id/latest  // Get latest
    GET    /api/cap-tables/startup/:id/history // Get history
    POST   /api/cap-tables/:id/stakeholders    // Add stakeholder
    POST   /api/cap-tables/:id/dilution        // Calculate dilution
    POST   /api/cap-tables/:id/waterfall       // Calculate waterfall
    GET    /api/cap-tables/:id/export          // Export to Carta
    ```
    - **Estimated:** 150 lines

30. **`/backend/src/routes/term-sheet.routes.ts`**
    ```typescript
    POST   /api/term-sheets              // Create term sheet
    GET    /api/term-sheets/:id          // Get term sheet
    PUT    /api/term-sheets/:id          // Update term sheet
    POST   /api/term-sheets/:id/negotiate  // Propose change
    POST   /api/term-sheets/:id/accept   // Accept terms
    POST   /api/term-sheets/:id/sign     // Sign term sheet
    GET    /api/term-sheets/:id/versions // Get version history
    ```
    - **Estimated:** 120 lines

31. **`/backend/src/routes/investor-rights.routes.ts`**
    ```typescript
    POST   /api/investor-rights          // Create rights
    GET    /api/investor-rights/:id      // Get rights
    PUT    /api/investor-rights/:id      // Update rights
    GET    /api/investor-rights/investment/:id // Get by investment
    ```
    - **Estimated:** 80 lines

32. **`/backend/src/routes/board.routes.ts`**
    ```typescript
    POST   /api/board/meetings           // Schedule meeting
    GET    /api/board/meetings/:id       // Get meeting
    POST   /api/board/resolutions        // Create resolution
    POST   /api/board/resolutions/:id/vote // Vote on resolution
    GET    /api/board/startup/:id/meetings // Get meetings
    ```
    - **Estimated:** 100 lines

33. **`/backend/src/routes/exit-event.routes.ts`**
    ```typescript
    POST   /api/exits                    // Create exit event
    GET    /api/exits/:id                // Get exit event
    POST   /api/exits/:id/waterfall      // Calculate waterfall
    POST   /api/exits/:id/distribute     // Process distributions
    GET    /api/exits/startup/:id        // Get startup exits
    ```
    - **Estimated:** 100 lines

34. **`/backend/src/routes/document.routes.ts` (extend existing)**
    ```typescript
    POST   /api/documents/generate       // Generate from template
    POST   /api/documents/:id/sign       // Send for signature
    GET    /api/documents/:id/signatures // Get signature status
    ```
    - **Estimated:** 80 lines

35. **`/backend/src/routes/follow-on.routes.ts`**
    ```typescript
    POST   /api/follow-ons               // Create follow-on offer
    GET    /api/follow-ons/:id           // Get offer
    POST   /api/follow-ons/:id/exercise  // Exercise pro-rata
    GET    /api/follow-ons/investor/:id  // Get investor offers
    ```
    - **Estimated:** 80 lines

### 🔄 Background Jobs (Needed: 4 files)

36. **`/backend/src/jobs/interest-accrual.job.ts`**
    - Daily job to accrue interest on all active convertible notes
    - Calculate simple or compound interest
    - Update database records
    - **Estimated:** 150 lines

37. **`/backend/src/jobs/conversion-trigger.job.ts`**
    - Check for qualified financing events
    - Notify SAFE/note holders of conversion opportunities
    - Auto-convert if configured
    - **Estimated:** 200 lines

38. **`/backend/src/jobs/maturity-reminder.job.ts`**
    - Check for notes maturing in 30/7/1 days
    - Send reminder notifications
    - Escalate overdue notes
    - **Estimated:** 150 lines

39. **`/backend/src/jobs/follow-on-notification.job.ts`**
    - Check for new equity rounds
    - Calculate pro-rata entitlements
    - Notify eligible investors
    - Track response deadlines
    - **Estimated:** 200 lines

### 🔄 Validations (Needed: 8 files)

40. **`/backend/src/validations/safe.validation.ts`**
    - Zod schemas for SAFE creation and updates
    - Valuation cap and discount rate validation
    - **Estimated:** 100 lines

41. **`/backend/src/validations/convertible-note.validation.ts`**
    - Zod schemas for note terms
    - Maturity date, interest rate validation
    - **Estimated:** 120 lines

42. **`/backend/src/validations/equity-round.validation.ts`**
    - Round creation and update schemas
    - Valuation and share price validation
    - **Estimated:** 150 lines

43. **`/backend/src/validations/cap-table.validation.ts`**
    - Cap table and stakeholder schemas
    - Ownership percentage validation
    - **Estimated:** 100 lines

44. **`/backend/src/validations/term-sheet.validation.ts`**
    - Term sheet creation and negotiation schemas
    - Investment terms validation
    - **Estimated:** 150 lines

45. **`/backend/src/validations/investor-rights.validation.ts`**
    - Rights creation and update schemas
    - **Estimated:** 80 lines

46. **`/backend/src/validations/exit-event.validation.ts`**
    - Exit event creation schemas
    - Distribution calculation validation
    - **Estimated:** 100 lines

47. **`/backend/src/validations/document-generation.validation.ts`**
    - Document generation schemas
    - Merge field validation
    - **Estimated:** 80 lines

---

## FRONTEND WORK (0% COMPLETE)

### 🔄 Frontend Pages (Needed: 45+ pages)

#### SAFE Agreement Pages
48. **`/frontend/src/pages/safe/browse-safes.tsx`**
    - List all SAFEs with filters (status, investor, startup)
    - Search and sort functionality
    - **Estimated:** 250 lines

49. **`/frontend/src/pages/safe/create-safe.tsx`**
    - Multi-step form to create SAFE
    - Valuation cap and discount rate inputs
    - Pro-rata and MFN checkboxes
    - **Estimated:** 350 lines

50. **`/frontend/src/pages/safe/safe-details.tsx`**
    - Display SAFE terms and status
    - Conversion calculator
    - Document download
    - **Estimated:** 300 lines

51. **`/frontend/src/pages/safe/convert-safe.tsx`**
    - Enter round details for conversion
    - Show calculated shares and price
    - Confirm conversion
    - **Estimated:** 250 lines

#### Convertible Note Pages
52. **`/frontend/src/pages/notes/browse-notes.tsx`**
    - List notes with maturity dates
    - Interest accrual display
    - **Estimated:** 250 lines

53. **`/frontend/src/pages/notes/create-note.tsx`**
    - Note terms form
    - Interest calculator preview
    - **Estimated:** 350 lines

54. **`/frontend/src/pages/notes/note-details.tsx`**
    - Show note terms, accrued interest
    - Conversion or repayment options
    - **Estimated:** 300 lines

55. **`/frontend/src/pages/notes/convert-note.tsx`**
    - Conversion workflow
    - Share calculation display
    - **Estimated:** 250 lines

#### Equity Round Pages
56. **`/frontend/src/pages/rounds/create-round.tsx`**
    - Round details form (valuation, terms)
    - Share class selection
    - Lead investor designation
    - **Estimated:** 400 lines

57. **`/frontend/src/pages/rounds/round-details.tsx`**
    - Round overview and status
    - Investor commitments list
    - Progress toward goal
    - **Estimated:** 350 lines

58. **`/frontend/src/pages/rounds/manage-round.tsx`**
    - Add investors to round
    - Allocate shares
    - Handle oversubscription
    - Close round workflow
    - **Estimated:** 400 lines

#### Cap Table Pages
59. **`/frontend/src/pages/cap-table/cap-table-viewer.tsx`**
    - Interactive cap table display
    - Ownership chart (pie/bar)
    - Fully diluted calculations
    - Export to CSV/Excel/Carta
    - **Estimated:** 500 lines

60. **`/frontend/src/pages/cap-table/dilution-simulator.tsx`**
    - Input new round parameters
    - Show before/after ownership
    - Visualize dilution impact
    - **Estimated:** 400 lines

61. **`/frontend/src/pages/cap-table/waterfall-analyzer.tsx`**
    - Enter exit proceeds
    - Calculate and display waterfall
    - Show distribution by stakeholder
    - Generate exit scenarios
    - **Estimated:** 450 lines

62. **`/frontend/src/pages/cap-table/manage-stakeholders.tsx`**
    - Add/edit stakeholders
    - Assign shares and options
    - Set vesting schedules
    - **Estimated:** 350 lines

#### Term Sheet Pages
63. **`/frontend/src/pages/term-sheets/create-term-sheet.tsx`**
    - Template selection
    - Fill in investment terms
    - Governance provisions
    - Investor rights
    - **Estimated:** 600 lines

64. **`/frontend/src/pages/term-sheets/term-sheet-details.tsx`**
    - Display all terms
    - Version history
    - Negotiation timeline
    - **Estimated:** 400 lines

65. **`/frontend/src/pages/term-sheets/negotiate-terms.tsx`**
    - Side-by-side comparison
    - Propose changes with comments
    - Track acceptance/rejection
    - **Estimated:** 450 lines

66. **`/frontend/src/pages/term-sheets/sign-term-sheet.tsx`**
    - E-signature workflow
    - Multi-party coordination
    - Download signed copy
    - **Estimated:** 300 lines

#### Investor Rights Pages
67. **`/frontend/src/pages/investor-rights/rights-dashboard.tsx`**
    - Display all investor rights per investment
    - Board seat status
    - Information rights delivery
    - Pro-rata offers
    - **Estimated:** 400 lines

68. **`/frontend/src/pages/investor-rights/pro-rata-exercise.tsx`**
    - View pro-rata entitlement
    - Exercise allocation
    - Track deadline
    - **Estimated:** 300 lines

69. **`/frontend/src/pages/investor-rights/board-observer-portal.tsx`**
    - View meeting schedules
    - Access materials
    - **Estimated:** 250 lines

#### Board Management Pages
70. **`/frontend/src/pages/board/schedule-meeting.tsx`**
    - Create meeting
    - Invite attendees
    - Upload agenda and materials
    - **Estimated:** 350 lines

71. **`/frontend/src/pages/board/meeting-details.tsx`**
    - View meeting info
    - Access materials
    - Record minutes
    - Track attendance
    - **Estimated:** 350 lines

72. **`/frontend/src/pages/board/create-resolution.tsx`**
    - Draft resolution
    - Set voting requirements
    - Submit for vote
    - **Estimated:** 300 lines

73. **`/frontend/src/pages/board/vote-resolution.tsx`**
    - View resolution details
    - Cast vote (FOR/AGAINST/ABSTAIN)
    - Add comments
    - **Estimated:** 250 lines

#### Exit Management Pages
74. **`/frontend/src/pages/exits/announce-exit.tsx`**
    - Create exit event
    - Enter deal terms
    - Announce to stakeholders
    - **Estimated:** 350 lines

75. **`/frontend/src/pages/exits/exit-details.tsx`**
    - View exit terms
    - Waterfall visualization
    - Distribution breakdown
    - **Estimated:** 400 lines

76. **`/frontend/src/pages/exits/manage-distributions.tsx`**
    - Process payments
    - Generate tax forms
    - Track payment status
    - **Estimated:** 350 lines

#### Document Pages
77. **`/frontend/src/pages/documents/generate-document.tsx`**
    - Select template
    - Fill merge fields
    - Preview and generate
    - **Estimated:** 350 lines

78. **`/frontend/src/pages/documents/sign-document.tsx`**
    - View document
    - E-signature interface
    - Track multi-party signing
    - **Estimated:** 300 lines

#### Follow-on Investment Pages
79. **`/frontend/src/pages/follow-on/browse-offers.tsx`**
    - View available pro-rata offers
    - Filter by startup/round
    - Track deadlines
    - **Estimated:** 300 lines

80. **`/frontend/src/pages/follow-on/exercise-right.tsx`**
    - View entitlement
    - Specify allocation amount
    - Submit commitment
    - **Estimated:** 250 lines

### 🔄 Frontend Components (Needed: 35+ components)

#### Shared Components
81. **`/frontend/src/components/safe/SAFECard.tsx`**
    - Display SAFE summary
    - Status badge, key terms
    - **Estimated:** 100 lines

82. **`/frontend/src/components/safe/SAFEForm.tsx`**
    - Reusable SAFE creation form
    - Validation and submission
    - **Estimated:** 250 lines

83. **`/frontend/src/components/safe/ConversionCalculator.tsx`**
    - Calculate conversion on-the-fly
    - Show shares and price
    - **Estimated:** 150 lines

84. **`/frontend/src/components/notes/NoteCard.tsx`**
    - Display note summary
    - Maturity countdown
    - **Estimated:** 100 lines

85. **`/frontend/src/components/notes/InterestAccrualChart.tsx`**
    - Visualize interest over time
    - **Estimated:** 150 lines

86. **`/frontend/src/components/rounds/RoundProgressBar.tsx`**
    - Show funding progress
    - Investor count
    - **Estimated:** 100 lines

87. **`/frontend/src/components/cap-table/OwnershipChart.tsx`**
    - Pie chart of ownership
    - Interactive legend
    - **Estimated:** 200 lines

88. **`/frontend/src/components/cap-table/StakeholderTable.tsx`**
    - Sortable table of stakeholders
    - Ownership percentages
    - **Estimated:** 250 lines

89. **`/frontend/src/components/cap-table/DilutionComparison.tsx`**
    - Before/after ownership display
    - Highlight changes
    - **Estimated:** 150 lines

90. **`/frontend/src/components/cap-table/WaterfallVisualization.tsx`**
    - Stacked bar chart of distributions
    - Hover details per stakeholder
    - **Estimated:** 300 lines

91. **`/frontend/src/components/term-sheets/TermSheetPreview.tsx`**
    - Formatted term sheet display
    - Section navigation
    - **Estimated:** 250 lines

92. **`/frontend/src/components/term-sheets/TermComparisonTable.tsx`**
    - Side-by-side version comparison
    - Highlight differences
    - **Estimated:** 200 lines

93. **`/frontend/src/components/term-sheets/NegotiationTimeline.tsx`**
    - Visual timeline of changes
    - Comments display
    - **Estimated:** 200 lines

94. **`/frontend/src/components/documents/DocumentViewer.tsx`**
    - PDF viewer with annotations
    - Download button
    - **Estimated:** 150 lines

95. **`/frontend/src/components/documents/SignaturePad.tsx`**
    - Canvas for signature drawing
    - Typed signature option
    - **Estimated:** 200 lines

96. **`/frontend/src/components/investor-rights/RightsBadges.tsx`**
    - Display active rights as badges
    - Tooltips with details
    - **Estimated:** 100 lines

97. **`/frontend/src/components/board/MeetingAgenda.tsx`**
    - Formatted agenda display
    - **Estimated:** 150 lines

98. **`/frontend/src/components/board/VotingPanel.tsx`**
    - Vote buttons and tally
    - Live vote count
    - **Estimated:** 200 lines

99. **`/frontend/src/components/exits/DistributionBreakdown.tsx`**
    - Table of distributions per stakeholder
    - Return multiples
    - **Estimated:** 200 lines

### 🔄 Frontend State Management (Needed: 10 stores)

100. **`/frontend/src/stores/safe.store.ts`**
     - SAFE list, selected SAFE, loading states
     - Actions: fetchSafes, createSafe, convertSafe
     - **Estimated:** 150 lines

101. **`/frontend/src/stores/convertible-note.store.ts`**
     - Note list, selected note, interest calculations
     - Actions: fetchNotes, createNote, convertNote
     - **Estimated:** 150 lines

102. **`/frontend/src/stores/equity-round.store.ts`**
     - Round list, selected round, investor allocations
     - Actions: fetchRounds, createRound, closeRound
     - **Estimated:** 150 lines

103. **`/frontend/src/stores/cap-table.store.ts`**
     - Cap table data, stakeholders, calculations
     - Actions: fetchCapTable, calculateDilution, calculateWaterfall
     - **Estimated:** 200 lines

104. **`/frontend/src/stores/term-sheet.store.ts`**
     - Term sheet data, versions, negotiations
     - Actions: fetchTermSheets, createTermSheet, negotiate
     - **Estimated:** 150 lines

105. **`/frontend/src/stores/investor-rights.store.ts`**
     - Rights data per investment
     - Actions: fetchRights, exerciseProRata
     - **Estimated:** 100 lines

106. **`/frontend/src/stores/board.store.ts`**
     - Meetings, resolutions, votes
     - Actions: scheduleMeeting, createResolution, vote
     - **Estimated:** 150 lines

107. **`/frontend/src/stores/exit-event.store.ts`**
     - Exit events, distributions, payments
     - Actions: createExit, calculateWaterfall, processPayments
     - **Estimated:** 150 lines

108. **`/frontend/src/stores/document.store.ts`**
     - Templates, generated documents, signatures
     - Actions: generateDocument, signDocument
     - **Estimated:** 150 lines

109. **`/frontend/src/stores/follow-on.store.ts`**
     - Pro-rata offers, entitlements, exercises
     - Actions: fetchOffers, exerciseRight
     - **Estimated:** 100 lines

---

## INTEGRATION & TESTING

### 🔄 API Integration (Needed: 10 services)

110. **`/frontend/src/services/api/safe.api.ts`**
     - Axios calls to SAFE endpoints
     - **Estimated:** 150 lines

111. **`/frontend/src/services/api/convertible-note.api.ts`**
     - Axios calls to Note endpoints
     - **Estimated:** 150 lines

112. **`/frontend/src/services/api/equity-round.api.ts`**
     - Axios calls to Round endpoints
     - **Estimated:** 150 lines

113. **`/frontend/src/services/api/cap-table.api.ts`**
     - Axios calls to Cap Table endpoints
     - **Estimated:** 200 lines

114. **`/frontend/src/services/api/term-sheet.api.ts`**
     - Axios calls to Term Sheet endpoints
     - **Estimated:** 150 lines

115. **`/frontend/src/services/api/investor-rights.api.ts`**
     - Axios calls to Investor Rights endpoints
     - **Estimated:** 100 lines

116. **`/frontend/src/services/api/board.api.ts`**
     - Axios calls to Board endpoints
     - **Estimated:** 150 lines

117. **`/frontend/src/services/api/exit-event.api.ts`**
     - Axios calls to Exit endpoints
     - **Estimated:** 150 lines

118. **`/frontend/src/services/api/document.api.ts`**
     - Axios calls to Document endpoints
     - **Estimated:** 150 lines

119. **`/frontend/src/services/api/follow-on.api.ts`**
     - Axios calls to Follow-on endpoints
     - **Estimated:** 100 lines

### 🔄 Unit Tests (Needed: 20+ test files)

120-140. **Backend Service Tests**
     - Test all calculation methods
     - Test error handling
     - Test edge cases
     - **Estimated:** 200 lines each = 4,000 lines total

### 🔄 Integration Tests (Needed: 10+ test files)

141-150. **API Endpoint Tests**
     - Test all CRUD operations
     - Test authentication and authorization
     - Test validation
     - **Estimated:** 300 lines each = 3,000 lines total

### 🔄 E2E Tests (Needed: 15 scenarios)

151-165. **User Journey Tests (Playwright)**
     - SAFE creation and conversion flow
     - Convertible note to Series A flow
     - Cap table dilution modeling
     - Term sheet negotiation
     - Exit waterfall distribution
     - **Estimated:** 200 lines each = 3,000 lines total

---

## DEPLOYMENT & INFRASTRUCTURE

### 🔄 Database Migration

166. **Run Prisma migration**
     ```bash
     cd backend
     npx prisma migrate dev --name add_investment_instruments
     npx prisma generate
     ```

167. **Seed data for testing**
     ```bash
     npx prisma db seed
     ```

### 🔄 Environment Configuration

168. **Update `.env` files**
     - Add new feature flags
     - Configure DocuSign API credentials
     - Set calculation precision settings

### 🔄 CI/CD Pipeline

169. **Update GitHub Actions**
     - Add new test suites to CI
     - Configure deployment triggers

### 🔄 Documentation

170. **API Documentation**
     - Generate OpenAPI/Swagger specs for new endpoints
     - **Estimated:** 500 lines

171. **User Documentation**
     - SAFE investment guide
     - Convertible note guide
     - Cap table interpretation guide
     - Term sheet negotiation guide
     - Investor rights guide
     - **Estimated:** 5,000 words total

---

## EFFORT ESTIMATION

### Backend Implementation
- **Services & Controllers:** ~8,000 lines of code
- **Routes & Validations:** ~2,500 lines of code
- **Utilities & Jobs:** ~2,000 lines of code
- **Tests:** ~7,000 lines of code
- **Total Backend:** ~19,500 lines of code
- **Estimated Time:** 6-8 weeks (1 developer)

### Frontend Implementation
- **Pages:** ~16,000 lines of code
- **Components:** ~5,500 lines of code
- **State Management:** ~1,500 lines of code
- **API Integration:** ~1,500 lines of code
- **Tests:** ~3,000 lines of code
- **Total Frontend:** ~27,500 lines of code
- **Estimated Time:** 8-10 weeks (1 developer)

### Total Implementation
- **Total Lines of Code:** ~47,000 lines
- **Total Time (1 developer):** 14-18 weeks (3.5-4.5 months)
- **Total Time (2 developers):** 7-9 weeks (1.75-2.25 months)
- **Total Time (4 developers):** 4-5 weeks (1-1.25 months)

---

## PRIORITY IMPLEMENTATION ORDER

### Week 1-2: Core Investment Instruments
1. Complete backend services & controllers (SAFE, Notes, Rounds)
2. API routes for investment instruments
3. Background jobs for interest accrual and conversions
4. Frontend pages for SAFE and Notes

### Week 3-4: Cap Table & Calculations
5. Complete cap table service with waterfall
6. Dilution and waterfall calculators
7. Frontend cap table viewer
8. Dilution and waterfall visualizations

### Week 5-6: Term Sheets & Rights
9. Term sheet service and negotiation workflows
10. Investor rights service
11. Frontend term sheet builder and negotiation
12. Investor rights dashboard

### Week 7-8: Board & Governance
13. Board meeting and resolution services
14. Frontend board management pages
15. Voting system implementation

### Week 9-10: Exit Management
16. Exit event and distribution services
17. Waterfall distribution processing
18. Frontend exit management pages
19. Tax document generation

### Week 11-12: Document Automation
20. Document generation service
21. DocuSign integration
22. Frontend document workflows
23. E-signature implementation

### Week 13-14: Testing & Polish
24. Unit and integration tests
25. E2E test scenarios
26. Bug fixes and optimizations
27. Documentation completion
28. Deployment and launch

---

## FILES CREATED SO FAR

### ✅ Completed Files (7)
1. `/angel-investing-marketplace/backend/prisma/schema.prisma` (2,376 lines)
2. `/angel-investing-marketplace/CRITICAL_REVIEW_AND_FUNCTIONAL_DEBTS.md` (6,000+ lines)
3. `/angel-investing-marketplace/IMPLEMENTATION_SUMMARY.md` (3,000+ lines)
4. `/backend/src/services/safe.service.ts` (580 lines)
5. `/backend/src/controllers/safe.controller.ts` (250 lines)
6. `/backend/src/services/convertible-note.service.ts` (590 lines)
7. `/backend/src/services/cap-table.service.ts` (580 lines)

### 🔄 Files Needed (165+)
See detailed breakdown above

---

## NEXT IMMEDIATE STEPS

1. **Run database migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_investment_instruments
   npx prisma generate
   ```

2. **Create remaining backend controllers:**
   - Start with `convertible-note.controller.ts`
   - Then `equity-round.controller.ts`
   - Then `cap-table.controller.ts`

3. **Create API routes:**
   - Start with `safe.routes.ts`
   - Register routes in main app

4. **Test backend APIs:**
   - Use Postman or similar
   - Verify all CRUD operations

5. **Start frontend implementation:**
   - Begin with SAFE pages
   - Create reusable components
   - Integrate with backend APIs

---

## CONCLUSION

This blueprint provides a complete roadmap for implementing all remaining work. The database schema is complete and production-ready. With dedicated resources, full implementation can be achieved in 3.5-4.5 months with one developer, or 1-1.25 months with a team of four.

**Current Progress:** 5% complete
**Remaining Work:** 95% (backend 80%, frontend 95%, testing 100%)

All technical specifications are documented in:
- `CRITICAL_REVIEW_AND_FUNCTIONAL_DEBTS.md` - Business requirements
- `IMPLEMENTATION_SUMMARY.md` - Technical specifications
- `IMPLEMENTATION_BLUEPRINT.md` - This file - Complete development plan

**Ready to proceed with systematic implementation.**
