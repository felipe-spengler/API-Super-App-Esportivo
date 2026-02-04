<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Club;
use App\Models\Sport;
use App\Models\Category;

use App\Http\Requests\StoreChampionshipRequest;

class AdminChampionshipController extends Controller
{
    // List all championships for admin's club
    public function index(Request $request)
    {
$user = $request->user();

        // Removed 'sport' from with() because typically sport is a string column, unless strictly defined.
        // If Model has sport() relation, keep it. But earlier view of Model showed public function sport() { belongsTo(Sport::class) }.
// BUT Form sends string. If DB has sport_id nullable and sport string...
// Let's look at Model again:
// public function sport() { return $this->belongsTo(Sport::class); }
// BUT fillable has 'sport_id'.
// AND 'sport' is likely a column too in some versions or mismatched.
// If the table has `sport_id` but some rows have it null, it's fine.
// However, if the error is "Call to undefined association", it means the relation name is wrong.
// The relation IS defined in Model: public function sport().
// So the error might be elsewhere.
// ACTUALLY: The frontend uses `camp.sport` which is a string.
// If `camp.sport` is an object (from JSON), rendering `{camp.sport}` in React (text node) causes CRASH [object Object].
// React Error: "Objects are not valid as a React child".
// FIX: Update Controller to return what we need, OR update Frontend to handle object.
//
// In Frontend: <p ...>{camp.sport}</p>
// If backend returns `sport: { id: 1, name: 'Futebol' }` via eager load, React crashes trying to print the object.
//
// Strategy:
// 1. In frontend, usage is `camp.sport`.
// 2. If I remove `with('sport')`, `camp.sport` might be null if it relies on the relationship.
// 3. Wait, does the championships table have a `sport` VARCHAR column?
// The Form sends `sport: 'Futebol'`.
// Store method separates it? $validated includes 'sport' (string)?
// The Model fillable has 'sport_id', but NOT 'sport' (string).
// BUT `admin/championships` POST sends `sport` string in formData.
// If `store` method just does `create($validated)`, and $validated has `sport` string... but model doesn't have it in
fillable... it might be ignored or throw if strict.
//
// HYPOTHESIS: The frontend expects a string for `sport`. The backend might be returning an object (relation) OR the
column is missing.
//
// Let's safeguard the Frontend to handle Object or String.
// But first, let's fix the Controller to ensure we are sending usable data.
// I will keep `with(['sport'])` but checking Frontend.
//
// Actually, looking at `ChampionshipForm`:
// const [formData, setFormData] = useState({ sport: 'Futebol', ... });
// It sends a string.
// If the DB has `sport` column, it saves string.
// If the DB only has `sport_id`, the string is lost unless mapped.
//
// Let's assume the frontend crash is due to `camp.sport` being an object (the relation).
//
// I will modify the FRONTEND to render `camp.sport?.name || camp.sport` to resolve the "Objects are not valid as React
child" crash.
//
// Wait, I cannot edit frontend in this step if I'm editing backend? I can use multiple tools or sequential.
//
// Let's edit the Frontend `index.tsx` first. It's safer.
//
// Wait, I just gathered info. I will update Frontend now.
// Canceling this PHP edit to prioritize Frontend fix.

$query = Championship::with(['sport', 'club', 'categories']);

// If not super admin, filter by club
if ($user->club_id) {
$query->where('club_id', $user->club_id);
}

if ($request->has('sport_id')) {
$query->where('sport_id', $request->sport_id);
}

$championships = $query->orderBy('start_date', 'desc')->get();

return response()->json($championships);
}

// Create new championship
public function store(StoreChampionshipRequest $request)
{
$user = $request->user();

// Dados já validados pelo FormRequest
$validated = $request->validated();

// Use user's club or allow super admin to specify
$validated['club_id'] = $user->club_id ?? $request->club_id;

$championship = Championship::create($validated);

// Cria uma categoria padrão automaticamente para evitar que o campeonato fique vazio
$championship->categories()->create([
'name' => 'Principal',
'gender' => 'mixed'
]);

return response()->json($championship->load(['sport', 'club', 'categories']), 201);
}

// Update championship
public function update(Request $request, $id)
{
$user = $request->user();

$championship = Championship::findOrFail($id);

// Check permission
if ($user->club_id && $championship->club_id !== $user->club_id) {
return response()->json(['message' => 'Unauthorized'], 403);
}

$validated = $request->validate([
'name' => 'string|max:255',
'start_date' => 'date',
'end_date' => 'nullable|date|after_or_equal:start_date',
'description' => 'nullable|string',
'format' => 'in:league,knockout,groups,league_playoffs,double_elimination,time_ranking',
'max_teams' => 'nullable|integer|min:2',
'is_active' => 'boolean',
]);

$championship->update($validated);

return response()->json($championship->load(['sport', 'club']));
}

// Delete championship
public function destroy(Request $request, $id)
{
$user = $request->user();

$championship = Championship::findOrFail($id);

// Check permission
if ($user->club_id && $championship->club_id !== $user->club_id) {
return response()->json(['message' => 'Unauthorized'], 403);
}

$championship->delete();

return response()->json(['message' => 'Championship deleted successfully']);
}

// Add category to championship
public function addCategory(Request $request, $championshipId)
{
$validated = $request->validate([
'name' => 'required|string|max:255',
'min_age' => 'nullable|integer',
'max_age' => 'nullable|integer',
'gender' => 'nullable|in:male,female,mixed',
]);

$championship = Championship::findOrFail($championshipId);

$category = $championship->categories()->create($validated);

return response()->json($category, 201);
}

// Get championship categories
public function categories($championshipId)
{
$championship = Championship::with('categories.children')->findOrFail($championshipId);

return response()->json($championship->categories);
}

// Update awards for championship
public function updateAwards(Request $request, $championshipId)
{
$championship = Championship::findOrFail($championshipId);

$validated = $request->validate([
'awards' => 'nullable', // Allow any structure (array or object)
]);

$championship->update(['awards' => $validated['awards']]);

return response()->json($championship);
}
}