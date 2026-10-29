import { createHashRouter, type RouteObject } from 'react-router';
import { HomePage } from '@/pages/home/ui/HomePage';

// パスと画面の対応。パスの一覧（題名・説明）は shared/routes/routes.ts が正
export const routeObjects: RouteObject[] = [{ path: '/', element: <HomePage /> }];

export const router = createHashRouter(routeObjects);
