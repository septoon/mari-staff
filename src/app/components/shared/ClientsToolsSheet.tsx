import { ChevronRight, Download, MessageSquare, Upload, X } from 'lucide-react';
import { PageSheet } from './PageSheet';

type ClientsToolsSheetProps = {
  open: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onOpenExport: () => void;
  onImportFromContacts: () => void;
  onOpenSmsBroadcast: () => void;
};

export function ClientsToolsSheet({
  open,
  loading = false,
  error,
  onClose,
  onOpenExport,
  onImportFromContacts,
  onOpenSmsBroadcast,
}: ClientsToolsSheetProps) {
  if (!open) {
    return null;
  }

  const actionClass =
    'flex w-full items-center justify-between border-t border-line px-6 py-5 text-left';

  return (
    <PageSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(360, maxHeight), Math.min(520, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
    >
      <section className="bg-screen pb-3">
        <div className="flex justify-end px-4 pt-2">
          <button type="button" onClick={onClose} className="rounded-full bg-[#e3e7ee] p-2 text-ink">
            <X className="h-6 w-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={loading}
          className={actionClass}
        >
          <div className="flex items-center gap-4">
            <Download className="h-7 w-7 text-ink" />
            <span className="text-[20px] font-medium text-ink">Сохранить в телефонную книгу</span>
          </div>
          <ChevronRight className="h-6 w-6 text-[#efbf1a]" />
        </button>

        <button
          type="button"
          onClick={onImportFromContacts}
          disabled={loading}
          className={actionClass}
        >
          <div className="flex items-center gap-4">
            <Upload className="h-7 w-7 text-ink" />
            <span className="text-[20px] font-medium text-ink">Добавить из телефонной книги</span>
          </div>
          <ChevronRight className="h-6 w-6 text-[#efbf1a]" />
        </button>

        <div className="h-7 bg-[#e7e9ed]" />

        <button
          type="button"
          onClick={onOpenSmsBroadcast}
          disabled={loading}
          className={actionClass}
        >
          <div className="flex items-center gap-4">
            <MessageSquare className="h-7 w-7 text-ink" />
            <span className="text-[20px] font-medium text-ink">Отправить SMS всем клиентам</span>
          </div>
          <ChevronRight className="h-6 w-6 text-[#efbf1a]" />
        </button>

        {error ? (
          <p className="px-6 pt-3 text-sm font-semibold text-[#b34747]">{error}</p>
        ) : null}
      </section>
    </PageSheet>
  );
}
