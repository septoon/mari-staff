export type SiteOfferRecord = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  priceNote: string;
  ctaHref: string;
  imageAssetId?: string;
};

export type SiteNewsRecord = {
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  excerpt: string;
  body: string[];
  imageAssetId?: string;
};

export type SiteLocationRecord = {
  slug: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  workingHours: string;
  mapUrl: string;
  description: string;
  note: string;
  imageAssetId?: string;
  serviceSlugs: string[];
  masterSlugs: string[];
  features: string[];
  interiorMoments: Array<{
    title: string;
    description: string;
  }>;
};

export type SitePolicySectionRecord = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type SitePolicyRecord = {
  eyebrow: string;
  title: string;
  description: string;
  summaryEyebrow: string;
  summaryTitle: string;
  operatorLabel: string;
  contactLabel: string;
  addressLabel: string;
  summaryNote: string;
  contactCtaLabel: string;
  bookingConsentLabel: string;
  accountConsentLabel: string;
  cookieBannerTitle: string;
  cookieBannerDescription: string;
  cookieBannerAcceptLabel: string;
  cookieBannerNecessaryLabel: string;
  sections: SitePolicySectionRecord[];
};

export type SiteCardsDraft = {
  offers: SiteOfferRecord[];
  news: SiteNewsRecord[];
  locations: SiteLocationRecord[];
  policy: SitePolicyRecord;
};

const DEFAULT_OFFERS: SiteOfferRecord[] = [
  {
    slug: 'weekday-signature',
    title: 'Weekday Signature',
    subtitle: 'Волосы и брови в один будний визит',
    description: 'Удобный формат для тех, кто хочет освежить образ за одно посещение и не тратить лишнее время.',
    badge: '-15%',
    priceNote: 'По будням до 15:00, по предварительной записи',
    ctaHref: '/booking?offer=weekday-signature',
    imageAssetId: ''
  },
  {
    slug: 'facial-membership',
    title: 'Facial Membership',
    subtitle: 'Серия из 4 уходов для ровного сияния кожи',
    description: 'Формат для тех, кто хочет ухаживать за кожей регулярно и видеть стабильный результат без спешки.',
    badge: '4 визита',
    priceNote: 'Персональный график и приоритет при выборе времени',
    ctaHref: '/booking?offer=facial-membership',
    imageAssetId: ''
  },
  {
    slug: 'gift-season',
    title: 'Gift Season',
    subtitle: 'Сертификаты с дополнительным номиналом',
    description: 'При покупке сертификата от 15 000 ₽ добавляем приятный бонус к подарку.',
    badge: 'Подарок',
    priceNote: 'Можно оформить онлайн или в салоне',
    ctaHref: '/gift-cards',
    imageAssetId: ''
  }
];

const DEFAULT_NEWS: SiteNewsRecord[] = [
  {
    slug: 'new-private-suites',
    title: 'Новые приватные кабинеты в Mari Center Residence',
    category: 'Пространство',
    publishedAt: '2026-02-18',
    excerpt: 'Во флагманском пространстве появились тихие кабинеты для длительных визитов и комплексного ухода.',
    imageAssetId: '',
    body: [
      'В Mari Center Residence появились новые приватные кабинеты для тех, кто ценит тишину, спокойствие и персональный ритм визита.',
      'Они особенно удобны для длительных процедур, комплексного ухода и визитов, когда хочется провести несколько часов в комфортной обстановке.',
      'Новый формат подойдёт гостям, которые любят камерную атмосферу и хотят полностью посвятить время себе.'
    ]
  },
  {
    slug: 'spring-skin-menu',
    title: 'Весеннее меню ухода: мягкое восстановление и сияние',
    category: 'Уход',
    publishedAt: '2026-03-03',
    excerpt: 'Собрали сезонные процедуры для обезвоженной кожи, тусклого тона и усталого вида.',
    imageAssetId: '',
    body: [
      'Весной коже чаще всего нужны не интенсивные процедуры, а мягкое восстановление влаги, барьера и ровного тона.',
      'В сезонное меню вошли процедуры для сияния, тонуса и свежего вида, которые удобно вписываются даже в плотный график.',
      'Перед началом мастер подбирает уход под текущее состояние кожи, чтобы результат был заметным и комфортным.'
    ]
  },
  {
    slug: 'gift-card-digital-launch',
    title: 'Подарочные сертификаты MARI теперь доступны онлайн',
    category: 'Сервис',
    publishedAt: '2026-01-22',
    excerpt: 'Теперь сертификат можно оформить дистанционно, выбрать номинал и добавить тёплое личное сообщение.',
    imageAssetId: '',
    body: [
      'Теперь подарочный сертификат MARI можно оформить онлайн и отправить близкому в удобном формате.',
      'Вы сами выбираете номинал, а использовать сертификат можно на услуги, программы ухода и комплексные визиты.',
      'Это удобный вариант, если хочется сделать красивый подарок без лишних поездок и ожиданий.'
    ]
  }
];

