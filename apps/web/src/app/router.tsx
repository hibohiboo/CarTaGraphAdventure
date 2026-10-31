import { createHashRouter, type RouteObject } from 'react-router';
import { HomePage } from '@/pages/home/ui/HomePage';
import { ExamPage } from '@/pages/pl/exam/ui/ExamPage';
import { EXAM_PATH } from '@/shared/routes/routes';

// パスと画面の対応。パスの一覧（題名・説明）は shared/routes/routes.ts が正
export const routeObjects: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: EXAM_PATH, element: <ExamPage /> },
];

export const router = createHashRouter(routeObjects);
