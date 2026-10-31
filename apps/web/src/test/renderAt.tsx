import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routeObjects } from '@/app/router';

// アプリのルーターで、指定したパスを描く。テストごとに新しいルーターを作る（docs/process/rules/testing.md「テストの独立性」）
export function renderAt(path: string) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}
