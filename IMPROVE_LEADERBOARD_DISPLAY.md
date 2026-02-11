The user wanted to improve the public leaderboard to "show the structure nicely" even if no games have been played yet.

### Changes Applied
1.  **Backend (`EventController.php`)**:
    -   Added strictly alphabetical sorting as a tiebreaker for team standings when points, wins, and goal difference are equal. This ensures a consistent order (e.g., A-Z) instead of random DB order before matches start.
2.  **Frontend (`EventLeaderboard.tsx`)**:
    -   **Group Sorting**: Groups are now sorted alphabetically (Grupo A, Grupo B, etc.) instead of random object key order.
    -   **Structure Visibility**:
        -   For `group_knockout` format, it now **always** shows the "Fase de Grupos" section if teams exist, even if no games are played (removed the "not available" message).
        -   Added a "Fase Final (Mata-mata)" section that appears even if the bracket hasn't been generated yet, displaying a friendly placeholder message ("Chaveamento Indefinido... será gerado automaticamente").
    -   **Styling**: Group headers are now consistent.

### Files Modified
-   `backend/app/Http/Controllers/EventController.php`
-   `backend/frontend/src/pages/Public/EventLeaderboard.tsx`

### Verification
-   Visit the leaderboard page for championship ID 54.
-   You should see "Fase de Grupos" with tables for the groups (even if empty stats).
-   You should see "Fase Final" with a placeholder message if the knockout stage hasn't been generated yet (or the actual bracket if it has).
