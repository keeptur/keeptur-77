import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add script to prevent flash of unstyled content (FOUC)
const script = document.createElement('script');
script.innerHTML = `
  (function() {
    const theme = localStorage.getItem('vite-ui-theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  })();
`;
document.head.appendChild(script);

createRoot(document.getElementById("root")!).render(<App />);
