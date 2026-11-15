import { ErrorBoundary, type NavItem } from '@pilates/web-kit';
import { Link, NavLink, Outlet } from 'react-router';
import { SessionProvider, useSession } from './session.js';

function Header({ nav }: { nav: NavItem[] }) {
  const { session } = useSession();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  return (
    <header className="app-header">
      <strong>Pilates Studio – Admin</strong>
      {isAdmin && (
        <>
          <nav aria-label="Main">
            {nav.map((item) => (
              <NavLink key={item.path} to={item.path}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="account">
            <span>{session.user.name}</span>
            <Link to="/logout">Log out</Link>
          </div>
        </>
      )}
    </header>
  );
}

export function Layout({ nav }: { nav: NavItem[] }) {
  return (
    <SessionProvider>
      <Header nav={nav} />
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </SessionProvider>
  );
}
