import {
  ChevronRight,
  History,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Wallet,
  X,
} from 'lucide-react';
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

  const actionClass =
    'flex w-full items-center justify-between px-6 py-5 text-left border-t border-line';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#11182766] pb-[86px]">
      <button type="button" className="flex-1" onClick={onClose} />
      <section className="rounded-t-[28px] bg-screen">
        <div className="mx-auto my-2 h-2 w-16 rounded-full bg-[#c8c8cb]" />
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

        <button type="button" className="w-full px-6 py-5 text-left text-[20px] font-medium text-[#ff622f]" onClick={onDelete}>
          Удалить клиента
        </button>
      </section>
    </div>
  );
}
