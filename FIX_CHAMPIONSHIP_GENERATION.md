The user reported a bug where generating groups/matches for "group stage + knockout" championships was failing with a 422 error. The backend logs were requested.

### Root Cause Analysis
1.  **Missing Format Validation**: The `BracketController@generate` method validated the `format` field against a list: `league,knockout,groups,league_playoffs`. However, the frontend sends `group_knockout` for championships configured with that format. This mismatch caused the 422 Unprocessable Entity error because `group_knockout` was rejected by the validator.
2.  **Missing Logic Implementation**: Even if the validation passed (e.g., for `groups` format), the `switch ($format)` statement in `generate` completely ignored `groups` and `group_knockout`, resulting in no matches being generated (although this specific issue wouldn't cause a 422, it would cause functional failure).

### Fix Applied
1.  **Updated Validation Rule**: Added `group_knockout` to the validation rule in `BracketController@generate`.
2.  **Implemented Logic**: Added cases for `groups` and `group_knockout` in the `switch` statement to call `generateGroupsBracket`.
3.  **Added Logging**: Inserted `Log::info` statements in `generate`, `generateFromGroups`, and `advancePhase` to tracking the flow and data for easier debugging in the future.

### Files Modified
- `backend/app/Http/Controllers/Admin/BracketController.php`

### Verification
The user should now be able to generate the group stage schedule. Upon completion of the group stage, the "Gerar Mata-mata" button (calling `generateFromGroups`) should also work (in fact, `generateFromGroups` logic itself seemed fine but was unreachable or the initial group generation was the blocker). The 422 error on initial generation is resolved.
