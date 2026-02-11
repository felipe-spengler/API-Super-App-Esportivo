The user wanted to maintain separate rosters for the same team across different championships (e.g., Sub-20 vs Sub-40 squads) and fix a navigation issue when viewing team details from the championship manager context.

### Changes Applied

1.  **Database/Backend**:
    -   **Migration**: Added a `championship_id` column to the `team_players` pivot table in the migration file: `database/migrations/2026_02_11_120000_add_championship_id_to_team_players_table.php`. This allows linking a player to a team specifically for a championship.
    -   **TeamController**: Updated `addPlayer` to accept `championship_id`. It now saves this ID in the pivot table, allowing the same player (User) to be linked to the same Team multiple times with different contexts (e.g., different positions/numbers per championship).
    -   **AdminTeamController**:
        -   Updated `show` method to filter players based on `championship_id`. If `championship_id` is passed, it returns ONLY players specific to that championship. If not, it returns ONLY global/default players. This ensures complete separation of rosters.
        -   Updated `removePlayer` to respect the `championship_id`, ensuring we delete the correct roster entry.

2.  **Frontend**:
    -   **Navigation**: Updated `AdminTeamChampionshipManager.tsx` to pass the `fromChampionshipId` state when navigating to team details.
    -   **TeamDetails.tsx**:
        -   Added logic to read `fromChampionshipId` from the navigation state.
        -   Updated the "Voltar" (Back) button to return to the championship's team list if a championship context exists.
        -   Updated `loadTeam`, `handleAddPlayer`, and `handleRemovePlayer` to pass the `championship_id` to the API, ensuring all actions are context-aware.
        -   Added a visual indicator "(Contexto: Campeonato)" to the title when managing a specific championship roster.

### Deployment Instructions (VPS)
Since the system is running on a VPS, you must run the migration there:
```bash
php artisan migrate
```
This will add the new `championship_id` column to your database, enabling the separate roster functionality.

### Verification
1.  **Navigation**: Go to a Championship -> Manage Teams -> Click "Jogadores" on a team.
    -   Verify the title says "(Contexto: Campeonato)".
    -   Click "Voltar" and verify it goes back to the Championship Teams list, not the global list.
2.  **Separate Rosters**:
    -   Add a player to a team inside a Championship context.
    -   Go to the global "Equipes" menu -> Click the same team.
    -   Verify the player added in the championship DOES NOT appear in the global list (and vice-versa).
    -   This confirms the rosters are completely separate as requested.
