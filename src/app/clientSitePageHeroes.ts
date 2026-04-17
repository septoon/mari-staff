export type SitePageHeroKey =
  | 'about'
  | 'booking'
  | 'careers'
  | 'contacts'
  | 'gallery'
  | 'giftCards'
  | 'masters'
  | 'masterDetails'
  | 'news'
  | 'newsArticle'
  | 'offers'
  | 'privacyPolicy'
  | 'prices'
  | 'services'
  | 'serviceCategory'
  | 'serviceDetails';

type SitePageHeroDefaults = {
  eyebrow?: string;
  title: string;
  description: string;
};

type SitePageHeroOverrides = Partial<
  SitePageHeroDefaults & {
    imageAssetId: string;
  }
>;

export type SitePageHeroDraft = Record<
  SitePageHeroKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    imageAssetId: string;
  }
>;

type SitePageHeroToken = {
  token: string;
  label: string;
  example: string;
};

export type SitePageHeroDefinition = {
  key: SitePageHeroKey;
  title: string;
  route: string;
  scope: string;
  note: string;
  defaults: SitePageHeroDefaults;
  tokens: SitePageHeroToken[];
};

const SITE_PAGE_HERO_KEYS: SitePageHeroKey[] = [
  'about',
  'booking',
  'careers',
  'contacts',
  'gallery',
  'giftCards',
  'masters',
  'masterDetails',
  'news',
  'newsArticle',
  'offers',
  'privacyPolicy',
  'prices',
  'services',
  'serviceCategory',
  'serviceDetails'
];

