import { ErrorBoundary, type NavItem } from '@pilates/web-kit';
import { NavLink, Outlet } from 'react-router';
import { SessionProvider } from './session.js';

export function Layout({ nav }: { nav: NavItem[] }) {
  return (
    <SessionProvider>
      <header>
        <strong>Pilates Studio – Admin</strong>
        <nav aria-label="Main">
          {nav.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </SessionProvider>
  );
}
