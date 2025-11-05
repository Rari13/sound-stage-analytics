import { useAuth } from './useAuth';

export function useEmailVerification() {
  const { loading } = useAuth();

  // Email verification disabled
  return { isEmailConfirmed: true, loading };
}
