import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * HelpCrunch Chat Integration Component
 * Ensures the widget loads on all pages and syncs logged-in user data
 */
const HelpCrunchIntegration = ({ user }) => {
  const location = useLocation();

  // Initialize and show HelpCrunch widget on every route change
  useEffect(() => {
    const initHelpCrunch = () => {
      if (window.HelpCrunch) {
        // Show the widget (in case it was hidden)
        window.HelpCrunch('showWidget');
      }
    };

    // Try immediately
    initHelpCrunch();

    // Also try after delays in case HelpCrunch loads later
    const timeout1 = setTimeout(initHelpCrunch, 1000);
    const timeout2 = setTimeout(initHelpCrunch, 3000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [location.pathname]); // Re-run on route change

  // Sync user data with HelpCrunch
  useEffect(() => {
    const updateHelpCrunchUser = () => {
      if (window.HelpCrunch && user) {
        window.HelpCrunch('updateUser', {
          email: user.email,
          name: user.name,
          user_id: user.user_id,
          custom_data: {
            user_type: user.user_type,
            is_premium: user.is_premium || false,
          }
        });
      }
    };

    // Try immediately
    updateHelpCrunchUser();

    // Also try after a short delay in case HelpCrunch loads later
    const timeout = setTimeout(updateHelpCrunchUser, 2000);

    return () => clearTimeout(timeout);
  }, [user]);

  // Reset user on logout
  useEffect(() => {
    if (!user && window.HelpCrunch) {
      window.HelpCrunch('logout');
    }
  }, [user]);

  return null; // This component doesn't render anything
};

export default HelpCrunchIntegration;
