export type SiteOfferRecord = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  priceNote: string;
  ctaHref: string;
};

export type SiteNewsRecord = {
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  excerpt: string;
  body: string[];
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
  serviceSlugs: string[];
  masterSlugs: string[];
  features: string[];
  interiorMoments: Array<{
    title: string;
    description: string;
  }>;
};

export type SiteCardsDraft = {
  offers: SiteOfferRecord[];
  news: SiteNewsRecord[];
  locations: SiteLocationRecord[];
};

const DEFAULT_OFFERS: SiteOfferRecord[] = [
  {
    slug: 'weekday-signature',
    title: 'Weekday Signature',
    subtitle: 'Волосы и брови в один будний визит',
    description: 'Удобный формат для тех, кто хочет освежить образ за одно посещение и не тратить лишнее время.',
    badge: '-15%',
    priceNote: 'По будням до 15:00, по предварительной записи',
    ctaHref: '/booking?offer=weekday-signature'
  },
  {
    slug: 'facial-membership',
    title: 'Facial Membership',
    subtitle: 'Серия из 4 уходов для ровного сияния кожи',
    description: 'Формат для тех, кто хочет ухаживать за кожей регулярно и видеть стабильный результат без спешки.',
    badge: '4 визита',
    priceNote: 'Персональный график и приоритет при выборе времени',
    ctaHref: '/booking?offer=facial-membership'
  },
  {
    slug: 'gift-season',
    title: 'Gift Season',
    subtitle: 'Сертификаты с дополнительным номиналом',
    description: 'При покупке сертификата от 15 000 ₽ добавляем приятный бонус к подарку.',
    badge: 'Подарок',
    priceNote: 'Можно оформить онлайн или в салоне',
    ctaHref: '/gift-cards'
  }
];

const DEFAULT_NEWS: SiteNewsRecord[] = [
  {
    slug: 'new-private-suites',
    title: 'Новые приватные кабинеты в Mari Center Residence',
    category: 'Пространство',
    publishedAt: '2026-02-18',
    excerpt: 'Во флагманском пространстве появились тихие кабинеты для длительных визитов и комплексного ухода.',
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
    serviceSlugs: ['silk-recovery', 'architect-manicure', 'spa-pedicure', 'brow-sculpt', 'laser-comfort', 'wax-ritual'],
    masterSlugs: ['sofia-levina', 'alisa-gromova', 'vera-soboleva', 'ira-melnik'],
    features: ['easy access parking', 'домашняя камерная атмосфера', 'быстрые утренние слоты'],
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
    serviceSlugs: ['signature-color', 'spa-pedicure', 'lash-lift', 'glass-skin-care', 'sculpt-lift', 'detox-wrap', 'lymphatic-touch', 'laser-comfort', 'mens-cut'],
    masterSlugs: ['elena-orlova', 'alisa-gromova', 'polina-cherkasova', 'vera-soboleva'],
    features: ['spa rhythm', 'видовые окна', 'extended-care sessions'],
    interiorMoments: [
      { title: 'Клубная приватность', description: 'Более размеренный ритм и extended appointments для комплексных визитов.' },
      { title: 'Spa-зона', description: 'Отдельный блок для body-care и восстановительных программ.' }
    ]
  }
];

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
      ctaHref: typeof current.ctaHref === 'string' ? current.ctaHref : ''
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
      body: asStringArray(current.body)
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
      serviceSlugs: asStringArray(current.serviceSlugs),
      masterSlugs: asStringArray(current.masterSlugs),
      features: asStringArray(current.features),
      interiorMoments: asLocationMomentArray(current.interiorMoments)
    };
  });
};

export const createSiteCardsDraft = (extra: Record<string, unknown>): SiteCardsDraft => {
  const siteContent = asObjectRecord(extra.siteContent);

  return {
    offers: readOffers(siteContent.offers),
    news: readNews(siteContent.news),
    locations: readLocations(siteContent.locations)
  };
};

export const mergeSiteCardsIntoExtra = (extra: Record<string, unknown>, draft: SiteCardsDraft): Record<string, unknown> => {
  const nextExtra = { ...extra };
  nextExtra.siteContent = {
    offers: draft.offers,
    news: draft.news,
    locations: draft.locations
  };
  return nextExtra;
};
