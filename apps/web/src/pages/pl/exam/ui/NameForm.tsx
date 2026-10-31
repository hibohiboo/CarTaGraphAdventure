import { CHARACTER_NAME_MAX_LENGTH } from '@cartagraph/domain/scenario/transition';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './NameForm.module.css';

const REASON_TEXT = {
  nameRequired: '名前を書いてください。',
  nameTooLong: `名前は${CHARACTER_NAME_MAX_LENGTH}文字までです。`,
  unknownCard: 'このカードは今は出せません。',
} as const;

interface Props {
  /** 断られた理由。あるときだけ出す */
  reason: keyof typeof REASON_TEXT | null;
  onSubmit: (name: string) => void;
}

// 名前を書いて出すカードの入力欄（登録用紙の紙面）。断られても入力は消さない
export function NameForm({ reason, onSubmit }: Props) {
  const [name, setName] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // 用紙は手札の上に出るが、スマホでは画面の外になることがある。出したときに記入欄へ移る
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className={styles.sheet}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <p className={styles.heading} aria-hidden="true">
        冒険者登録用紙
      </p>
      <label className={styles.label} htmlFor={inputId}>
        キャラクターの名前
      </label>
      {/* maxlength は付けない。打った文字が黙って切られ、長すぎる理由が出なくなる */}
      <input
        id={inputId}
        ref={inputRef}
        className={styles.input}
        value={name}
        autoComplete="off"
        onChange={(event) => setName(event.target.value)}
      />
      {reason && (
        <p className={styles.reason} role="alert">
          {REASON_TEXT[reason]}
        </p>
      )}
      <button type="submit" className={styles.seal}>
        この名前で名乗る
      </button>
    </form>
  );
}
