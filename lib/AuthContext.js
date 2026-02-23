import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

// Supabase user -> Firebase-shaped { uid, email, ... } so existing code works
function toCurrentUser(user) {
  if (!user) return null;
  return {
    ...user,
    uid: user.id,
  };
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password) => {
    // In development, disable email confirmation to reduce rate limits
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    
    const signUpOptions = isDevelopment 
      ? { email, password, options: { emailRedirectTo: undefined } }
      : { email, password };
    
    // Note: Supabase doesn't have a direct disableEmailConfirmation option in the client SDK
    // But we can configure this in Supabase Dashboard → Authentication → Settings
    const { data, error } = await supabase.auth.signUp(signUpOptions);
    if (error) {
      // Handle rate limit errors - show immediately, no retries
      // Rate limits are usually per-IP or per-project, so retrying won't help
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                          error.message?.toLowerCase().includes('too many requests') ||
                          error.status === 429;
      
      if (isRateLimit) {
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                              (typeof window !== 'undefined' && window.location.hostname === 'localhost');
        
        if (isDevelopment) {
          // Development-specific error message with actionable steps
          throw new Error('Rate limit exceeded (Development Mode)\n\n' +
            'This is a Supabase server-side limitation. To fix:\n\n' +
            '1. Check Supabase Dashboard → Settings → API → Rate Limits\n' +
            '2. Consider using a separate Supabase project for development\n' +
            '3. Wait 30-60 seconds and try again\n' +
            '4. Check your Supabase plan tier (free tier has stricter limits)\n\n' +
            'Note: Rate limits are per IP address, so multiple signups from the same IP will hit limits.');
        } else {
          // Production error message
          throw new Error('Rate limit exceeded. This usually happens when:\n' +
            '• Multiple signups from the same IP address\n' +
            '• Your Supabase plan has rate limits\n' +
            '• Too many requests in a short time\n\n' +
            'Please wait 30-60 seconds and try again. If this persists, check your Supabase dashboard for rate limit settings.');
        }
      }
      
      // Handle duplicate email errors gracefully
      if (error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('user already exists') ||
          error.message?.toLowerCase().includes('email already')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      
      throw new Error(error.message);
    }
    const session = data?.session;
    return {
      user: toCurrentUser(data?.user),
      session: session ? { access_token: session.access_token } : null,
    };
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: toCurrentUser(data?.user) };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const resetPasswordWithToken = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    if (!currentUser) return Promise.reject(new Error('Not signed in'));
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });
    if (signInError) throw new Error('Current password is incorrect');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw new Error(updateError.message);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(toCurrentUser(session?.user ?? null));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(toCurrentUser(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    resetPasswordWithToken,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
