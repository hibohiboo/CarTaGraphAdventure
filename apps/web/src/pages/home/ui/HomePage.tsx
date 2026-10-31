import { Link } from 'react-router';
import { EXAM_PATH } from '@/shared/routes/routes';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <main className={styles.title}>
      <p className={styles.kicker}>カードTRPG</p>
      <h1 className={styles.name}>カルタグラフ・アドベンチャー</h1>
      <p className={styles.lead}>冒険者ギルドの扉の前に、あなたは立っている。</p>
      <Link to={EXAM_PATH} className={styles.entry}>
        試験を受ける
      </Link>
      <p className={styles.note}>冒険者登録の試験</p>
    </main>
  );
}
