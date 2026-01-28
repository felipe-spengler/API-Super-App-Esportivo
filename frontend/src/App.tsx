import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Championships } from './pages/Championships';
import { ChampionshipForm } from './pages/Championships/ChampionshipForm';
import { Teams } from './pages/Teams';
import { Matches } from './pages/Matches';
import { SumulaFutebol } from './pages/Matches/SumulaFutebol';
import { CreateRaceWizard } from './pages/Corridas/CreateRaceWizard';
import { NewEventSelection } from './pages/EventWizard/NewEventSelection';

import { PublicLayout } from './layouts/PublicLayout';
import { PublicHome } from './pages/Public/Home';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ÁREA PÚBLICA (Visitante / Atleta) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicHome />} />
            {/* <Route path="/explore" element={<Explore />} />  -- Implementar depois */}
            {/* <Route path="/events/:id" element={<EventDetails />} /> -- Implementar depois */}
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
              <Route path="races/new" element={<CreateRaceWizard />} />

              <Route path="teams" element={<Teams />} />
              <Route path="matches" element={<Matches />} />
            </Route>

            {/* Rotas Fullscreen do Admin (fora do layout) */}
            <Route path="matches/:id/sumula" element={<SumulaFutebol />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
