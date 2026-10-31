import styles from './AwaitingProposal.module.css';

// 提案待ちの表示：手札の上に、手札を出せない理由と、そのビートで出した提案の文を並べる
export function AwaitingProposal({ proposals }: { proposals: string[] }) {
  return (
    <section className={styles.awaiting} aria-label="提案待ち">
      <p className={styles.lead}>提案待ち：提案が取り込まれるか見送られるまで、手札は出せません</p>
      <ul className={styles.list}>
        {proposals.map((summary, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 提案の文は並べ替えず、同じ文が2つあっても key がぶつからない位置を使う
          <li key={i}>「{summary}」</li>
        ))}
      </ul>
    </section>
  );
}
