import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * HelpCrunch Chat Integration Component
 * Ensures the widget loads on all pages and syncs logged-in user data
 */
const HelpCrunchIntegration = ({ user }) => {
  const location = useLocation();
  const userSyncedRef = useRef(false);
  const lastUserIdRef = useRef(null);

  // Sync user data with HelpCrunch - only once per user
  useEffect(() => {
    // Skip if no user or if we already synced this user
    if (!user || !user.user_id) {
      userSyncedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // Skip if we already synced this specific user
    if (userSyncedRef.current && lastUserIdRef.current === user.user_id) {
      return;
    }

    const updateHelpCrunchUser = () => {
      try {
        if (typeof window.HelpCrunch === 'function') {
          window.HelpCrunch('updateUser', {
            email: user.email,
            name: user.name,
            user_id: user.user_id,
            custom_data: {
              user_type: user.user_type,
              is_premium: user.is_premium || false,
            }
          });
          userSyncedRef.current = true;
          lastUserIdRef.current = user.user_id;
        }
      } catch (error) {
        console.warn('HelpCrunch updateUser error:', error);
      }
    };

    // Try after HelpCrunch is likely loaded
    const timeout = setTimeout(updateHelpCrunchUser, 2000);

    return () => clearTimeout(timeout);
  }, [user?.user_id, user?.email, user?.name, user?.user_type, user?.is_premium]);

  // Reset on logout
  useEffect(() => {
    if (!user) {
      userSyncedRef.current = false;
      lastUserIdRef.current = null;
      try {
        if (typeof window.HelpCrunch === 'function') {
          window.HelpCrunch('logout');
        }
      } catch (error) {
        console.warn('HelpCrunch logout error:', error);
      }
    }
  }, [user]);

  return null; // This component doesn't render anything
};

export default HelpCrunchIntegration;
