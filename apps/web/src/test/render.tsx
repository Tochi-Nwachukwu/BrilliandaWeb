import type { Role, SessionResponse } from "@brillanda/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/** Renders with a fresh query cache and an in-memory router; `path` adds a route for URL params. */
export function renderWithProviders(ui: ReactElement, { route = "/", path }: { route?: string; path?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user, queryClient, ...result };
}

export function sessionFor(role: Role): SessionResponse {
  return {
    accessToken: `token-for-${role.toLowerCase()}`,
    user: {
      id: `user-${role.toLowerCase()}`,
      fullName: "Tunde Bakare",
      email: "tunde.bakare@demo-academy.local",
      role,
      school: { id: "school-demo", name: "Brillanda Demo Academy", slug: "demo-academy", logoUrl: null },
    },
  };
}
