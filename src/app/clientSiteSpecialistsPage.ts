export type SiteSpecialistsPageDraft = {
  listPage: {
    heroPrimaryCtaLabel: string;
    detailsCountTemplate: string;
    detailsFilterText: string;
    ctaEyebrow: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaPrimaryLabel: string;
    ctaSecondaryLabel: string;
  };
  detailPage: {
    heroPrimaryCtaLabel: string;
    heroSecondaryCtaLabel: string;
    detailsServicesTemplate: string;
    detailsCategoriesTemplate: string;
    aboutEyebrow: string;
    aboutSpecialtyLabel: string;
    aboutCategoriesLabel: string;
    aboutUpdatedLabel: string;
    approachEyebrow: string;
    approachTitle: string;
    approachDescription: string;
    servicesEyebrow: string;
    servicesTitle: string;
    servicesDescription: string;
    ctaEyebrow: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaPrimaryLabel: string;
    ctaSecondaryLabel: string;
  };
};

export const SITE_SPECIALISTS_PAGE_SECTION_COUNT = 2;

export const SITE_SPECIALISTS_PAGE_DEFAULTS: SiteSpecialistsPageDraft = {
  listPage: {
    heroPrimaryCtaLabel: 'Записаться',
    detailsCountTemplate: '{count} специалистов в каталоге.',
    detailsFilterText: 'Фильтр по специализации помогает быстро сузить выбор.',
    ctaEyebrow: 'Выбор специалиста',
    ctaTitle: 'Выберите специалиста и перейдите к записи.',
    ctaDescription:
      'На странице специалиста собраны направления работы, услуги и удобный переход к ближайшему визиту.',
    ctaPrimaryLabel: 'Записаться',
    ctaSecondaryLabel: 'Смотреть услуги',
  },
  detailPage: {
    heroPrimaryCtaLabel: 'Записаться к специалисту',
    heroSecondaryCtaLabel: 'Все специалисты',
    detailsServicesTemplate: '{count} услуг доступно для онлайн-записи.',
    detailsCategoriesTemplate: 'Направления: {categories}.',
    aboutEyebrow: 'О специалисте',
    aboutSpecialtyLabel: 'Специализация',
    aboutCategoriesLabel: 'Категории услуг',
    aboutUpdatedLabel: 'Последнее обновление',
    approachEyebrow: 'Подход',
    approachTitle: 'Выбирайте специалиста по направлению и стилю работы.',
    approachDescription:
      'На странице собраны ключевые направления специалиста и список услуг, чтобы вы могли быстро понять, подходит ли вам этот специалист.',
    servicesEyebrow: 'Услуги специалиста',
    servicesTitle: 'Услуги, на которые можно записаться к этому специалисту.',
    servicesDescription:
      'Сравните процедуры по времени и стоимости и выберите ту, которая подходит именно вам.',
    ctaEyebrow: 'Запись к специалисту',
    ctaTitle: 'Если специалист подходит вам по направлению, переходите к записи.',
    ctaDescription: 'Осталось выбрать услугу и удобное время визита.',
    ctaPrimaryLabel: 'Записаться к специалисту',
    ctaSecondaryLabel: 'Контакты салона',
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

export const createSiteSpecialistsPageDraft = (
  extra: Record<string, unknown>,
): SiteSpecialistsPageDraft => {
  const siteContent = asObjectRecord(extra.siteContent);
  const source = asObjectRecord(siteContent.specialistsPage);
  const listPage = asObjectRecord(source.listPage);
  const detailPage = asObjectRecord(source.detailPage);

  return {
    listPage: {
      heroPrimaryCtaLabel: readString(
        listPage.heroPrimaryCtaLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.heroPrimaryCtaLabel,
      ),
      detailsCountTemplate: readString(
        listPage.detailsCountTemplate,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.detailsCountTemplate,
      ),
      detailsFilterText: readString(
        listPage.detailsFilterText,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.detailsFilterText,
      ),
      ctaEyebrow: readString(
        listPage.ctaEyebrow,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.ctaEyebrow,
      ),
      ctaTitle: readString(
        listPage.ctaTitle,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.ctaTitle,
      ),
      ctaDescription: readString(
        listPage.ctaDescription,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.ctaDescription,
      ),
      ctaPrimaryLabel: readString(
        listPage.ctaPrimaryLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.ctaPrimaryLabel,
      ),
      ctaSecondaryLabel: readString(
        listPage.ctaSecondaryLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.listPage.ctaSecondaryLabel,
      ),
    },
    detailPage: {
      heroPrimaryCtaLabel: readString(
        detailPage.heroPrimaryCtaLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.heroPrimaryCtaLabel,
      ),
      heroSecondaryCtaLabel: readString(
        detailPage.heroSecondaryCtaLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.heroSecondaryCtaLabel,
      ),
      detailsServicesTemplate: readString(
        detailPage.detailsServicesTemplate,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.detailsServicesTemplate,
      ),
      detailsCategoriesTemplate: readString(
        detailPage.detailsCategoriesTemplate,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.detailsCategoriesTemplate,
      ),
      aboutEyebrow: readString(
        detailPage.aboutEyebrow,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.aboutEyebrow,
      ),
      aboutSpecialtyLabel: readString(
        detailPage.aboutSpecialtyLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.aboutSpecialtyLabel,
      ),
      aboutCategoriesLabel: readString(
        detailPage.aboutCategoriesLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.aboutCategoriesLabel,
      ),
      aboutUpdatedLabel: readString(
        detailPage.aboutUpdatedLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.aboutUpdatedLabel,
      ),
      approachEyebrow: readString(
        detailPage.approachEyebrow,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.approachEyebrow,
      ),
      approachTitle: readString(
        detailPage.approachTitle,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.approachTitle,
      ),
      approachDescription: readString(
        detailPage.approachDescription,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.approachDescription,
      ),
      servicesEyebrow: readString(
        detailPage.servicesEyebrow,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.servicesEyebrow,
      ),
      servicesTitle: readString(
        detailPage.servicesTitle,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.servicesTitle,
      ),
      servicesDescription: readString(
        detailPage.servicesDescription,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.servicesDescription,
      ),
      ctaEyebrow: readString(
        detailPage.ctaEyebrow,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.ctaEyebrow,
      ),
      ctaTitle: readString(
        detailPage.ctaTitle,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.ctaTitle,
      ),
      ctaDescription: readString(
        detailPage.ctaDescription,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.ctaDescription,
      ),
      ctaPrimaryLabel: readString(
        detailPage.ctaPrimaryLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.ctaPrimaryLabel,
      ),
      ctaSecondaryLabel: readString(
        detailPage.ctaSecondaryLabel,
        SITE_SPECIALISTS_PAGE_DEFAULTS.detailPage.ctaSecondaryLabel,
      ),
    },
  };
};

export const mergeSiteSpecialistsPageIntoExtra = (
  extra: Record<string, unknown>,
  draft: SiteSpecialistsPageDraft,
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextSiteContent = asObjectRecord(extra.siteContent);

  nextExtra.siteContent = {
    ...nextSiteContent,
    specialistsPage: {
      listPage: draft.listPage,
      detailPage: draft.detailPage,
    },
  };

  return nextExtra;
};

export const countConfiguredSiteSpecialistsPageSections = (extra: Record<string, unknown>) => {
  const siteContent = asObjectRecord(extra.siteContent);
  const source = asObjectRecord(siteContent.specialistsPage);

  return [source.listPage, source.detailPage].filter(
    (item) => Object.keys(asObjectRecord(item)).length > 0,
  ).length;
};

export const applySiteSpecialistsPageTemplate = (
  template: string,
  values: Record<string, string | number>,
) =>
  template.replace(/\{(\w+)\}/g, (_, token: string) => String(values[token] ?? ''));
