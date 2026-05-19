import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from './useSettings';

export function useBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useSettings();

  useEffect(() => {
    if (isLoading || !data) return;
    const anyConfigured = data.bale.configured || data.rubika.configured;
    if (!anyConfigured && location.pathname !== '/setup') {
      navigate('/setup', { replace: true });
    }
  }, [data, isLoading, location.pathname, navigate]);
}
