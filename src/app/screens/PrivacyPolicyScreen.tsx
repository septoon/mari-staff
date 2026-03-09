import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pencil, Save, X } from 'lucide-react';

type PrivacyPolicyScreenProps = {
  text: string;
  canEdit: boolean;
  loading: boolean;
  settingsLoading: boolean;
  onBack: () => void;
  onSave: (value: string) => Promise<boolean>;
};

export function PrivacyPolicyScreen({
  text,
  canEdit,
  loading,
  settingsLoading,
  onBack,
  onSave,
}: PrivacyPolicyScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(text);
    }
  }, [isEditing, text]);

  const busy = loading || settingsLoading || submitting;
  const sections = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[24px] font-extrabold text-ink">Политика конфиденциальности</h1>
        {canEdit ? (
          isEditing ? (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraft(text);
              }}
              disabled={busy}
              className="rounded-lg p-2 text-ink disabled:opacity-50"
              aria-label="Закрыть редактор"
            >
              <X className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={busy}
              className="rounded-lg p-2 text-ink disabled:opacity-50"
              aria-label="Редактировать политику"
            >
              <Pencil className="h-6 w-6" />
            </button>
          )
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="rounded-[28px] border border-line bg-white p-5">
        <p className="text-[14px] font-medium leading-relaxed text-muted">
          Этот текст хранится на сервере и используется клиентской политикой конфиденциальности.
        </p>

        {isEditing ? (
          <div className="mt-4 space-y-4">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={18}
              placeholder="Опишите политику конфиденциальности. Для разделения смысловых блоков оставляйте пустую строку."
              className="w-full rounded-[24px] border-[2px] border-line bg-screen px-5 py-4 text-[16px] font-medium text-ink outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const saved = await onSave(draft);
                    if (saved) {
                      setIsEditing(false);
                    }
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[15px] font-extrabold text-[#222b33] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(text);
                }}
                disabled={busy}
                className="rounded-2xl border border-line px-4 py-3 text-[15px] font-bold text-ink disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : settingsLoading ? (
          <div className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загружаю политику...
          </div>
        ) : sections.length > 0 ? (
          <div className="mt-4 space-y-3">
            {sections.map((section, index) => (
              <div key={`privacy-policy-section-${index}`} className="rounded-[24px] bg-screen px-4 py-4">
                <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-ink">{section}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] bg-screen px-4 py-4 text-[15px] font-semibold text-muted">
            Политика конфиденциальности пока не заполнена.
          </div>
        )}
      </div>
    </div>
  );
}
