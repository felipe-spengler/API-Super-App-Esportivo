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
import { CreateRaceWizard } from './pages/Corridas/CreateRaceWizard';
import { RaceResults } from './pages/Corridas/RaceResults';
import { NewEventSelection } from './pages/EventWizard/NewEventSelection';

import { Explore } from './pages/Public/Explore';
import { EventDetails } from './pages/Public/EventDetails';
import { EventMatches } from './pages/Public/EventMatches';
import { EventLeaderboard } from './pages/Public/EventLeaderboard';

// ... (imports anteriores mantidos se não removidos) 
// OBS: Vou usar replace de bloco maior para garantir injection correta

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
import { MyInscriptions } from './pages/Public/MyInscriptions';
import { Voting } from './pages/Public/Voting';
import { SumulaVolei } from './pages/Matches/SumulaVolei';
import { SumulaBasquete } from './pages/Matches/SumulaBasquete';

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
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/:id/matches" element={<EventMatches />} />
            <Route path="/events/:id/leaderboard" element={<EventLeaderboard />} />
            <Route path="/events/:id/stats" element={<div className="p-4">Estatísticas (Em desenvolvimento)</div>} />
            <Route path="/events/:id/mvp" element={<div className="p-4">MVP (Em desenvolvimento)</div>} />
            <Route path="/events/:id/teams" element={<div className="p-4">Equipes (Em desenvolvimento)</div>} />
            <Route path="/events/:id/awards" element={<div className="p-4">Artes (Em desenvolvimento)</div>} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/races/:id" element={<RaceDetails />} />
            <Route path="/races/:id/results" element={<div className="p-10 text-center">Resultados (Em Breve)</div>} />

            {/* Athlete Private Area */}
            <Route path="/profile/teams" element={<MyTeams />} />
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