const DEFAULT_LOCATIONS: SiteLocationRecord[] = [
  {
    slug: 'center-residence',
    name: 'Mari Center Residence',
    district: 'Центр',
    address: 'Симферополь, ул. Екатерининская, 18',
    phone: '+7 (978) 000-18-18',
    workingHours: 'Ежедневно, 09:00 - 21:00',
    mapUrl: 'https://maps.google.com/?q=44.9521,34.1024',
    description: 'Флагманский филиал для цветовых сервисов, facial-care и точных beauty-ритуалов в тихом премиальном интерьере.',
    note: 'Подходит для длительных beauty-дней и спокойных персональных визитов.',
    imageAssetId: '',
    serviceSlugs: ['signature-color', 'silk-recovery', 'architect-manicure', 'brow-sculpt', 'glass-skin-care', 'lymphatic-touch', 'mens-cut', 'mens-face-reset'],
    masterSlugs: ['elena-orlova', 'mila-rudneva', 'sofia-levina', 'alisa-gromova', 'polina-cherkasova', 'vera-soboleva'],
    features: ['private beauty suites', 'тихая lounge-зона', 'парковка по записи'],
    interiorMoments: [
      { title: 'Светлая lounge-зона', description: 'Мягкий свет, спокойная музыка и приватная атмосфера ожидания.' },
      { title: 'Тихие beauty-кабинеты', description: 'Изолированные пространства для длительных и уходовых сервисов.' }
    ]
  },
  {
    slug: 'garden-studio',
    name: 'Mari Garden Studio',
    district: 'Тихий жилой квартал',
    address: 'Симферополь, пр. Лавандовый, 7',
    phone: '+7 (978) 000-22-07',
    workingHours: 'Ежедневно, 10:00 - 20:00',
    mapUrl: 'https://maps.google.com/?q=44.965,34.113',
    description: 'Камерный филиал для регулярного ухода: nail-сервис, эпиляция и деликатные beauty-процедуры рядом с домом.',
    note: 'Оптимален для поддерживающих визитов и коротких beauty-ритуалов.',
    imageAssetId: '',
    serviceSlugs: ['silk-recovery', 'architect-manicure', 'spa-pedicure', 'brow-sculpt', 'laser-comfort', 'wax-ritual'],
    masterSlugs: ['sofia-levina', 'alisa-gromova', 'vera-soboleva', 'ira-melnik'],
    features: ['easy access parking', 'домашняя камерная атмосфера', 'быстрое утреннее время'],
    interiorMoments: [
      { title: 'Garden-light интерьер', description: 'Тёплая палитра, мягкие ткани и много воздуха.' },
      { title: 'Быстрый сервис без спешки', description: 'Филиал собран для тех, кто хочет качество в удобном ежедневном ритме.' }
    ]
  },
  {
    slug: 'seaside-club',
    name: 'Mari Seaside Club',
    district: 'Клубный формат',
    address: 'Ялта, набережная, 4',
    phone: '+7 (978) 000-40-04',
    workingHours: 'Ежедневно, 09:00 - 22:00',
    mapUrl: 'https://maps.google.com/?q=44.4952,34.1663',
    description: 'Клубное пространство для facial-care, body-ритуалов и colour-сервисов в более приватном и slow-paced формате.',
    note: 'Хороший выбор для beauty-weekend и восстановительных программ.',
    imageAssetId: '',
    serviceSlugs: ['signature-color', 'spa-pedicure', 'lash-lift', 'glass-skin-care', 'sculpt-lift', 'detox-wrap', 'lymphatic-touch', 'laser-comfort', 'mens-cut'],
    masterSlugs: ['elena-orlova', 'alisa-gromova', 'polina-cherkasova', 'vera-soboleva'],
    features: ['spa rhythm', 'видовые окна', 'extended-care sessions'],
    interiorMoments: [
      { title: 'Клубная приватность', description: 'Более размеренный ритм и extended appointments для комплексных визитов.' },
      { title: 'Spa-зона', description: 'Отдельный блок для body-care и восстановительных программ.' }
    ]
  }
];

