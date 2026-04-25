export type SiteServicesPageDraft = {
  seo: {
    title: string;
    description: string;
  };
  heroActions: {
    primaryLabel: string;
    secondaryLabel: string;
  };
  catalog: {
    eyebrow: string;
    title: string;
    description: string;
    sectionCardEyebrow: string;
    sectionCardFallbackText: string;
    sectionCardServiceCountTemplate: string;
    sectionCardActionLabel: string;
    categoryFallbackText: string;
    categoryServiceCountTemplate: string;
    categoryActionLabel: string;
  };
  bottomCta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
};

export const SITE_SERVICES_PAGE_SECTION_COUNT = 4;

export const SITE_SERVICES_PAGE_DEFAULTS: SiteServicesPageDraft = {
  seo: {
    title: 'Услуги',
    description: 'Каталог услуг МАРИ: процедуры, цены, длительность и переход к записи.',
  },
  heroActions: {
    primaryLabel: 'Записаться',
    secondaryLabel: 'Смотреть цены',
  },
  catalog: {
    eyebrow: 'Каталог услуг',
    title: 'Сначала выберите раздел.',
    description:
      'На первом экране показываем только разделы и категории, которые не входят ни в один раздел.',
    sectionCardEyebrow: 'Раздел услуг',
    sectionCardFallbackText: 'Место под фото раздела',
    sectionCardServiceCountTemplate: '{count} услуг',
    sectionCardActionLabel: 'Открыть',
    categoryFallbackText: 'Место под фото категории',
    categoryServiceCountTemplate: '{count} услуг',
    categoryActionLabel: 'Подробнее',
  },
  bottomCta: {
    eyebrow: 'Запись',
    title: 'Осталось выбрать услугу и удобное время.',
    description: 'Можно перейти в карточку процедуры, сравнить варианты или сразу открыть запись.',
    primaryCtaLabel: 'Записаться',
    secondaryCtaLabel: 'Выбрать мастера',
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

export const createSiteServicesPageDraft = (extra: unknown): SiteServicesPageDraft => {
  const siteContent = asObjectRecord(asObjectRecord(extra).siteContent);
  const source = asObjectRecord(siteContent.servicesPage);
  const seo = asObjectRecord(source.seo);
  const heroActions = asObjectRecord(source.heroActions);
  const catalog = asObjectRecord(source.catalog);
  const bottomCta = asObjectRecord(source.bottomCta);

  return {
    seo: {
      title: readString(seo.title, SITE_SERVICES_PAGE_DEFAULTS.seo.title),
      description: readString(seo.description, SITE_SERVICES_PAGE_DEFAULTS.seo.description),
    },
    heroActions: {
      primaryLabel: readString(heroActions.primaryLabel, SITE_SERVICES_PAGE_DEFAULTS.heroActions.primaryLabel),
      secondaryLabel: readString(heroActions.secondaryLabel, SITE_SERVICES_PAGE_DEFAULTS.heroActions.secondaryLabel),
    },
    catalog: {
      eyebrow: readString(catalog.eyebrow, SITE_SERVICES_PAGE_DEFAULTS.catalog.eyebrow),
      title: readString(catalog.title, SITE_SERVICES_PAGE_DEFAULTS.catalog.title),
      description: readString(catalog.description, SITE_SERVICES_PAGE_DEFAULTS.catalog.description),
      sectionCardEyebrow: readString(catalog.sectionCardEyebrow, SITE_SERVICES_PAGE_DEFAULTS.catalog.sectionCardEyebrow),
      sectionCardFallbackText: readString(catalog.sectionCardFallbackText, SITE_SERVICES_PAGE_DEFAULTS.catalog.sectionCardFallbackText),
      sectionCardServiceCountTemplate: readString(
        catalog.sectionCardServiceCountTemplate,
        SITE_SERVICES_PAGE_DEFAULTS.catalog.sectionCardServiceCountTemplate,
      ),
      sectionCardActionLabel: readString(catalog.sectionCardActionLabel, SITE_SERVICES_PAGE_DEFAULTS.catalog.sectionCardActionLabel),
      categoryFallbackText: readString(catalog.categoryFallbackText, SITE_SERVICES_PAGE_DEFAULTS.catalog.categoryFallbackText),
      categoryServiceCountTemplate: readString(
        catalog.categoryServiceCountTemplate,
        SITE_SERVICES_PAGE_DEFAULTS.catalog.categoryServiceCountTemplate,
      ),
      categoryActionLabel: readString(catalog.categoryActionLabel, SITE_SERVICES_PAGE_DEFAULTS.catalog.categoryActionLabel),
    },
    bottomCta: {
      eyebrow: readString(bottomCta.eyebrow, SITE_SERVICES_PAGE_DEFAULTS.bottomCta.eyebrow),
      title: readString(bottomCta.title, SITE_SERVICES_PAGE_DEFAULTS.bottomCta.title),
      description: readString(bottomCta.description, SITE_SERVICES_PAGE_DEFAULTS.bottomCta.description),
      primaryCtaLabel: readString(bottomCta.primaryCtaLabel, SITE_SERVICES_PAGE_DEFAULTS.bottomCta.primaryCtaLabel),
      secondaryCtaLabel: readString(bottomCta.secondaryCtaLabel, SITE_SERVICES_PAGE_DEFAULTS.bottomCta.secondaryCtaLabel),
    },
  };
};

export const mergeSiteServicesPageIntoExtra = (
  extra: Record<string, unknown>,
  draft: SiteServicesPageDraft,
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const siteContent = asObjectRecord(nextExtra.siteContent);
  nextExtra.siteContent = {
    ...siteContent,
    servicesPage: draft,
  };
  return nextExtra;
};

export const countConfiguredSiteServicesPageSections = (extra: unknown) => {
  const source = createSiteServicesPageDraft(extra);
  let count = 0;
  if (source.seo.title || source.seo.description) count += 1;
  if (source.heroActions.primaryLabel || source.heroActions.secondaryLabel) count += 1;
  if (source.catalog.title || source.catalog.description) count += 1;
  if (source.bottomCta.title || source.bottomCta.description) count += 1;
  return count;
};
