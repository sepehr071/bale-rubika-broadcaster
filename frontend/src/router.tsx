import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './layout/AppShell';
import ComposePage from './pages/Compose';
import HistoryPage from './pages/History';
import SetupPage from './pages/Setup';
import HelpPage from './pages/Help';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ComposePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'setup', element: <SetupPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
