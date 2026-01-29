import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Championships } from './pages/Championships';
import { ChampionshipForm } from './pages/Championships/ChampionshipForm';
import { GroupDraw } from './pages/Championships/GroupDraw';
import { Teams } from './pages/Teams';
import { Matches } from './pages/Matches';
import { SumulaFutebol } from './pages/Matches/SumulaFutebol';
// Race Pages
import { EventStats } from './pages/Public/EventStats';
import { EventMVP } from './pages/Public/EventMVP';
import { EventParticipants } from './pages/Public/EventParticipants';
import { EventArts } from './pages/Public/EventArts';

// ... (existing imports)

// Inside Routes:
            <Route path="/events/:id/matches" element={<EventMatches />} />
            <Route path="/events/:id/leaderboard" element={<EventLeaderboard />} />
            <Route path="/events/:id/stats" element={<EventStats />} />
            <Route path="/events/:id/mvp" element={<EventMVP />} />
            <Route path="/events/:id/teams" element={<EventParticipants />} />
            <Route path="/events/:id/awards" element={<EventArts />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/races/:id" element={<RaceDetails />} />
            <Route path="/races/:id/results" element={<div className="p-10 text-center">Resultados (Em Breve)</div>} />

{/* Athlete Private Area */ }
            <Route path="/profile/teams" element={<MyTeams />} />
            <Route path="/profile/inscriptions" element={<MyInscriptions />} />
            <Route path="/profile/orders" element={<div className="p-10 text-center text-gray-500">Meus Pedidos (Em desenvolvimento)</div>} />
            <Route path="/voting" element={<Voting />} />
          </Route >

  <Route path="/login" element={<Login />} />

{/* ÁREA ADMINISTRATIVA (Protegida) */ }
<Route path="/admin" element={<PrivateRoute />}>
  <Route element={<AdminLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} /> {/* Redirect legado */}

    <Route path="championships" element={<Championships />} />
    <Route path="championships/new" element={<NewEventSelection />} />
    <Route path="championships/new/team-sports" element={<ChampionshipForm />} />
    <Route path="championships/:id/draw" element={<GroupDraw />} />
    <Route path="races/new" element={<CreateRaceWizard />} />
    <Route path="races/:id/results" element={<RaceResults />} />

    <Route path="teams" element={<Teams />} />
    <Route path="matches" element={<Matches />} />
  </Route>

  {/* Rotas Fullscreen do Admin (fora do layout) */}
  <Route path="matches/:id/sumula" element={<SumulaFutebol />} />
  <Route path="matches/:id/sumula-volei" element={<SumulaVolei />} />
  <Route path="matches/:id/sumula-basquete" element={<SumulaBasquete />} />
</Route>

{/* Fallback */ }
<Route path="*" element={<Navigate to="/" replace />} />
        </Routes >
      </AuthProvider >
    </BrowserRouter >
  );
}

export default App;
