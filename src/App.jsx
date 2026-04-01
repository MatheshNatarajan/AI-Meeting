import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScheduleMeeting from './pages/ScheduleMeeting';
import MeetingRoom from './pages/MeetingRoom';
import AINotes from './pages/AINotes';
import Profile from './pages/Profile';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import Meetings from './pages/Meetings';

function PrivateLayout({ children }) {
  // In a real app, you'd check auth state
  const isAuthenticated = localStorage.getItem('token');
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function FullScreenRoute({ children }) {
  const isAuthenticated = localStorage.getItem('token');
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/schedule" element={<PrivateLayout><ScheduleMeeting /></PrivateLayout>} />
        <Route path="/meeting/:id" element={<FullScreenRoute><MeetingRoom /></FullScreenRoute>} />
        <Route path="/meetings" element={<PrivateLayout><Meetings /></PrivateLayout>} />
        <Route path="/notes/:id" element={<PrivateLayout><AINotes /></PrivateLayout>} />
        <Route path="/notes" element={<PrivateLayout><Notes /></PrivateLayout>} />
        <Route path="/tasks" element={<PrivateLayout><Tasks /></PrivateLayout>} />
        <Route path="/profile" element={<PrivateLayout><Profile /></PrivateLayout>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
