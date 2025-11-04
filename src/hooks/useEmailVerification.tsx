import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useEmailVerification() {
  const { user, isEmailConfirmed, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    
    if (user && !isEmailConfirmed) {
      navigate('/verify-email');
    }
  }, [user, isEmailConfirmed, loading, navigate]);

  return { isEmailConfirmed, loading };
}
