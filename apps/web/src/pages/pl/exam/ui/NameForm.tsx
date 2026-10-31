import { CHARACTER_NAME_MAX_LENGTH } from '@cartagraph/domain/scenario/transition';
import { useId, useState } from 'react';

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

// 名前を書いて出すカードの入力欄。断られても入力は消さない
export function NameForm({ reason, onSubmit }: Props) {
  const [name, setName] = useState('');
  const inputId = useId();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <label htmlFor={inputId}>キャラクターの名前</label>{' '}
      {/* maxlength は付けない。打った文字が黙って切られ、長すぎる理由が出なくなる */}
      <input id={inputId} value={name} onChange={(event) => setName(event.target.value)} />{' '}
      <button type="submit">この名前で名乗る</button>
      {reason && <p role="alert">{REASON_TEXT[reason]}</p>}
    </form>
  );
}
