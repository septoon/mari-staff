import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageSheet } from './PageSheet';

type ClientsSmsBroadcastSheetProps = {
  open: boolean;
  recipientsCount: number;
  loading?: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void> | void;
};

export function ClientsSmsBroadcastSheet({
  open,
  recipientsCount,
  loading = false,
  onClose,
  onSend,
}: ClientsSmsBroadcastSheetProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setMessage('');
    }
  }, [open]);

  const messageLength = useMemo(() => message.trim().length, [message]);
  const canSend = messageLength > 0 && recipientsCount > 0 && !loading;

  if (!open) {
    return null;
  }

  return (
    <PageSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight - 12, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
      maxHeight={typeof window !== 'undefined' ? window.innerHeight - 8 : undefined}
      className="mari-page-sheet--calendar"
    >
      <section className="bg-screen px-4 pb-4">
        <div className="flex items-center gap-3 border-b border-line pb-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink">
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-[24px] font-extrabold text-ink">Отправить SMS</h2>
        </div>

        <label className="mt-4 block text-[18px] font-semibold text-muted">Введите текст SMS</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Текст сообщения"
          className="mt-3 h-[220px] w-full resize-none rounded-xl border-2 border-line bg-screen px-4 py-3 text-[18px] font-medium text-ink outline-none placeholder:text-[#97a0ad]"
        />

        <div className="mt-4 space-y-1 text-[15px] font-medium text-ink">
          <p>{messageLength} символов</p>
          <p>
            После отправки 1 SMS {recipientsCount} клиентам
          </p>
        </div>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => void onSend(message)}
          className="mt-6 w-full rounded-[24px] bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </section>
    </PageSheet>
  );
}
