import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Templates from './pages/Templates';
import Queue from './pages/Queue';
import Inbox from './pages/Inbox';
import FAQ from './pages/FAQ';
import Experiments from './pages/Experiments';
import SupabaseConfigWarning from './components/SupabaseConfigWarning';

export default function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/experiments" element={<Experiments />} />
        </Routes>
      </AppShell>
      <SupabaseConfigWarning />
    </Router>
  );
}
