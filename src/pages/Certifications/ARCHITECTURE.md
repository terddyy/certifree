# Certifications Module - Visual Structure

## 📁 Complete Folder Tree

```
src/pages/Certifications/
│
├── 📄 index.tsx                           # 🚪 Entry Point
│   └── Exports: CertificationsPage (default & named)
│
├── 📄 CertificationsPage.tsx              # 🎯 Main Orchestrator
│   ├── Imports: All components, hooks, utils
│   ├── Uses: useCertificationsPage hook
│   ├── Uses: useRealtimeUpdates hook
│   └── Composes: PageHeader, FiltersSection, ResultsHeader, etc.
│
├── 📄 types.ts                            # 📝 Type Definitions
│   ├── CertificationsFilters interface
│   ├── CertificationsState interface
│   ├── CertificationCardProps interface
│   └── ViewMode type
│
├── 📁 components/                         # 🎨 UI Components
│   │
│   ├── 📄 index.ts                        # Component exports
│   │
│   ├── 📄 PageHeader.tsx                  # Page title & description
│   │   └── Renders: Static hero section
│   │
│   ├── 📄 FiltersSection.tsx              # Category filters
│   │   ├── Props: categories, isAdmin, handlers
│   │   ├── Renders: Select dropdown
│   │   └── Renders: Admin action buttons
│   │
│   ├── 📄 ResultsHeader.tsx               # Results count & view toggle
│   │   ├── Props: count, searchQuery, viewMode
│   │   └── Renders: ViewModeToggle component
│   │
│   ├── 📄 CertificationsGrid.tsx          # Grid/List renderer
│   │   ├── Props: certifications, viewMode, handlers
│   │   ├── Renders: CertificationCard (grid)
│   │   └── Renders: CertificationListItem (list)
│   │
│   ├── 📄 CertificationDialogs.tsx        # Dialogs wrapper
│   │   ├── Renders: AddCertificationDialog
│   │   └── Renders: EditCertificationDialog
│   │
│   ├── 📄 LoadingState.tsx                # Loading UI
│   │   └── Renders: Centered loading message
│   │
│   └── 📄 ErrorState.tsx                  # Error UI
│       └── Renders: Centered error message
│
├── 📁 hooks/                              # 🎣 Custom Hooks
│   │
│   ├── 📄 index.ts                        # Hook exports
│   │
│   ├── 📄 useCertificationsPage.ts        # 🧠 Main state manager
│   │   ├── Uses: useState (local UI state)
│   │   ├── Uses: useEffect (debouncing, sync)
│   │   ├── Uses: useMemo (computed values)
│   │   ├── Uses: useCertifications (data)
│   │   ├── Uses: useCategoriesAndProviders (metadata)
│   │   ├── Uses: useFavoritesAndProgress (user state)
│   │   ├── Uses: useCertificationManagement (CRUD)
│   │   └── Returns: Unified state & handlers interface
│   │
│   └── 📄 useRealtimeUpdates.ts           # 🔄 Supabase subscriptions
│       ├── Uses: useEffect (subscribe/cleanup)
│       ├── Listens: INSERT events on certifications table
│       └── Shows: Toast notifications
│
└── 📁 utils/                              # 🛠️ Helper Functions
    │
    └── 📄 helpers.ts                      # Pure utility functions
        ├── createAuthGuard() - Auth factory
        ├── isUserAdmin() - Admin check
        ├── formatCertificationCount() - Message formatter
        └── processSearchQuery() - Search processor
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Sources                          │
├─────────────────────────────────────────────────────────────────┤
│  useCertifications         useCategoriesAndProviders            │
│  useFavoritesAndProgress   useCertificationManagement          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   useCertificationsPage                         │
│  (Aggregates all state, provides unified interface)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CertificationsPage                            │
│  (Main component, composes all sub-components)                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   PageHeader    FiltersSection  ResultsHeader  CertificationsGrid
                                                       │
                                    ┌──────────────────┴─────────────┐
                                    ▼                                ▼
                          CertificationCard                CertificationListItem
```

## 🎯 Component Responsibility Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     CertificationsPage                           │
│  Responsibility: Orchestrate and compose                         │
│  ✓ Get state from useCertificationsPage                         │
│  ✓ Pass props to child components                               │
│  ✓ Handle high-level events                                     │
│  ✗ Direct DOM manipulation                                       │
│  ✗ Complex business logic                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        PageHeader                                │
│  Responsibility: Display static content                          │
│  ✓ Render title and description                                 │
│  ✓ Render background effects                                    │
│  ✗ Handle user interactions                                      │
│  ✗ Manage state                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     FiltersSection                               │
│  Responsibility: Category filtering UI                           │
│  ✓ Render category dropdown                                     │
│  ✓ Render admin action buttons                                  │
│  ✓ Emit selection events                                        │
│  ✗ Fetch categories                                             │
│  ✗ Manage category state                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ResultsHeader                                │
│  Responsibility: Display results & view toggle                   │
│  ✓ Show certification count                                     │
│  ✓ Show search query (if present)                               │
│  ✓ Render view mode toggle                                      │
│  ✗ Calculate count                                              │
│  ✗ Manage view mode state                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  CertificationsGrid                              │
│  Responsibility: Render certification items                      │
│  ✓ Map certifications to components                             │
│  ✓ Switch between grid/list view                                │
│  ✓ Pass props to card components                                │
│  ✗ Fetch certifications                                         │
│  ✗ Manage favorite state                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CertificationDialogs                             │
│  Responsibility: Wrapper for dialogs                             │
│  ✓ Render add dialog                                            │
│  ✓ Render edit dialog                                           │
│  ✓ Pass props and handlers                                      │
│  ✗ Manage dialog state                                          │
│  ✗ Handle form submission                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🎣 Hook Composition

