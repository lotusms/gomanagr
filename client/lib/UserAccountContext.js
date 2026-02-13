import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/client/lib/AuthContext';
import { getUserAccount } from '@/client/services/userService';

/**
 * Format display name from account/preview and nameView (used in header).
 */
export function getDisplayName(account, email = '') {
  if (!account) return email || '';
  const first = (account.firstName ?? '').trim();
  const last = (account.lastName ?? '').trim();
  const nameView = account.nameView ?? 'full';
  const hasName = first || last;

  switch (nameView) {
    case 'first':
      return first || email;
    case 'f_last':
      return hasName ? (first ? first[0] + '. ' : '') + last || email : email;
    case 'last_first':
      return hasName ? [last, first].filter(Boolean).join(', ') || email : email;
    case 'email':
      return email || '';
    case 'full':
    default:
      return hasName ? `${first} ${last}`.trim() : email;
  }
}

const UserAccountContext = createContext({
  account: null,
  setAccount: () => {},
  preview: null,
  setPreview: () => {},
  refetch: () => {},
  loading: true,
});

export function useUserAccount() {
  const ctx = useContext(UserAccountContext);
  if (!ctx) throw new Error('useUserAccount must be used within UserAccountProvider');
  return ctx;
}

export function UserAccountProvider({ children }) {
  const { currentUser } = useAuth();
  const [account, setAccountState] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    getUserAccount(currentUser.uid)
      .then((data) => setAccountState(data || null))
      .catch(() => setAccountState(null))
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setAccountState(null);
      setPreview(null);
      setLoading(false);
      return;
    }
    refetch();
  }, [currentUser?.uid, refetch]);

  const setAccount = useCallback((next) => {
    setAccountState((prev) => (typeof next === 'function' ? next(prev) : next));
    setPreview(null);
  }, []);

  const value = {
    account,
    setAccount,
    preview,
    setPreview,
    refetch,
    loading,
  };

  return (
    <UserAccountContext.Provider value={value}>
      {children}
    </UserAccountContext.Provider>
  );
}
