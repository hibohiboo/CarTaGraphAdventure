import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routeObjects } from '@/app/router';
import { routes } from '@/shared/routes/routes';

describe('全ルートの描画', () => {
  it.each(routes)('$title（$path）が見出しを出す', (route) => {
    const router = createMemoryRouter(routeObjects, {
      initialEntries: [route.example ?? route.path],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