```
useCertificationsPage
│
├── State Management (useState)
│   ├── searchQuery
│   ├── debouncedSearch
│   ├── selectedCategory
│   ├── selectedProvider
│   ├── sortBy
│   ├── viewMode
│   ├── certs
│   ├── isAddDialogOpen
│   └── editingCertification
│
├── Side Effects (useEffect)
│   ├── Debounce search input
│   └── Sync filtered certifications
│
├── Computed Values (useMemo)
│   ├── filters object
│   └── isAdmin flag
│
├── External Hooks
│   ├── useNavigate()
│   ├── useAuth()
│   ├── useToast()
│   ├── useCertifications(filters)
│   ├── useCategoriesAndProviders()
│   ├── useFavoritesAndProgress(certifications)
│   └── useCertificationManagement()
│
└── Returns
    ├── All state variables
    ├── All setter functions
    ├── Computed values
    ├── Data from external hooks
    └── Navigation & toast functions
```

## 🛠️ Utility Functions

```
helpers.ts
│
├── createAuthGuard(userId, onUnauthenticated)
│   ├── Returns: Function that guards actions
│   ├── Checks: User authentication
│   └── Redirects: If not authenticated
│
├── isUserAdmin(profile)
│   ├── Checks: isAdmin || isSuperAdmin
│   └── Returns: Boolean
│
├── formatCertificationCount(count, searchQuery?)
│   ├── Formats: Count message
│   └── Returns: String
│
└── processSearchQuery(query, minLength = 2)
    ├── Trims: Whitespace
    ├── Validates: Minimum length
    └── Returns: Processed query
```

## 📦 Import/Export Structure

```
index.tsx (Entry Point)
│
├── Exports (default)
│   └── CertificationsPage
│
├── Exports (named)
│   ├── CertificationsPage
│   ├── ViewMode
│   ├── CertificationsFilters
│   └── CertificationsState
│
└── Usage
    └── import Certifications from "@/pages/Certifications"
```

## 🔗 Dependency Graph

```
CertificationsPage.tsx
│
├── Depends On
│   ├── hooks/useCertificationsPage
│   ├── hooks/useRealtimeUpdates
│   ├── components/* (all components)
│   ├── utils/helpers
│   ├── @/components/layout/Header
│   ├── @/components/layout/Footer
│   └── @/components/certifications/SearchBar
│
hooks/useCertificationsPage.ts
│
├── Depends On
│   ├── react (useState, useEffect, useMemo)
│   ├── react-router-dom (useNavigate)
│   ├── @/contexts/AuthContext (useAuth)
│   ├── @/components/ui/use-toast (useToast)
│   ├── @/hooks/useCertifications
│   ├── @/hooks/useCategoriesAndProviders
│   ├── @/hooks/useFavoritesAndProgress
│   ├── @/hooks/useCertificationManagement
│   ├── utils/helpers
│   └── types
│
components/CertificationsGrid.tsx
│
├── Depends On
│   ├── @/components/certifications/CertificationCard
│   ├── @/components/certifications/CertificationListItem
│   ├── @/components/certifications/EmptyState
│   └── types
│
components/FiltersSection.tsx
│
├── Depends On
│   ├── @/components/ui/button
│   ├── @/components/ui/select
│   ├── lucide-react (icons)
│   └── @/services/certificationService (types)
```

## 🎨 UI Component Tree

```
<div className="min-h-screen bg-gradient...">
  │
  ├── <Header />
  │
  ├── <main className="container...">
  │   │
  │   ├── <PageHeader />
  │   │
  │   ├── <SearchBar />
  │   │
  │   ├── <FiltersSection>
  │   │   ├── <h3>Categories</h3>
  │   │   ├── <Button>Add Certification</Button>
  │   │   └── <Select>
  │   │       ├── <SelectTrigger />
  │   │       └── <SelectContent>
  │   │           └── <SelectItem /> (multiple)
  │   │
  │   ├── <ResultsHeader>
  │   │   ├── <p>Showing X certifications</p>
  │   │   └── <ViewModeToggle />
  │   │
  │   └── <CertificationsGrid>
  │       ├── <h2>All Certifications</h2>
  │       └── <div className="grid...">
  │           └── <CertificationCard /> (multiple)
  │               or
  │               <CertificationListItem /> (multiple)
  │
  ├── <Footer />
  │
  └── <CertificationDialogs>
      ├── <AddCertificationDialog />
      └── <EditCertificationDialog />
```

## 📊 File Size Distribution

```
Component Files         ~50 lines each
Hook Files             ~100 lines each
Main Page              ~150 lines
Utils                  ~45 lines
Types                  ~35 lines
Documentation          ~500 lines

Total LOC (code only): ~700 lines
Total LOC (with docs): ~1,200 lines
```

## ✅ Quality Checklist

```
Architecture
├── ✅ Single Responsibility Principle
├── ✅ Separation of Concerns
├── ✅ DRY (Don't Repeat Yourself)
├── ✅ Component Composition
└── ✅ Custom Hook Pattern

Code Quality
├── ✅ TypeScript Strict Mode
├── ✅ No `any` Types
├── ✅ Proper Interfaces
├── ✅ Clean Imports
└── ✅ Consistent Naming

Performance
├── ✅ Debounced Inputs
├── ✅ Memoized Values
├── ✅ Optimistic Updates
├── ✅ Minimal Re-renders
└── ✅ Code Splitting Ready

Maintainability
├── ✅ Clear File Structure
├── ✅ Small Files (<200 lines)
├── ✅ Well Documented
├── ✅ Easy to Test
└── ✅ Scalable Design
```

---

**This visual guide provides a comprehensive overview of the Certifications module architecture.**
