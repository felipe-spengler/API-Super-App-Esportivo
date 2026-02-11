The user wanted to verify where they can see the formed groups and their matches separated by group. Additionally, the user log indicated a "Column not found: 1054 Unknown column 'round'" error.

### Issues Addressed
1.  **Unknown Column Error**: The `game_matches` table has `round_name` but not `round`.
    -   `EventController@knockoutBracket` was querying `round`.
    -   `BracketController@generateFromGroups` was trying to insert into `round`.
    -   **Fix**: Updated both controllers to use `round_name` instead of `round`.

2.  **Public Matches Display**: The user wanted to see matches separated by group ("ver os jogos por grupos ipo separado").
    -   The public matches page (`EventMatches.tsx`) grouped matches only by Round.
    -   **Fix**: Updated `EventMatches.tsx` to group matches by `group_name` *within* each round, displaying a "Grupo X" header for each group's matches.

### Verification
1.  **Groups Visibility**: I will inform the user that the groups and standings can be seen in the **Classificação** (Leaderboard) page.
2.  **Matches Separation**: The user can now visit the Matches page and see:
    -   Round Header (e.g., "Rodada 1")
    -   Group Header (e.g., "Grupo A")
    -   Matches list for Group A
    -   Group Header (e.g., "Grupo B")
    -   Matches list for Group B
    -   ...
3.  **Knockout Generation**: The "Unknown column 'round'" error should be gone, allowing the knockout bracket to be generated and displayed correctly (once generated).

### Files Modified
-   `backend/frontend/src/pages/Public/EventMatches.tsx`
-   `backend/app/Http/Controllers/EventController.php`
-   `backend/app/Http/Controllers/Admin/BracketController.php`
