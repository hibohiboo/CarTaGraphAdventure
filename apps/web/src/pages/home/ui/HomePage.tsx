import { Link } from 'react-router';
import { EXAM_PATH } from '@/shared/routes/routes';

export function HomePage() {
  return (
    <main>
      <h1>カルタグラフ・アドベンチャー</h1>
      <p>
        <Link to={EXAM_PATH}>試験を受ける</Link>
      </p>
    </main>
  );
}
