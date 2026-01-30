import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Championships } from './pages/Championships';
import { ChampionshipForm } from './pages/Championships/ChampionshipForm';
import { AdminChampionshipDetails } from './pages/Championships/AdminChampionshipDetails';
import { AdminMatchManager } from './pages/Championships/AdminMatchManager';
import { GroupDraw } from './pages/Championships/GroupDraw';
import { Teams } from './pages/Teams';
import { TeamForm } from './pages/Teams/TeamForm';
import { TeamDetails } from './pages/Teams/TeamDetails';
import { Players } from './pages/Players';
import { PlayerForm } from './pages/Players/PlayerForm';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Matches } from './pages/Matches';
import { SumulaFutebol } from './pages/Matches/SumulaFutebol';
import { CreateRaceWizard } from './pages/Corridas/CreateRaceWizard';
import { RaceResults } from './pages/Corridas/RaceResults';
import { NewEventSelection } from './pages/EventWizard/NewEventSelection';

import { Explore } from './pages/Public/Explore';
import { EventDetails } from './pages/Public/EventDetails';
import { EventMatches } from './pages/Public/EventMatches';
import { EventLeaderboard } from './pages/Public/EventLeaderboard';
import { EventStats } from './pages/Public/EventStats';
import { EventMVP } from './pages/Public/EventMVP';
import { EventParticipants } from './pages/Public/EventParticipants';
import { EventArts } from './pages/Public/EventArts';

import { PublicLayout } from './layouts/PublicLayout';
import { PublicHome } from './pages/Public/Home';
import { ClubHome } from './pages/Public/ClubHome';
import { Wallet } from './pages/Public/Wallet';
import { Agenda } from './pages/Public/Agenda';
import { Shop } from './pages/Public/Shop';
import { RaceDetails } from './pages/Public/RaceDetails';
import { Register } from './pages/Register';
import { Profile } from './pages/Public/Profile';
import { MyTeams } from './pages/Public/MyTeams';
import { MyTeamForm } from './pages/Public/MyTeamForm';
import { MyTeamDetails } from './pages/Public/MyTeamDetails';
import { MyInscriptions } from './pages/Public/MyInscriptions';
import { Voting } from './pages/Public/Voting';
import { ChampionshipInscription } from './pages/Public/ChampionshipInscription';
import { SumulaVolei } from './pages/Matches/SumulaVolei';
import { SumulaFutsal } from './pages/Matches/SumulaFutsal';
import { SumulaBasquete } from './pages/Matches/SumulaBasquete';
import { SumulaHandebol } from './pages/Matches/SumulaHandebol';
import { SumulaBeachTennis } from './pages/Matches/SumulaBeachTennis';
import { MatchPrintView } from './pages/Matches/MatchPrintView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ÁREA PÚBLICA (Visitante / Atleta) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicHome />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/club-home" element={<ClubHome />} />
            <Route path="/club-home/:slug" element={<ClubHome />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/:id/matches" element={<EventMatches />} />
            <Route path="/events/:id/leaderboard" element={<EventLeaderboard />} />
            <Route path="/events/:id/stats" element={<EventStats />} />
            <Route path="/events/:id/mvp" element={<EventMVP />} />
            <Route path="/events/:id/teams" element={<EventParticipants />} />
            <Route path="/events/:id/awards" element={<EventArts />} />
            <Route path="/register" element={<Register />} />
            <Route path="/inscription/:id" element={<ChampionshipInscription />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/races/:id" element={<RaceDetails />} />
            <Route path="/races/:id/results" element={<div className="p-10 text-center">Resultados (Em Breve)</div>} />

            {/* Athlete Private Area */}
            <Route path="/profile/teams" element={<MyTeams />} />
            <Route path="/profile/teams/new" element={<MyTeamForm />} />
            <Route path="/profile/teams/:id" element={<MyTeamDetails />} />
            <Route path="/profile/inscriptions" element={<MyInscriptions />} />
            <Route path="/profile/orders" element={<div className="p-10 text-center text-gray-500">Meus Pedidos (Em desenvolvimento)</div>} />
            <Route path="/voting" element={<Voting />} />
          </Route>

          <Route path="/login" element={<Login />} />

          {/* ÁREA ADMINISTRATIVA (Protegida) */}
          <Route path="/admin" element={<PrivateRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} /> {/* Redirect legado */}

              <Route path="championships" element={<Championships />} />
              <Route path="championships/new" element={<NewEventSelection />} />
              <Route path="championships/new/team-sports" element={<ChampionshipForm />} />
              <Route path="championships/:id" element={<AdminChampionshipDetails />} />
              <Route path="championships/:id/edit" element={<ChampionshipForm />} />
              <Route path="championships/:id/matches" element={<AdminMatchManager />} />
              <Route path="championships/:id/draw" element={<GroupDraw />} />
              <Route path="races/new" element={<CreateRaceWizard />} />
              <Route path="races/:id/results" element={<RaceResults />} />

              <Route path="teams" element={<Teams />} />
              <Route path="teams/:id" element={<TeamDetails />} />
              <Route path="teams/new" element={<TeamForm />} />
              <Route path="players" element={<Players />} />
              <Route path="players/new" element={<PlayerForm />} />
              <Route path="players/:id/edit" element={<PlayerForm />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />

              <Route path="matches" element={<Matches />} />
            </Route>

            {/* Rotas Fullscreen do Admin (fora do layout) */}
            <Route path="matches/:id/sumula" element={<SumulaFutebol />} />
            <Route path="matches/:id/sumula-volei" element={<SumulaVolei />} />
            <Route path="matches/:id/sumula-futsal" element={<SumulaFutsal />} />
            <Route path="matches/:id/sumula-basquete" element={<SumulaBasquete />} />
            <Route path="matches/:id/sumula-handebol" element={<SumulaHandebol />} />
            <Route path="matches/:id/sumula-beach-tennis" element={<SumulaBeachTennis />} />
            <Route path="matches/:id/sumula-print" element={<MatchPrintView />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
