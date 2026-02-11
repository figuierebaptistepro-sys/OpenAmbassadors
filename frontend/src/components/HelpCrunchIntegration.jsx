import { useEffect } from 'react';

/**
 * HelpCrunch Chat Integration Component
 * Syncs logged-in user data with HelpCrunch for better support
 */
const HelpCrunchIntegration = ({ user }) => {
  useEffect(() => {
    // Wait for HelpCrunch to be available
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