const DEFAULT_POLICY: SitePolicyRecord = {
  eyebrow: 'Privacy policy',
  title: 'Политика конфиденциальности',
  description: 'Какие данные сайт получает, зачем они нужны, как обрабатываются и каким образом пользователь может запросить уточнение, ограничение или удаление.',
  summaryEyebrow: 'Кратко',
  summaryTitle: 'Что важно знать',
  operatorLabel: 'Оператор сайта',
  contactLabel: 'Основной контакт для запросов',
  addressLabel: 'Адрес салона',
  summaryNote: 'Если вопрос связан с записью или кабинетом, удобнее всего писать с той почты или телефона, которые уже использовались на сайте.',
  contactCtaLabel: 'Задать вопрос',
  bookingConsentLabel: 'Подтверждаю согласие на обработку персональных данных для оформления записи и ознакомлен(а) с политикой конфиденциальности.',
  accountConsentLabel: 'Подтверждаю согласие на обработку персональных данных для создания личного кабинета и ознакомлен(а) с политикой конфиденциальности.',
  cookieBannerTitle: 'Сайт использует cookie',
  cookieBannerDescription: 'Cookie нужны для входа в кабинет, стабильной работы записи и аналитики. Вы можете разрешить аналитику или оставить только необходимые cookie.',
  cookieBannerAcceptLabel: 'Разрешить аналитику',
  cookieBannerNecessaryLabel: 'Только необходимые',
  sections: [
    {
      id: 'policy-scope',
      title: '1. Что регулирует этот документ',
      paragraphs: [
        'Эта страница объясняет, какие данные сайт может получать от посетителя, зачем они нужны и как используются при работе с онлайн-записью, личным кабинетом и обратной связью.',
        'Документ применяется к сайту салона, формам записи, формам входа в кабинет, обращениям по телефону и электронной почте, а также к связанным сервисам аналитики и уведомлений.'
      ]
    },
    {
      id: 'policy-data',
      title: '2. Какие данные могут обрабатываться',
      paragraphs: [
        'Сайт может получать имя, номер телефона, адрес электронной почты, данные о выбранных услугах, специалистах, времени визита, а также сведения, которые пользователь сам указывает в комментарии к записи.',
        'Дополнительно могут обрабатываться технические данные: IP-адрес, сведения о браузере и устройстве, cookie, дата и время визита, адреса посещённых страниц и действия на сайте.'
      ]
    },
    {
      id: 'policy-purpose',
      title: '3. Для чего нужны эти данные',
      paragraphs: [
        'Основные цели: оформить и подтвердить запись, дать доступ к личному кабинету, связаться по вопросам визита, отправить сервисные уведомления, ответить на запрос пользователя и улучшать работу сайта.',
        'Данные не запрашиваются без причины: если сайт просит телефон или почту, это связано либо с записью, либо с идентификацией пользователя, либо с обратной связью.'
      ]
    },
    {
      id: 'policy-basis',
      title: '4. Правовые основания обработки',
      paragraphs: [
        'Данные обрабатываются на основании согласия пользователя, необходимости исполнить запрос пользователя или подготовить оказание услуги, а также для исполнения обязательных требований законодательства.',
        'Если для конкретного действия требуется отдельное согласие, пользователь выражает его через форму сайта, чекбокс, отправку данных или иное явное действие.'
      ]
    },
    {
      id: 'policy-storage',
      title: '5. Передача и хранение данных',
      paragraphs: [
        'Данные могут передаваться только тем сервисам и подрядчикам, без которых невозможно обеспечить запись, авторизацию, техническую работу сайта, аналитику или отправку уведомлений. Передача происходит в пределах задач, для которых данные были собраны.',
        'Данные хранятся только столько, сколько это нужно для работы сервиса, выполнения записи, обслуживания клиента, соблюдения обязательств и разрешения спорных ситуаций.'
      ]
    },
    {
      id: 'policy-cookies',
      title: '6. Cookie и аналитика',
      paragraphs: [
        'Сайт может использовать cookie и технические идентификаторы, чтобы сохранять сессию, понимать, какие страницы работают лучше, и оценивать стабильность записи и личного кабинета.',
        'Если пользователь ограничивает cookie в браузере или выбирает только необходимые cookie, часть аналитики не будет загружаться, но базовые функции сайта останутся доступны.'
      ]
    },
    {
      id: 'policy-rights',
      title: '7. Права пользователя',
      paragraphs: [
        'Пользователь может запросить уточнение, обновление, ограничение обработки или удаление своих данных, если это не противоречит обязательным требованиям закона и факту уже оказанной услуги.',
        'Также пользователь может отозвать согласие на обработку в той части, где обработка строится именно на согласии.'
      ]
    },
    {
      id: 'policy-updates',
      title: '8. Изменение политики',
      paragraphs: [
        'Политика может обновляться при изменении сайта, процессов записи, состава сервисов или требований закона. Актуальная версия всегда публикуется на этой странице.',
        'Если изменения влияют на существенные условия обработки данных, новая редакция начинает применяться с момента публикации на сайте.'
      ]
    }
  ]
};

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asLocationMomentArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => asObjectRecord(item))
        .map((item) => ({
          title: typeof item.title === 'string' ? item.title : '',
          description: typeof item.description === 'string' ? item.description : ''
        }))
    : [];

