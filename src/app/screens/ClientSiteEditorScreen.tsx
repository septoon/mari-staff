import { ArrowLeft } from 'lucide-react';

type ClientSiteEditorScreenProps = {
  onBack: () => void;
};

export function ClientSiteEditorScreen({ onBack }: ClientSiteEditorScreenProps) {
  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">Онлайн-запись</h1>
      </div>

      <section className="rounded-3xl border border-line bg-screen p-5">
        <p className="text-[22px] font-semibold text-ink">Редактирование клиентского сайта</p>
        <p className="mt-3 text-[16px] font-medium leading-relaxed text-muted">
          Здесь будет страница настройки клиентского сайта и онлайн-записи.
        </p>
      </section>
    </div>
  );
}
