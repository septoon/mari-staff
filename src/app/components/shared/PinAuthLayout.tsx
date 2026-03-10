import type { ReactNode } from 'react';

type PinAuthLayoutProps = {
  title: string;
  description: string;
  heroKicker: string;
  heroTitle: string;
  heroDescription: string;
  heroNote: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PinAuthLayout({
  title,
  description,
  heroKicker,
  heroTitle,
  heroDescription,
  heroNote,
  children,
  footer,
}: PinAuthLayoutProps) {
  return (
    <section className="flex min-h-full flex-1 flex-col md:min-h-0 md:overflow-y-auto">
      <div className="flex flex-1 flex-col md:mx-auto md:min-h-full md:w-full md:max-w-[1180px] md:flex-row md:gap-6 md:px-8 md:py-8 lg:gap-8 lg:px-10 lg:py-10">
        <aside className="relative hidden flex-1 overflow-hidden rounded-[36px] bg-accent text-[#30343a] md:flex md:min-h-[680px] md:flex-col md:justify-between md:px-10 md:py-10 lg:px-12 lg:py-12">
          <div
            className="absolute inset-0 opacity-35"
            aria-hidden="true"
            style={{
              backgroundImage:
                'radial-gradient(240px 160px at 8% 18%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(260px 160px at 62% 12%, transparent 63%, rgba(255,255,255,0.34) 64%, rgba(255,255,255,0.34) 65.4%, transparent 67%), radial-gradient(220px 150px at 92% 38%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 28% 74%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%), radial-gradient(240px 150px at 74% 82%, transparent 62%, rgba(255,255,255,0.34) 63%, rgba(255,255,255,0.34) 64.4%, transparent 66%)',
            }}
          />

          <div className="relative z-10 max-w-[420px]">
            <span className="inline-flex rounded-full bg-[rgba(255,255,255,0.55)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#4a4f56]">
              {heroKicker}
            </span>
            <h2 className="mt-8 max-w-[520px] text-[56px] font-extrabold leading-[0.96] tracking-[-0.04em] text-[#30343a]">
              {heroTitle}
            </h2>
            <div className="mt-5 h-1 w-[96px] rounded-full bg-[#f6878d]" />
            <p className="mt-6 max-w-[420px] text-[19px] font-semibold leading-8 text-[#535860]">
              {heroDescription}
            </p>
          </div>

          <div className="relative z-10 max-w-[360px] rounded-[30px] bg-[rgba(255,255,255,0.52)] px-6 py-6 backdrop-blur-[2px]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#626770]">
              Mari Staff
            </p>
            <p className="mt-3 text-lg font-semibold leading-8 text-[#464b54]">{heroNote}</p>
          </div>

          <svg
            className="pointer-events-none absolute -bottom-px left-0 h-[180px] w-full text-[#fcfcfd]"
            viewBox="0 0 760 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 78C96 42 207 45 301 94C391 140 508 163 760 118V180H0V78Z"
              fill="currentColor"
            />
          </svg>
        </aside>

        <div className="flex flex-1 flex-col px-6 pb-8 pt-8 md:min-h-0 md:max-w-[540px] md:flex-none md:rounded-[36px] md:bg-[#fcfcfd] md:px-10 md:pb-10 md:pt-10 md:shadow-[0_24px_60px_rgba(42,49,56,0.12)] lg:px-12">
          <div className="md:max-w-[420px]">
            <p className="hidden text-sm font-semibold uppercase tracking-[0.22em] text-[#8e949d] md:block">
              Mari Staff
            </p>
            <h1 className="my-6 text-2xl font-extrabold text-ink md:my-0 md:mt-4 md:text-[44px] md:leading-[1.02] md:tracking-[-0.03em]">
              {title}
            </h1>
            <p className="mb-20 text-sm font-semibold leading-6 text-muted md:mb-0 md:mt-5 md:text-base md:leading-7">
              {description}
            </p>
          </div>

          <div className="flex flex-1 flex-col md:mt-10">
            {children}
            {footer ? <div className="mt-auto flex flex-col pt-8 md:pt-10">{footer}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
