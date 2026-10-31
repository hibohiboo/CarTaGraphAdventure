import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/shared/routes/routes';
import { renderAt } from './renderAt';

describe('全ルートの描画', () => {
  it.each(routes)('$title（$path）が見出しを出す', (route) => {
    renderAt(route.example ?? route.path);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
