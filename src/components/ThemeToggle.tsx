import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="w-8 h-8 flex items-center justify-center rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors border-0 bg-transparent cursor-pointer"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
