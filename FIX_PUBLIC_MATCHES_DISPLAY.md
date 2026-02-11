The user requested changes to the public "Events Matches" page to hide scores for scheduled matches and translate the "Scheduled" status badge.

### Changes Applied
1.  **Modified `backend/frontend/src/pages/Public/EventMatches.tsx`**:
    -   Updated `getStatusBadge` function:
        -   Added a case for `scheduled` to return a blue badge with text "Agendado".
    -   Updated `MatchCard` component render logic:
        -   Added a conditional check: `if (match.status === 'scheduled' || match.status === 'upcoming')`.
        -   If true, it now displays a large gray "VS" instead of the `0 x 0` score.
        -   If false (live or finished), it displays the score as before.

### Rationale
-   Displaying `0 x 0` for future matches can be confusing, implying the match has started or finished with a draw. "VS" is a standard placeholder.
-   "Scheduled" is now localized to Portuguese as "Agendado" to match the rest of the application.

### Verification
-   Navigate to a public event page matches tab (e.g., `/events/:id/matches`).
-   Verify that matches with status "scheduled" show a blue "Agendado" badge.
-   Verify that the score area shows "VS" for these matches instead of numbers.
