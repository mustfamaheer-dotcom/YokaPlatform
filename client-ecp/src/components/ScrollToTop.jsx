import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop – ensures the window scrolls to the top whenever the route changes.
 * This component should be rendered inside the Router (e.g., inside App.jsx) but
 * does not produce any visible markup.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to the very top of the page on navigation.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
