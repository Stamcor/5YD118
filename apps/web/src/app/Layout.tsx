import { ErrorBoundary, type NavItem } from '@pilates/web-kit';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { SessionProvider, useSession } from './session.js';

function Header({ nav }: { nav: NavItem[] }) {
  const { session } = useSession();
  let account: ReactNode = null;
  if (session.status === 'authenticated') {
    account = (
      <>
        <span>{session.user.name}</span>
        <Link to="/logout">Log out</Link>
      </>
    );
  } else if (session.status === 'anonymous') {
    account = (
      <>
        <Link to="/login">Log in</Link>
        <Link to="/register">Create account</Link>
      </>
    );
  }
  return (
    <header className="app-header">
      <strong>Pilates Studio</strong>
      {session.status === 'authenticated' && (
        <nav aria-label="Main">
          {nav.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
      <div className="account">{account}</div>
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
