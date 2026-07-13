# TanStack Query Refactor Plan

## Executive Summary

Refactor the festivals entity to use TanStack Query for server state management while keeping Redux for client state (filters, UI state). This demonstrates modern architectural patterns for React applications and proper separation of concerns.

## Current Architecture Issues

### 1. Mixed State Management
- **Server state** (API data) stored in Redux alongside **client state** (filters, UI)
- Same data exists in 3 places: RSC initial fetch → local useState → Redux
- Manual synchronization required between all three locations

### 2. Manual Cache Management
```typescript
// Current pattern - manual checks everywhere
if (!festival) {
  refreshFestival(festivalId, dispatch);
}

// Manual cache invalidation after mutations
setFestivalData(prev => ...) // Update local state
dispatch(deleteFestival(id))  // Update Redux
```

### 3. No Automatic Freshness
- Data fetched once on mount, never refreshes
- Stale data remains until manual refresh
- No background refetching when user returns to tab

### 4. Complex Fetch Logic
- DataTable has multiple useEffects coordinating fetch timing
- Race conditions possible with rapid filter changes
- No request deduplication

## Proposed Architecture

### State Separation
- **TanStack Query**: All server state (festivals data, single festival, mutations)
- **Redux**: Client state only (column filters, search bar filter, UI preferences)

### Benefits

1. **Automatic Caching**
   - Query cache shared across all components
   - No manual cache checks needed
   - Smart cache invalidation

2. **Background Refetching**
   - Stale-while-revalidate pattern
   - Show cached data instantly, fetch fresh in background
   - Configurable stale times per query

3. **Optimistic Updates**
   - Update UI immediately on mutation
   - Automatic rollback on error
   - Better perceived performance

4. **Request Deduplication**
   - Multiple components requesting same data → single request
   - Built-in loading/error states
   - Retry logic included

5. **DevTools**
   - Visual query cache inspection
   - See all active queries, their state, and data
   - Debug refetching behavior

## Implementation Plan

### Phase 1: Setup (30 min)

#### 1.1 Install Dependencies
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

#### 1.2 Create Query Client Provider
**File**: `src/components/providers/QueryProvider.tsx`
- Wrap app with QueryClientProvider
- Configure default options (staleTime, cacheTime, retry)
- Add React Query DevTools in development

#### 1.3 Update Root Layout
**File**: `src/app/layout.tsx`
- Add QueryProvider above Redux Provider
- Ensure proper provider nesting

### Phase 2: Create Query Hooks (1 hour)

#### 2.1 Festivals List Query
**File**: `src/components/page-components/festivals/hooks/useFestivalsQuery.ts`
```typescript
export const useFestivalsQuery = (params: GetAllParams) => {
  return useQuery({
    queryKey: ['festivals', params],
    queryFn: () => festivalApiService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### 2.2 Single Festival Query
**File**: `src/components/page-components/festivals/hooks/useFestivalQuery.ts`
```typescript
export const useFestivalQuery = (festivalId: number) => {
  return useQuery({
    queryKey: ['festival', festivalId],
    queryFn: () => festivalApiService.get(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000,
  });
};
```

#### 2.3 Festival Mutations
**File**: `src/components/page-components/festivals/hooks/useFestivalMutations.ts`
```typescript
export const useCreateFestival = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: festivalApiService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['festivals']);
    },
  });
};

export const useUpdateFestival = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: festivalApiService.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['festivals']);
      queryClient.invalidateQueries(['festival', data.id]);
    },
  });
};

export const useDeleteFestival = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: festivalApiService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries(['festivals']);
    },
    // Optional: optimistic updates
    onMutate: async (festivalId) => {
      await queryClient.cancelQueries(['festivals']);
      const previous = queryClient.getQueryData(['festivals']);
      queryClient.setQueryData(['festivals'], (old) => ({
        ...old,
        results: old.results.filter(f => f.id !== festivalId)
      }));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['festivals'], context.previous);
    },
  });
};

export const useTagFestival = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: TagAction }) =>
      festivalApiService.tag(id, action),
    onSuccess: (data) => {
      queryClient.setQueryData(['festival', data.id], data);
      queryClient.invalidateQueries(['festivals']);
    },
  });
};