export const SITE_PAGE_HERO_DEFINITIONS: SitePageHeroDefinition[] = [
  {
    key: 'services',
    title: 'Услуги',
    route: '/services',
    scope: 'Отдельная страница',
    note: 'Главная страница каталога услуг.',
    defaults: {
      eyebrow: 'Услуги',
      title: 'Каталог услуг MARI.',
      description: 'Выберите направление, сравните процедуры по времени и стоимости и перейдите к записи в пару шагов.'
    },
    tokens: []
  },
  {
    key: 'serviceCategory',
    title: 'Категория услуг',
    route: '/services/{category}',
    scope: 'Шаблон страницы',
    note: 'Применяется ко всем страницам категорий услуг.',
    defaults: {
      eyebrow: '{categoryEyebrow}',
      title: '{categoryName}',
      description: '{categoryHeroText}'
    },
    tokens: [
      { token: 'categoryEyebrow', label: 'Подпись категории', example: 'Brows' },
      { token: 'categoryName', label: 'Название категории', example: 'Брови' },
      {
        token: 'categoryHeroText',
        label: 'Описание категории',
        example: 'Коррекция, окрашивание и ламинирование бровей.'
      },
      { token: 'servicesCount', label: 'Количество услуг', example: '12' }
    ]
  },
  {
    key: 'serviceDetails',
    title: 'Услуга',
    route: '/services/{category}/{service}',
    scope: 'Шаблон страницы',
    note: 'Применяется ко всем карточкам услуг.',
    defaults: {
      eyebrow: '{categoryEyebrow}',
      title: '{serviceName}',
      description: '{serviceTeaser}'
    },
    tokens: [
      { token: 'categoryEyebrow', label: 'Подпись категории', example: 'Brows' },
      { token: 'categoryName', label: 'Название категории', example: 'Брови' },
      { token: 'serviceName', label: 'Название услуги', example: 'Ламинирование бровей' },
      {
        token: 'serviceTeaser',
        label: 'Краткое описание услуги',
        example: 'Аккуратная коррекция формы и оттенка с мягким результатом.'
      }
    ]
  },
  {
    key: 'prices',
    title: 'Цены',
    route: '/prices',
    scope: 'Отдельная страница',
    note: 'Страница общего прайса.',
    defaults: {
      eyebrow: 'Цены',
      title: 'Цены без сложных условий.',
      description: 'Смотрите услуги, длительность и ориентир по стоимости, чтобы сразу спланировать визит.'
    },
    tokens: []
  },
  {
    key: 'booking',
    title: 'Запись',
    route: '/booking',
    scope: 'Отдельная страница',
    note: 'Основная страница онлайн-записи.',
    defaults: {
      eyebrow: 'Запись',
      title: 'Онлайн-запись в MARI.',
      description: 'Выберите услугу, специалиста и удобное время для визита на отдельной странице записи.'
    },
    tokens: []
  },
  {
    key: 'masters',
    title: 'Специалисты',
    route: '/masters',
    scope: 'Отдельная страница',
    note: 'Список специалистов на сайте.',
    defaults: {
      eyebrow: 'Специалисты',
      title: 'Специалисты, которым доверяют постоянные гости.',
      description: 'Познакомьтесь со специалистами MARI, их направлениями и услугами, на которые можно записаться.'
    },
    tokens: []
  },
  {
    key: 'masterDetails',
    title: 'Карточка специалиста',
    route: '/masters/{slug}',
    scope: 'Шаблон страницы',
    note: 'Применяется ко всем страницам специалистов.',
    defaults: {
      eyebrow: '{masterSpecialty}',
      title: '{masterName}',
      description: '{masterSummary}'
    },
    tokens: [
      { token: 'masterSpecialty', label: 'Специализация', example: 'Колорист' },
      { token: 'masterName', label: 'Имя специалиста', example: 'Анна Иванова' },
      {
        token: 'masterSummary',
        label: 'Краткое описание',
        example: 'Работает по направлениям: окрашивание, уход, укладки.'
      },
      { token: 'masterCategories', label: 'Категории услуг', example: 'Окрашивание, Укладки' }
    ]
  },
  {
    key: 'offers',
    title: 'Акции',
    route: '/offers',
    scope: 'Отдельная страница',
    note: 'Страница специальных предложений.',
    defaults: {
      eyebrow: 'Акции',
      title: 'Специальные предложения MARI.',
      description:
        'Здесь собраны выгодные форматы визитов, бонусы и идеи для тех, кто хочет попробовать больше за один визит.'
    },
    tokens: []
  },
  {
    key: 'privacyPolicy',
    title: 'Политика конфиденциальности',
    route: '/privacy-policy',
    scope: 'Отдельная страница',
    note: 'Hero для страницы политики конфиденциальности.',
    defaults: {
      eyebrow: 'Политика конфиденциальности',
      title: 'Политика конфиденциальности MARI.',
      description: 'Условия обработки персональных данных, тексты согласия и основные правила использования сайта.'
    },
    tokens: []
  },
  {
    key: 'gallery',
    title: 'Галерея',
    route: '/gallery',
    scope: 'Отдельная страница',
    note: 'Галерея атмосферы, интерьера и работ.',
    defaults: {
      eyebrow: 'Галерея',
      title: 'Галерея настроения, образов и пространства MARI.',
      description: 'Собрали здесь детали, которые передают атмосферу салона, характер процедур и наше отношение к красоте.'
    },
    tokens: []
  },
  {
    key: 'about',
    title: 'О салоне',
    route: '/about',
    scope: 'Отдельная страница',
    note: 'Страница про бренд и атмосферу салона.',
    defaults: {
      eyebrow: 'О салоне',
      title: 'MARI — салон, в котором красота ощущается спокойно и естественно.',
      description: 'Мы соединяем сильную экспертизу мастеров, тёплый сервис и пространство, куда хочется возвращаться.'
    },
    tokens: []
  },
  {
    key: 'contacts',
    title: 'Контакты',
    route: '/contacts',
    scope: 'Отдельная страница',
    note: 'Контакты, маршрут и быстрые действия.',
    defaults: {
      eyebrow: 'Контакты',
      title: 'Контакты MARI.',
      description: 'Позвоните, постройте маршрут или перейдите на отдельную страницу записи, если уже планируете визит.'
    },
    tokens: []
  },
  {
    key: 'giftCards',
    title: 'Подарочные сертификаты',
    route: '/gift-cards',
    scope: 'Отдельная страница',
    note: 'Страница сертификатов и подарочных сценариев.',
    defaults: {
      eyebrow: 'Подарочные сертификаты',
      title: 'Подарочные сертификаты MARI.',
      description: 'Выберите номинал, формат подарка и подарите близкому красивый визит в салон.'
    },
    tokens: []
  },
  {
    key: 'news',
    title: 'Новости',
    route: '/news',
    scope: 'Отдельная страница',
    note: 'Список новостей и обновлений.',
    defaults: {
      eyebrow: 'Новости',
      title: 'Новости салона, сезонные предложения и важные обновления.',
      description: 'Здесь рассказываем о новых процедурах, пространствах, форматах ухода и приятных изменениях в MARI.'
    },
    tokens: []
  },
  {
    key: 'newsArticle',
    title: 'Статья новости',
    route: '/news/{slug}',
    scope: 'Шаблон страницы',
    note: 'Применяется ко всем страницам новостей.',
    defaults: {
      eyebrow: '{newsCategory}',
      title: '{newsTitle}',
      description: '{newsExcerpt}'
    },
    tokens: [
      { token: 'newsCategory', label: 'Категория новости', example: 'Сервис' },
      { token: 'newsTitle', label: 'Заголовок новости', example: 'Обновили пространство для ухода' },
      {
        token: 'newsExcerpt',
        label: 'Краткое описание',
        example: 'Рассказываем, что изменилось и почему гостям стало ещё удобнее.'
      },
      { token: 'newsDate', label: 'Дата публикации', example: '15.03.2026' }
    ]
  },
  {
    key: 'careers',
    title: 'Вакансии',
    route: '/careers',
    scope: 'Отдельная страница',
    note: 'Страница найма и вакансий.',
    defaults: {
      eyebrow: 'Вакансии',
      title: 'Присоединяйтесь к команде MARI.',
      description:
        'Ищем мастеров и сервисных специалистов, которым близки аккуратный подход, уважение к гостю и любовь к красивому результату.'
    },
    tokens: []
  }
];

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const isSitePageHeroKey = (value: string): value is SitePageHeroKey =>
  SITE_PAGE_HERO_KEYS.includes(value as SitePageHeroKey);

