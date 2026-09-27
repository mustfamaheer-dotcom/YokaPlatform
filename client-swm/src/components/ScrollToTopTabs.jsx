import { useEffect } from 'react';

/**
 * ScrollToTopTabs – scrolls the window to the top whenever the active tab changes.
 * `activeTab` is passed from the parent `App` component.
 */
export default function ScrollToTopTabs({ activeTab }) {
  useEffect(() => {
    // Immediate scroll to top on tab change.
    window.scrollTo(0, 0);
  }, [activeTab]);

  return null;
}
