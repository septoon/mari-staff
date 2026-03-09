import {
  ChevronRight,
  History,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Wallet,
  X,
} from 'lucide-react';
import { PageSheet } from './PageSheet';
import type { ClientItem } from '../../types';

type ClientActionsSheetProps = {
  client: ClientItem | null;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenLoyalty: () => void;
  onCall: () => void;
  onSms: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
};

export function ClientActionsSheet({
  client,
  onClose,
  onOpenHistory,
  onOpenLoyalty,
  onCall,
  onSms,
  onWhatsApp,
  onDelete,
}: ClientActionsSheetProps) {
  if (!client) {
    return null;
  }

  const actionClass = 'flex w-full items-center justify-between border-t border-line px-6 py-5 text-left';

  return (
    <PageSheet
      open={Boolean(client)}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(420, maxHeight), Math.min(720, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
    >
      <section className="bg-screen">
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink">
            <X className="h-8 w-8" />
          </button>
          <p className="text-[50px] font-extrabold leading-none text-ink">
            <span className="text-[52%]">{client.name}</span>
          </p>
        </div>

        <button type="button" className={actionClass} onClick={onOpenHistory}>
          <div className="flex items-center gap-4">
            <History className="h-9 w-9 text-ink" />
            <span className="text-[20px] font-medium text-ink">История посещений</span>
          </div>
          <ChevronRight className="h-7 w-7 text-[#efbf1a]" />
        </button>

        <button type="button" className={actionClass} onClick={onOpenLoyalty}>
          <div className="flex items-center gap-4">
            <Wallet className="h-9 w-9 text-ink" />
            <span className="text-[20px] font-medium text-ink">Лояльность</span>
          </div>
          <ChevronRight className="h-7 w-7 text-[#efbf1a]" />
        </button>

        <div className="h-7 bg-[#e7e9ed]" />

        <button type="button" className={actionClass} onClick={onCall}>
          <div className="flex items-center gap-4">
            <PhoneCall className="h-9 w-9 text-ink" />
            <span className="text-[20px] font-medium text-ink">Позвонить клиенту</span>
          </div>
        </button>

        <button type="button" className={actionClass} onClick={onSms}>
          <div className="flex items-center gap-4">
            <MessageSquare className="h-9 w-9 text-ink" />
            <span className="text-[20px] font-medium text-ink">Отправить SMS</span>
          </div>
          <ChevronRight className="h-7 w-7 text-[#efbf1a]" />
        </button>

        <button type="button" className={actionClass} onClick={onWhatsApp}>
          <div className="flex items-center gap-4">
            <MessageCircle className="h-9 w-9 text-ink" />
            <span className="text-[20px] font-medium text-ink">Написать в WhatsApp</span>
          </div>
        </button>

        <div className="h-7 bg-[#e7e9ed]" />

        <button
          type="button"
          className="w-full px-6 py-5 text-left text-[20px] font-medium text-[#ff622f]"
          onClick={onDelete}
        >
          Удалить клиента
        </button>
      </section>
    </PageSheet>
  );
}