const readOffers = (value: unknown): SiteOfferRecord[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_OFFERS;
  }

  return value.map((item) => {
    const current = asObjectRecord(item);
    return {
      slug: typeof current.slug === 'string' ? current.slug : '',
      title: typeof current.title === 'string' ? current.title : '',
      subtitle: typeof current.subtitle === 'string' ? current.subtitle : '',
      description: typeof current.description === 'string' ? current.description : '',
      badge: typeof current.badge === 'string' ? current.badge : '',
      priceNote: typeof current.priceNote === 'string' ? current.priceNote : '',
      ctaHref: typeof current.ctaHref === 'string' ? current.ctaHref : '',
      imageAssetId: typeof current.imageAssetId === 'string' ? current.imageAssetId : '',
    };
  });
};

const readNews = (value: unknown): SiteNewsRecord[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_NEWS;
  }

  return value.map((item) => {
    const current = asObjectRecord(item);
    return {
      slug: typeof current.slug === 'string' ? current.slug : '',
      title: typeof current.title === 'string' ? current.title : '',
      category: typeof current.category === 'string' ? current.category : '',
      publishedAt: typeof current.publishedAt === 'string' ? current.publishedAt : '',
      excerpt: typeof current.excerpt === 'string' ? current.excerpt : '',
      body: asStringArray(current.body),
      imageAssetId: typeof current.imageAssetId === 'string' ? current.imageAssetId : '',
    };
  });
};

const readLocations = (value: unknown): SiteLocationRecord[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_LOCATIONS;
  }

  return value.map((item) => {
    const current = asObjectRecord(item);
    return {
      slug: typeof current.slug === 'string' ? current.slug : '',
      name: typeof current.name === 'string' ? current.name : '',
      district: typeof current.district === 'string' ? current.district : '',
      address: typeof current.address === 'string' ? current.address : '',
      phone: typeof current.phone === 'string' ? current.phone : '',
      workingHours: typeof current.workingHours === 'string' ? current.workingHours : '',
      mapUrl: typeof current.mapUrl === 'string' ? current.mapUrl : '',
      description: typeof current.description === 'string' ? current.description : '',
      note: typeof current.note === 'string' ? current.note : '',
      imageAssetId: typeof current.imageAssetId === 'string' ? current.imageAssetId : '',
      serviceSlugs: asStringArray(current.serviceSlugs),
      masterSlugs: asStringArray(current.masterSlugs),
      features: asStringArray(current.features),
      interiorMoments: asLocationMomentArray(current.interiorMoments)
    };
  });
};

