import type { Card } from '@cartagraph/domain/scenario/model';
import { AwaitingProposal } from './AwaitingProposal';
import { HandCard } from './HandCard';
import styles from './HandZone.module.css';
import { NameForm } from './NameForm';
import { ProposalForm, type ProposalOutcome } from './ProposalForm';

/** 提案のカードと入力欄。公開版では null（提案のカードを出さない） */
export interface ProposalProps {
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSubmit: (text: string) => Promise<ProposalOutcome>;
}

export interface HandProps {
  hand: Card[];
  /** 名前を書くために選んでいるカードの id */
  namingCardId: string | null;
  /** 断られた理由 */
  reason: Parameters<typeof NameForm>[0]['reason'];
  /** 提案待ちの文。空でなければ提案待ちで、手札は出せない */
  awaiting: string[];
  /** 提案を送っている間は、手札を出せない */
  busy: boolean;
  proposal: ProposalProps | null;
  onPlay: (card: Card) => void;
  onSubmitName: (name: string) => void;
}

// 手札の置き場。紙面・会話のどちらのビートからも使う。会話で台詞を読んでいる間は、手札と提案のカードを隠す
export function HandZone({
  hand,
  namingCardId,
  reason,
  awaiting,
  busy,
  proposal,
  onPlay,
  onSubmitName,
  showHand = true,
}: HandProps & { showHand?: boolean }) {
  const waiting = awaiting.length > 0;
  return (
    <>
      {showHand && namingCardId !== null && <NameForm reason={reason} onSubmit={onSubmitName} />}
      {showHand && proposal?.open && (
        <ProposalForm onSubmit={proposal.onSubmit} onCancel={proposal.onCancel} />
      )}
      {showHand && waiting && <AwaitingProposal proposals={awaiting} />}
      <section className={styles.handZone} aria-label="手札">
        <h2 className={styles.zoneLabel}>手札</h2>
        {showHand && hand.length === 0 && (
          <p className={styles.toBeContinued}>続きは準備中です。</p>
        )}
        <ul className={styles.hand}>
          {showHand &&
            hand.map((card) => (
              <li key={card.id}>
                <HandCard
                  card={card}
                  selected={namingCardId === card.id}
                  disabled={waiting || busy}
                  onPlay={() => onPlay(card)}
                />
              </li>
            ))}
          {showHand && proposal && (
            <li>
              <button
                type="button"
                className={styles.proposal}
                aria-pressed={proposal.open}
                onClick={proposal.onOpen}
              >
                <span className={styles.proposalMark} aria-hidden="true">
                  ＋
                </span>
                <span>GM への提案</span>
              </button>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}
