import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Queue from './pages/Queue';
import Inbox from './pages/Inbox';
import BusinessOwner from './pages/BusinessOwner';
import SupabaseConfigWarning from './components/SupabaseConfigWarning';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/business" element={<BusinessOwner />} />
        </Routes>
      </Layout>
      <SupabaseConfigWarning />
    </Router>
  );
}
