import { X } from 'lucide-react';
import { PageSheet } from './PageSheet';
import type { InfoPanelState } from '../../types';

type InfoPanelProps = {
  panel: InfoPanelState;
  onClose: () => void;
};

export function InfoPanel({ panel, onClose }: InfoPanelProps) {
  if (!panel) {
    return null;
  }
  return (
    <PageSheet
      open={Boolean(panel)}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(260, maxHeight), Math.min(420, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
    >
      <div className="bg-white px-4 pb-5 pt-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-ink">{panel.title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[42vh] space-y-2 overflow-y-auto">
          {panel.lines.length > 0 ? (
            panel.lines.map((line, index) => (
              <li key={`${line}-${index}`} className="rounded-xl bg-[#f4f6f9] px-3 py-2 text-sm font-semibold text-[#465465]">
                {line}
              </li>
            ))
          ) : (
            <li className="text-sm font-semibold text-muted">Нет данных</li>
          )}
        </ul>
      </div>
    </PageSheet>
  );
}
