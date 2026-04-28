export type SitePricesPageDraft = {
  seo: {
    title: string;
    description: string;
  };
  heroActions: {
    primaryLabel: string;
  };
  catalog: {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  bottomCta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
};

export const SITE_PRICES_PAGE_SECTION_COUNT = 4;

export const SITE_PRICES_PAGE_DEFAULTS: SitePricesPageDraft = {
  seo: {
    title: 'Цены',
    description: 'Цены на услуги МАРИ: процедуры, длительность и переход к записи.',
  },
  heroActions: {
    primaryLabel: 'Записаться',
  },
  catalog: {
    eyebrow: 'Прайс',
    title: 'Все услуги и цены.',
    description:
      'Разделы прайса собираются из опубликованных категорий услуг. Названия, описания, длительность и стоимость редактируются в разделе услуг.',
    emptyTitle: 'Прайс пока не опубликован.',
    emptyDescription: 'Добавьте услуги и категории в staff, чтобы они появились на странице цен.',
  },
  bottomCta: {
    eyebrow: 'После прайса',
    title: 'После прайса остается выбрать процедуру и удобное время.',
    description: 'Перейдите в карточку услуги или сразу откройте запись.',
    primaryCtaLabel: 'Каталог услуг',
    secondaryCtaLabel: 'Записаться',
  },
};

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const readString = (value: unknown, fallback: string) =>
  typeof value === 'string' ? value : fallback;

export const createSitePricesPageDraft = (extra: unknown): SitePricesPageDraft => {
  const siteContent = asObjectRecord(asObjectRecord(extra).siteContent);
  const source = asObjectRecord(siteContent.pricesPage);
  const seo = asObjectRecord(source.seo);
  const heroActions = asObjectRecord(source.heroActions);
  const catalog = asObjectRecord(source.catalog);
  const bottomCta = asObjectRecord(source.bottomCta);

  return {
    seo: {
      title: readString(seo.title, SITE_PRICES_PAGE_DEFAULTS.seo.title),
      description: readString(seo.description, SITE_PRICES_PAGE_DEFAULTS.seo.description),
    },
    heroActions: {
      primaryLabel: readString(heroActions.primaryLabel, SITE_PRICES_PAGE_DEFAULTS.heroActions.primaryLabel),
    },
    catalog: {
      eyebrow: readString(catalog.eyebrow, SITE_PRICES_PAGE_DEFAULTS.catalog.eyebrow),
      title: readString(catalog.title, SITE_PRICES_PAGE_DEFAULTS.catalog.title),
      description: readString(catalog.description, SITE_PRICES_PAGE_DEFAULTS.catalog.description),
      emptyTitle: readString(catalog.emptyTitle, SITE_PRICES_PAGE_DEFAULTS.catalog.emptyTitle),
      emptyDescription: readString(catalog.emptyDescription, SITE_PRICES_PAGE_DEFAULTS.catalog.emptyDescription),
    },
    bottomCta: {
      eyebrow: readString(bottomCta.eyebrow, SITE_PRICES_PAGE_DEFAULTS.bottomCta.eyebrow),
      title: readString(bottomCta.title, SITE_PRICES_PAGE_DEFAULTS.bottomCta.title),
      description: readString(bottomCta.description, SITE_PRICES_PAGE_DEFAULTS.bottomCta.description),
      primaryCtaLabel: readString(bottomCta.primaryCtaLabel, SITE_PRICES_PAGE_DEFAULTS.bottomCta.primaryCtaLabel),
      secondaryCtaLabel: readString(bottomCta.secondaryCtaLabel, SITE_PRICES_PAGE_DEFAULTS.bottomCta.secondaryCtaLabel),
    },
  };
};

export const mergeSitePricesPageIntoExtra = (
  extra: Record<string, unknown>,
  draft: SitePricesPageDraft,
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const siteContent = asObjectRecord(nextExtra.siteContent);
  nextExtra.siteContent = {
    ...siteContent,
    pricesPage: draft,
  };
  return nextExtra;
};

export const countConfiguredSitePricesPageSections = (extra: unknown) => {
  const source = createSitePricesPageDraft(extra);
  let count = 0;
  if (source.seo.title || source.seo.description) count += 1;
  if (source.heroActions.primaryLabel) count += 1;
  if (source.catalog.title || source.catalog.description) count += 1;
  if (source.bottomCta.title || source.bottomCta.description) count += 1;
  return count;
};