const readPolicySections = (value: unknown): SitePolicySectionRecord[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_POLICY.sections;
  }

  return value.map((item, index) => {
    const current = asObjectRecord(item);
    return {
      id: typeof current.id === 'string' ? current.id : `policy-section-${index + 1}`,
      title: typeof current.title === 'string' ? current.title : '',
      paragraphs: asStringArray(current.paragraphs)
    };
  });
};

const readPolicy = (value: unknown): SitePolicyRecord => {
  const source = asObjectRecord(value);
  return {
    eyebrow: typeof source.eyebrow === 'string' ? source.eyebrow : DEFAULT_POLICY.eyebrow,
    title: typeof source.title === 'string' ? source.title : DEFAULT_POLICY.title,
    description: typeof source.description === 'string' ? source.description : DEFAULT_POLICY.description,
    summaryEyebrow: typeof source.summaryEyebrow === 'string' ? source.summaryEyebrow : DEFAULT_POLICY.summaryEyebrow,
    summaryTitle: typeof source.summaryTitle === 'string' ? source.summaryTitle : DEFAULT_POLICY.summaryTitle,
    operatorLabel: typeof source.operatorLabel === 'string' ? source.operatorLabel : DEFAULT_POLICY.operatorLabel,
    contactLabel: typeof source.contactLabel === 'string' ? source.contactLabel : DEFAULT_POLICY.contactLabel,
    addressLabel: typeof source.addressLabel === 'string' ? source.addressLabel : DEFAULT_POLICY.addressLabel,
    summaryNote: typeof source.summaryNote === 'string' ? source.summaryNote : DEFAULT_POLICY.summaryNote,
    contactCtaLabel: typeof source.contactCtaLabel === 'string' ? source.contactCtaLabel : DEFAULT_POLICY.contactCtaLabel,
    bookingConsentLabel: typeof source.bookingConsentLabel === 'string' ? source.bookingConsentLabel : DEFAULT_POLICY.bookingConsentLabel,
    accountConsentLabel: typeof source.accountConsentLabel === 'string' ? source.accountConsentLabel : DEFAULT_POLICY.accountConsentLabel,
    cookieBannerTitle: typeof source.cookieBannerTitle === 'string' ? source.cookieBannerTitle : DEFAULT_POLICY.cookieBannerTitle,
    cookieBannerDescription: typeof source.cookieBannerDescription === 'string' ? source.cookieBannerDescription : DEFAULT_POLICY.cookieBannerDescription,
    cookieBannerAcceptLabel: typeof source.cookieBannerAcceptLabel === 'string' ? source.cookieBannerAcceptLabel : DEFAULT_POLICY.cookieBannerAcceptLabel,
    cookieBannerNecessaryLabel: typeof source.cookieBannerNecessaryLabel === 'string' ? source.cookieBannerNecessaryLabel : DEFAULT_POLICY.cookieBannerNecessaryLabel,
    sections: readPolicySections(source.sections)
  };
};

export const createSiteCardsDraft = (extra: Record<string, unknown>): SiteCardsDraft => {
  const siteContent = asObjectRecord(extra.siteContent);

  return {
    offers: readOffers(siteContent.offers),
    news: readNews(siteContent.news),
    locations: readLocations(siteContent.locations),
    policy: readPolicy(siteContent.policy)
  };
};

export const mergeSiteCardsIntoExtra = (extra: Record<string, unknown>, draft: SiteCardsDraft): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextSiteContent = asObjectRecord(extra.siteContent);
  nextExtra.siteContent = {
    ...nextSiteContent,
    offers: draft.offers,
    news: draft.news,
    locations: draft.locations,
    policy: draft.policy
  };
  return nextExtra;
};