const applyTemplate = (template: string | undefined, values: Record<string, string>) => {
  if (!template) {
    return '';
  }

  return template
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token: string) => values[token] ?? '')
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const pickTemplate = (overrideValue: string, defaultValue: string | undefined) =>
  overrideValue.trim() ? overrideValue : defaultValue;

export const extractSitePageHeroConfig = (
  extra: Record<string, unknown>
): Partial<Record<SitePageHeroKey, SitePageHeroOverrides>> => {
  const source = asObjectRecord(extra.pageHero);
  const result: Partial<Record<SitePageHeroKey, SitePageHeroOverrides>> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    if (!isSitePageHeroKey(key)) {
      continue;
    }

    const value = asObjectRecord(rawValue);
    const next: SitePageHeroOverrides = {};

    if (typeof value.eyebrow === 'string') {
      next.eyebrow = value.eyebrow;
    }
    if (typeof value.title === 'string') {
      next.title = value.title;
    }
    if (typeof value.description === 'string') {
      next.description = value.description;
    }
    if (typeof value.imageAssetId === 'string') {
      next.imageAssetId = value.imageAssetId;
    }

    if (Object.keys(next).length > 0) {
      result[key] = next;
    }
  }

  return result;
};

export const createSitePageHeroDraft = (extra: Record<string, unknown>): SitePageHeroDraft => {
  const config = extractSitePageHeroConfig(extra);

  return SITE_PAGE_HERO_DEFINITIONS.reduce<SitePageHeroDraft>((acc, definition) => {
    const current = config[definition.key];
    acc[definition.key] = {
      eyebrow: current?.eyebrow ?? '',
      title: current?.title ?? '',
      description: current?.description ?? '',
      imageAssetId: current?.imageAssetId ?? '',
    };
    return acc;
  }, {} as SitePageHeroDraft);
};

export const countConfiguredSitePageHeroes = (extra: Record<string, unknown>) =>
  Object.values(extractSitePageHeroConfig(extra)).filter(
    (item) =>
      Boolean(
        item.eyebrow?.trim() ||
          item.title?.trim() ||
          item.description?.trim() ||
          item.imageAssetId?.trim(),
      )
  ).length;

export const mergeSitePageHeroesIntoExtra = (
  extra: Record<string, unknown>,
  draft: SitePageHeroDraft
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextPageHero: Record<string, SitePageHeroOverrides> = {};

  for (const definition of SITE_PAGE_HERO_DEFINITIONS) {
    const current = draft[definition.key];
    const next: SitePageHeroOverrides = {};

    if (current.eyebrow.trim()) {
      next.eyebrow = current.eyebrow.trim();
    }
    if (current.title.trim()) {
      next.title = current.title.trim();
    }
    if (current.description.trim()) {
      next.description = current.description.trim();
    }
    if (current.imageAssetId.trim()) {
      next.imageAssetId = current.imageAssetId.trim();
    }

    if (Object.keys(next).length > 0) {
      nextPageHero[definition.key] = next;
    }
  }

  if (Object.keys(nextPageHero).length > 0) {
    nextExtra.pageHero = nextPageHero;
  } else {
    delete nextExtra.pageHero;
  }

  return nextExtra;
};

export const resolveSitePageHeroPreview = (
  definition: SitePageHeroDefinition,
  draft: SitePageHeroDraft[SitePageHeroKey]
) => {
  const values = definition.tokens.reduce<Record<string, string>>((acc, token) => {
    acc[token.token] = token.example;
    return acc;
  }, {});

  const eyebrow =
    applyTemplate(pickTemplate(draft.eyebrow, definition.defaults.eyebrow), values) ||
    applyTemplate(definition.defaults.eyebrow, values) ||
    '';
  const title =
    applyTemplate(pickTemplate(draft.title, definition.defaults.title), values) ||
    applyTemplate(definition.defaults.title, values) ||
    definition.defaults.title;
  const description =
    applyTemplate(pickTemplate(draft.description, definition.defaults.description), values) ||
    applyTemplate(definition.defaults.description, values) ||
    definition.defaults.description;

  return {
    eyebrow,
    title,
    description
  };
};
