import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homePathForRole, useAuth } from './lib/auth';
import { RequireAuth, RequireRole } from './components/RequireAuth';
import { Login } from './routes/Login';
import { ManagerHome } from './routes/ManagerHome';
import { ManagerSchedule } from './routes/ManagerSchedule';
import { Technician } from './routes/Technician';
import { Inbox } from './routes/Inbox';
import { NotFound } from './routes/NotFound';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />;
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/manager"
            element={
              <RequireAuth>
                <RequireRole role="manager">
                  <ManagerHome />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/manager/schedule"
            element={
              <RequireAuth>
                <RequireRole role="manager">
                  <ManagerSchedule />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/technician"
            element={
              <RequireAuth>
                <RequireRole role="technician">
                  <Technician />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/inbox"
            element={
              <RequireAuth>
                <Inbox />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
