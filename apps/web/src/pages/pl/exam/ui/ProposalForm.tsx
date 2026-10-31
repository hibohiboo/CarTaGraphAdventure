import { useEffect, useId, useRef, useState } from 'react';
import styles from './ProposalForm.module.css';

export type ProposalOutcome = { ok: true } | { ok: false; message: string };

interface Props {
  /** 提案を送る。成功したら親が入力欄を閉じる。断られた・送れなかったら理由を返す */
  onSubmit: (text: string) => Promise<ProposalOutcome>;
  onCancel: () => void;
}

// GM への提案の入力欄。手札の上に出る。断られても文は消さない
export function ProposalForm({ onSubmit, onCancel }: Props) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 入力欄は手札の上に出るが、スマホでは画面の外になることがある。出したときに記入欄へ移る
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    setSending(true);
    setMessage(null);
    const outcome = await onSubmit(text);
    // 成功すると親がこの入力欄を閉じる（外れた部品に状態を書かない）
    if (!outcome.ok) {
      setMessage(outcome.message);
      setSending(false);
    }
  };

  return (
    <form
      className={styles.sheet}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className={styles.heading} htmlFor={inputId}>
        GM への提案
      </label>
      {/* maxlength は付けない。打った文字が黙って切られ、長すぎる理由が出なくなる */}
      <textarea
        id={inputId}
        ref={inputRef}
        className={styles.input}
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {message && (
        <p className={styles.reason} role="alert">
          {message}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={sending}>
          やめる
        </button>
        <button type="submit" className={styles.submit} disabled={sending}>
          提案する
        </button>
      </div>
    </form>
  );
}