export const useEnrichFestival = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: festivalApiService.enrich,
    onSuccess: (data) => {
      queryClient.setQueryData(['festival', data.id], data);
      queryClient.invalidateQueries(['festivals']);
    },
  });
};
```

### Phase 3: Refactor Redux Slice (30 min)

#### 3.1 Simplify Festival Slice
**File**: `src/redux/slices/festivalSlice.ts`

**Remove**:
- `festivals: Festival[]` array
- `setFestivals`, `setFestival`, `addFestival`, `updateFestival`, `deleteFestival` actions
- `fetchFestivals` thunk
- `loading`, `error` state
- `selectAllFestivals`, `selectFestival` selectors

**Keep**:
- `filters: ColumnFilter[]`
- `searchBarFilter: string`
- All filter-related actions and selectors
- Filter reducers from `createFilterReducers`

**Result**:
```typescript
interface FestivalsState {
  filters: ColumnFilter[];
  searchBarFilter: string;
}

const initialState: FestivalsState = {
  filters: [],
  searchBarFilter: "",
};

const festivalSlice = createSlice({
  name: "festivals",
  initialState,
  reducers: {
    ...createFilterReducers<FestivalsState>(),
  },
});

export const {
  setColumnFilters,
  setColumnFilter,
  removeColumnFilter,
  clearColumnFilters,
  setSearchBarFilter,
} = festivalSlice.actions;

export const selectColumnFilters = (state: RootState) => state.festivals.filters;
export const selectSearchBarFilter = (state: RootState) => state.festivals.searchBarFilter;
```

### Phase 4: Refactor Components (2-3 hours)

#### 4.1 Festivals Table
**File**: `src/components/page-components/festivals/components/table/FestivalsTable.tsx`

**Changes**:
- Remove `initialData` prop and local `festivalData` state
- Use `useFestivalsQuery` with pagination/filter params from Redux
- Use `useDeleteFestival` mutation for deletions
- Simplify - no manual state sync needed

**Before**:
```typescript
const [festivalData, setFestivalData] = useState(initialData);

const handleDataFetched = (data) => {
  setFestivalData(data);
  dispatch(setFestivals(data.results));
};
```

**After**:
```typescript
const columnFilters = useSelector(selectColumnFilters);
const searchBarFilter = useSelector(selectSearchBarFilter);

const { data, isLoading } = useFestivalsQuery({
  offset: pagination.pageIndex * pagination.pageSize,
  limit: pagination.pageSize,
  search: searchBarFilter,
  filters: columnFilters,
});

const deleteMutation = useDeleteFestival();
```

#### 4.2 Festivals Page (RSC)
**File**: `src/app/(main)/festivals/page.tsx`

**Changes**:
- Remove server-side `festivalApiService.getAll()` call
- Remove `initialData` prop to FestivalsTable
- Let client component handle all data fetching via Query

**Before**:
```typescript
const FestivalsPage = async () => {
  const festivals = await festivalApiService.getAll();
  return <FestivalsTable initialData={festivals} />;
};
```

**After**:
```typescript
const FestivalsPage = () => {
  return <FestivalsTable />;
};
```

#### 4.3 Festival Detail View
**File**: `src/components/page-components/festivals/components/details/FestivalView.tsx`

**Changes**:
- Remove Redux `selectFestival` selector
- Remove `refreshFestival` useEffect
- Use `useFestivalQuery` hook
- Use `useUpdateFestival` and `useDeleteFestival` mutations
- Automatic loading states from Query

**Before**:
```typescript
const festival = useSelector((state) => selectFestival(state, festivalId));

useEffect(() => {
  if (!festival) {
    refreshFestival(festivalId, dispatch);
  }
}, [festivalId, festival, dispatch]);

const handleDelete = async () => {
  await festivalApiService.remove(festivalId);
  router.push("/festivals");
};
```

**After**:
```typescript
const { data: festival, isLoading } = useFestivalQuery(festivalId);
const deleteMutation = useDeleteFestival();

const handleDelete = async () => {
  await deleteMutation.mutateAsync(festivalId);
  router.push("/festivals");
};
```

#### 4.4 Festival Edit Form
**File**: `src/app/(main)/festivals/[id]/edit/page.tsx`

**Changes**:
- Use `useFestivalQuery` to load form data
- Use `useUpdateFestival` mutation for submission
- Automatic cache invalidation on success

#### 4.5 Festival Create Form
**File**: `src/app/(main)/festivals/create/page.tsx`

**Changes**:
- Use `useCreateFestival` mutation
- Remove manual Redux dispatch after creation
- Query auto-invalidates festivals list

#### 4.6 Dashboard
**File**: `src/app/(main)/dashboard/page.tsx`

**Changes**:
- Replace `fetchFestivals` thunk with `useFestivalsQuery`
- Use Query's `isLoading` instead of Redux loading state
- Automatic refetch when user returns to tab

**Before**:
```typescript
const festivals = useSelector(selectAllFestivals);
const festivalsLoading = useSelector(state => state.festivals.loading);

