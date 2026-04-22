export type SiteHomePagePillarRecord = {
  title: string;
  text: string;
};

export type SiteHomePageHighlightRecord = {
  title: string;
  description: string;
};

export type SiteHomePageDraft = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    visualLabel: string;
    visualTitle: string;
    visualSubtitle: string;
    visualImageAssetId: string;
  };
  news: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    itemsLimit: number;
  };
  categories: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    itemsLimit: number;
  };
  valuePillars: {
    eyebrow: string;
    title: string;
    description: string;
    items: SiteHomePagePillarRecord[];
  };
  featuredServices: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
  };
  featuredSpecialists: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
  };
  contacts: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  highlights: SiteHomePageHighlightRecord[];
  bottomCta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
};

export const SITE_HOME_PAGE_SECTION_COUNT = 9;

export const SITE_HOME_PAGE_DEFAULTS: SiteHomePageDraft = {
  hero: {
    eyebrow: 'Салон красоты MARI',
    title: 'Услуги, специалисты\nи запись\nв одном месте.',
    description:
      'Здесь можно выбрать услугу, познакомиться со специалистами, посмотреть цены и сразу подобрать удобное время для визита.',
    primaryCtaLabel: 'Записаться',
    secondaryCtaLabel: 'Выбрать услугу',
    visualLabel: 'MARI',
    visualTitle: 'Пространство для ухода, цвета и точной работы с образом.',
    visualSubtitle:
      'Путь от первого знакомства до записи был коротким, понятным и приятным.',
    visualImageAssetId: '',
  },
  news: {
    eyebrow: 'Новости',
    title: 'Свежие обновления MARI.',
    description:
      'Коротко о новых пространствах, сезонных уходах и сервисных обновлениях, которые уже доступны для гостей.',
    actionLabel: 'Все новости',
    itemsLimit: 3,
  },
  categories: {
    eyebrow: 'Популярные направления',
    title: 'Услуги, которые выбирают чаще всего.',
    description:
      'В блоке показываются самые популярные услуги по количеству записей без отображения самих чисел.',
    actionLabel: 'Все услуги',
    itemsLimit: 6,
  },
  valuePillars: {
    eyebrow: 'Почему выбирают нас',
    title: 'В MARI важны комфорт, точность и уважение к вашему времени.',
    description:
      'Мы убрали всё лишнее и оставили только то, что помогает быстро принять решение и записаться без лишних шагов.',
    items: [
      {
        title: 'Понятный выбор',
        text: 'На сайте легко сравнить услуги, посмотреть длительность и сразу перейти к записи.',
      },
      {
        title: 'Сильные специалисты',
        text: 'У каждого специалиста есть профиль с направлениями работы и удобным переходом к записи.',
      },
      {
        title: 'Честные цены',
        text: 'В карточках сразу видно ориентир по стоимости и длительности, без сложных условий.',
      },
      {
        title: 'Комфорт после записи',
        text: 'В личном кабинете можно посмотреть визиты, обновить профиль и управлять ближайшими записями.',
      },
    ],
  },
  featuredServices: {
    eyebrow: 'Услуги',
    title: 'Популярные процедуры, которые выбирают чаще всего.',
    description:
      'У каждой услуги есть краткое описание, длительность, ориентир по стоимости и переход к записи.',
    actionLabel: 'Смотреть цены',
  },
  featuredSpecialists: {
    eyebrow: 'Специалисты',
    title: 'Специалисты, которым доверяют постоянные гости.',
    description:
      'Познакомьтесь со специалистами, их направлениями и выберите того, кто подходит именно вам.',
    actionLabel: 'Все специалисты',
  },
  contacts: {
    eyebrow: 'Салон MARI',
    title: 'Контакты, запись и поддержка собраны в одном месте.',
    description:
      'Можно позвонить, посмотреть адрес, выбрать услугу и сразу перейти к записи без долгих переходов по сайту.',
    primaryCtaLabel: 'Записаться',
    secondaryCtaLabel: 'Контакты салона',
  },
  highlights: [
    {
      title: 'Онлайн-запись',
      description:
        'Выберите услуги, специалиста и удобное время в одном аккуратном сценарии записи.',
    },
    {
      title: 'Личный кабинет',
      description:
        'После входа можно посмотреть историю визитов, обновить профиль и управлять записями.',
    },
    {
      title: 'Спокойная атмосфера',
      description:
        'Тёплый визуальный язык сайта передаёт настроение салона и помогает сосредоточиться на выборе.',
    },
  ],
  bottomCta: {
    eyebrow: 'Запись',
    title: 'Выберите услугу, специалиста и удобное время для визита.',
    description:
      'Основные разделы сайта собраны так, чтобы от знакомства с салоном вы могли сразу перейти к записи.',
    primaryCtaLabel: 'Записаться',
    secondaryCtaLabel: 'Выбрать специалиста',
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

const readInt = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const readPillars = (value: unknown) => {
  if (!Array.isArray(value)) {
    return SITE_HOME_PAGE_DEFAULTS.valuePillars.items;
  }

  return SITE_HOME_PAGE_DEFAULTS.valuePillars.items.map((item, index) => {
    const current = asObjectRecord(value[index]);
    return {
      title: readString(current.title, item.title),
      text: readString(current.text, item.text),
    };
  });
};

const readHighlights = (value: unknown) => {
  if (!Array.isArray(value)) {
    return SITE_HOME_PAGE_DEFAULTS.highlights;
  }

  return SITE_HOME_PAGE_DEFAULTS.highlights.map((item, index) => {
    const current = asObjectRecord(value[index]);
    return {
      title: readString(current.title, item.title),
      description: readString(current.description, item.description),
    };
  });
};

export const createSiteHomePageDraft = (extra: Record<string, unknown>): SiteHomePageDraft => {
  const siteContent = asObjectRecord(extra.siteContent);
  const source = asObjectRecord(siteContent.homePage);
  const hero = asObjectRecord(source.hero);
  const news = asObjectRecord(source.news);
  const categories = asObjectRecord(source.categories);
  const valuePillars = asObjectRecord(source.valuePillars);
  const featuredServices = asObjectRecord(source.featuredServices);
  const featuredSpecialists = asObjectRecord(source.featuredSpecialists);
  const contacts = asObjectRecord(source.contacts);
  const bottomCta = asObjectRecord(source.bottomCta);

  return {
    hero: {
      eyebrow: readString(hero.eyebrow, SITE_HOME_PAGE_DEFAULTS.hero.eyebrow),
      title: readString(hero.title, SITE_HOME_PAGE_DEFAULTS.hero.title),
      description: readString(hero.description, SITE_HOME_PAGE_DEFAULTS.hero.description),
      primaryCtaLabel: readString(
        hero.primaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.hero.primaryCtaLabel,
      ),
      secondaryCtaLabel: readString(
        hero.secondaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.hero.secondaryCtaLabel,
      ),
      visualLabel: readString(hero.visualLabel, SITE_HOME_PAGE_DEFAULTS.hero.visualLabel),
      visualTitle: readString(hero.visualTitle, SITE_HOME_PAGE_DEFAULTS.hero.visualTitle),
      visualSubtitle: readString(
        hero.visualSubtitle,
        SITE_HOME_PAGE_DEFAULTS.hero.visualSubtitle,
      ),
      visualImageAssetId: readString(
        hero.visualImageAssetId,
        SITE_HOME_PAGE_DEFAULTS.hero.visualImageAssetId,
      ),
    },
    news: {
      eyebrow: readString(news.eyebrow, SITE_HOME_PAGE_DEFAULTS.news.eyebrow),
      title: readString(news.title, SITE_HOME_PAGE_DEFAULTS.news.title),
      description: readString(news.description, SITE_HOME_PAGE_DEFAULTS.news.description),
      actionLabel: readString(news.actionLabel, SITE_HOME_PAGE_DEFAULTS.news.actionLabel),
      itemsLimit: readInt(news.itemsLimit, SITE_HOME_PAGE_DEFAULTS.news.itemsLimit, 1, 12),
    },
    categories: {
      eyebrow: readString(categories.eyebrow, SITE_HOME_PAGE_DEFAULTS.categories.eyebrow),
      title: readString(categories.title, SITE_HOME_PAGE_DEFAULTS.categories.title),
      description: readString(
        categories.description,
        SITE_HOME_PAGE_DEFAULTS.categories.description,
      ),
      actionLabel: readString(
        categories.actionLabel,
        SITE_HOME_PAGE_DEFAULTS.categories.actionLabel,
      ),
      itemsLimit: readInt(
        categories.itemsLimit,
        SITE_HOME_PAGE_DEFAULTS.categories.itemsLimit,
        1,
        12,
      ),
    },
    valuePillars: {
      eyebrow: readString(
        valuePillars.eyebrow,
        SITE_HOME_PAGE_DEFAULTS.valuePillars.eyebrow,
      ),
      title: readString(valuePillars.title, SITE_HOME_PAGE_DEFAULTS.valuePillars.title),
      description: readString(
        valuePillars.description,
        SITE_HOME_PAGE_DEFAULTS.valuePillars.description,
      ),
      items: readPillars(valuePillars.items),
    },
    featuredServices: {
      eyebrow: readString(
        featuredServices.eyebrow,
        SITE_HOME_PAGE_DEFAULTS.featuredServices.eyebrow,
      ),
      title: readString(
        featuredServices.title,
        SITE_HOME_PAGE_DEFAULTS.featuredServices.title,
      ),
      description: readString(
        featuredServices.description,
        SITE_HOME_PAGE_DEFAULTS.featuredServices.description,
      ),
      actionLabel: readString(
        featuredServices.actionLabel,
        SITE_HOME_PAGE_DEFAULTS.featuredServices.actionLabel,
      ),
    },
    featuredSpecialists: {
      eyebrow: readString(
        featuredSpecialists.eyebrow,
        SITE_HOME_PAGE_DEFAULTS.featuredSpecialists.eyebrow,
      ),
      title: readString(
        featuredSpecialists.title,
        SITE_HOME_PAGE_DEFAULTS.featuredSpecialists.title,
      ),
      description: readString(
        featuredSpecialists.description,
        SITE_HOME_PAGE_DEFAULTS.featuredSpecialists.description,
      ),
      actionLabel: readString(
        featuredSpecialists.actionLabel,
        SITE_HOME_PAGE_DEFAULTS.featuredSpecialists.actionLabel,
      ),
    },
    contacts: {
      eyebrow: readString(contacts.eyebrow, SITE_HOME_PAGE_DEFAULTS.contacts.eyebrow),
      title: readString(contacts.title, SITE_HOME_PAGE_DEFAULTS.contacts.title),
      description: readString(contacts.description, SITE_HOME_PAGE_DEFAULTS.contacts.description),
      primaryCtaLabel: readString(
        contacts.primaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.contacts.primaryCtaLabel,
      ),
      secondaryCtaLabel: readString(
        contacts.secondaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.contacts.secondaryCtaLabel,
      ),
    },
    highlights: readHighlights(source.highlights),
    bottomCta: {
      eyebrow: readString(bottomCta.eyebrow, SITE_HOME_PAGE_DEFAULTS.bottomCta.eyebrow),
      title: readString(bottomCta.title, SITE_HOME_PAGE_DEFAULTS.bottomCta.title),
      description: readString(
        bottomCta.description,
        SITE_HOME_PAGE_DEFAULTS.bottomCta.description,
      ),
      primaryCtaLabel: readString(
        bottomCta.primaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.bottomCta.primaryCtaLabel,
      ),
      secondaryCtaLabel: readString(
        bottomCta.secondaryCtaLabel,
        SITE_HOME_PAGE_DEFAULTS.bottomCta.secondaryCtaLabel,
      ),
    },
  };
};

export const mergeSiteHomePageIntoExtra = (
  extra: Record<string, unknown>,
  draft: SiteHomePageDraft,
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextSiteContent = asObjectRecord(extra.siteContent);

  nextExtra.siteContent = {
    ...nextSiteContent,
    homePage: {
      hero: draft.hero,
      news: draft.news,
      categories: draft.categories,
      valuePillars: draft.valuePillars,
      featuredServices: draft.featuredServices,
      featuredSpecialists: draft.featuredSpecialists,
      contacts: draft.contacts,
      highlights: draft.highlights,
      bottomCta: draft.bottomCta,
    },
  };

  return nextExtra;
};

export const countConfiguredSiteHomePageSections = (extra: Record<string, unknown>) => {
  const siteContent = asObjectRecord(extra.siteContent);
  const source = asObjectRecord(siteContent.homePage);

  return [
    source.hero,
    source.news,
    source.categories,
    source.valuePillars,
    source.featuredServices,
    source.featuredSpecialists,
    source.contacts,
    source.highlights,
    source.bottomCta,
  ].filter((item) => {
    if (Array.isArray(item)) {
      return item.length > 0;
    }
    return Object.keys(asObjectRecord(item)).length > 0;
  }).length;
};
