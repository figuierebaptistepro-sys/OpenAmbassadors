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
    const showWidget = () => {
      // Check if HelpCrunch is fully loaded and ready
      if (typeof window.HelpCrunch === 'function') {
        // Use the correct API method: showChatWidget
        window.HelpCrunch('showChatWidget');
      }
    };

    // Wait for HelpCrunch to be ready before calling methods
    // The widget might not be immediately available on SPA route changes
    const checkAndShow = () => {
      if (typeof window.HelpCrunch === 'function') {
        showWidget();
      }
    };

    // Try after short delays to ensure HelpCrunch is loaded
    const timeout1 = setTimeout(checkAndShow, 500);
    const timeout2 = setTimeout(checkAndShow, 2000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [location.pathname]); // Re-run on route change

  // Sync user data with HelpCrunch
  useEffect(() => {
    const updateHelpCrunchUser = () => {
      if (typeof window.HelpCrunch === 'function' && user) {
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

    // Try immediately if HelpCrunch is ready
    if (typeof window.HelpCrunch === 'function') {
      updateHelpCrunchUser();
    }

    // Also try after a delay in case HelpCrunch loads later
    const timeout = setTimeout(updateHelpCrunchUser, 2000);

    return () => clearTimeout(timeout);
  }, [user]);

  // Reset user on logout
  useEffect(() => {
    if (!user && typeof window.HelpCrunch === 'function') {
      window.HelpCrunch('logout');
    }
  }, [user]);

  return null; // This component doesn't render anything
};

export default HelpCrunchIntegration;