useEffect(() => {
  dispatch(fetchFestivals({ limit: 10000 }));
}, [dispatch]);
```

**After**:
```typescript
const { data: festivalsData, isLoading: festivalsLoading } = useFestivalsQuery({
  limit: 10000
});
const festivals = festivalsData?.results || [];
```

### Phase 5: Cleanup (30 min)

#### 5.1 Remove Obsolete Files
- `src/components/page-components/festivals/helpers/refreshFestival.ts`
- Any other festival-specific refresh helpers

#### 5.2 Update CLAUDE.md
- Document new Query patterns
- Update architecture section
- Add Query hooks to conventions

#### 5.3 Type Safety
- Ensure all Query hooks are properly typed
- Update interfaces if needed

### Phase 6: Testing & Verification (1 hour)

#### 6.1 Manual Testing
- [ ] List page: pagination, filtering, search, delete
- [ ] Detail page: view, edit, delete, tag, enrich
- [ ] Create flow: step 1 → step 2
- [ ] Dashboard: festival count displays correctly
- [ ] Browser back/forward navigation
- [ ] Tab switching (verify background refetch)

#### 6.2 Verify Improvements
- [ ] No duplicate requests in Network tab
- [ ] Instant navigation with cached data
- [ ] Background refetch on tab focus
- [ ] Optimistic updates working (delete)
- [ ] Loading states smooth
- [ ] Error states handled

#### 6.3 DevTools Check
- [ ] Open React Query DevTools
- [ ] Verify query keys structure
- [ ] Check cache data
- [ ] Watch invalidation on mutations

## Query Configuration Strategy

### Default Options
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

### Query Key Structure
```typescript
// List queries - include all params in key
['festivals', { offset, limit, search, filters }]

// Single item queries
['festival', festivalId]

// Related data
['festival', festivalId, 'contacts']
['festival', festivalId, 'applications']
```

### Invalidation Strategy
- After create → invalidate `['festivals']`
- After update → invalidate `['festivals']` and `['festival', id]`
- After delete → invalidate `['festivals']`
- After tag → update `['festival', id]` directly, invalidate `['festivals']`

## Interview Talking Points

### What to Highlight

1. **Problem Recognition**
   - "Started with Redux for everything"
   - "Realized I was mixing server and client state"
   - "Server state has different needs: caching, refetching, synchronization"

2. **Architectural Decision**
   - "Separated concerns: Query for server state, Redux for UI state"
   - "Query provides caching, background refetch, optimistic updates out of box"
   - "Reduced boilerplate and manual cache management"

3. **Concrete Benefits**
   - "No more manual cache checks in components"
   - "Automatic request deduplication"
   - "Better UX with stale-while-revalidate"
   - "Fewer bugs from stale data"

4. **Migration Strategy**
   - "Refactored one entity completely to demonstrate pattern"
   - "Could incrementally migrate remaining entities"
   - "Kept Redux for filters to show both tools can coexist"

### Questions You Can Answer

- **Why not just Redux for everything?**
  "Redux is great for client state, but server state needs features like automatic refetching, cache expiration, and request deduplication that Query provides out of the box."

- **Why keep Redux at all?**
  "Filter state is true client state - it doesn't come from the server, and I want it to persist across page navigations. Redux is perfect for that."

- **Performance impact?**
  "Better performance - Query deduplicates requests, provides instant navigation with cached data, and only refetches when needed based on stale time."

## Timeline Estimate

- Phase 1 (Setup): 30 min
- Phase 2 (Hooks): 1 hour
- Phase 3 (Redux): 30 min
- Phase 4 (Components): 2-3 hours
- Phase 5 (Cleanup): 30 min
- Phase 6 (Testing): 1 hour

**Total: 5.5-6.5 hours**

## Rollback Plan

If issues arise:
1. All changes are in git - can revert easily
2. Only festivals entity affected - rest of app still works
3. Can complete migration later or revert to Redux

## Future Enhancements

After festivals refactor is proven:
1. Migrate venues entity
2. Migrate residencies entity
3. Migrate applications entity
4. Consider removing Redux entirely if no client state needs remain
5. Add infinite scroll to tables using `useInfiniteQuery`
6. Add prefetching on hover for detail pages

## Notes

- Keep old Redux code in git history for reference
- Document patterns in CLAUDE.md for consistency
- Consider blog post about the migration for portfolio