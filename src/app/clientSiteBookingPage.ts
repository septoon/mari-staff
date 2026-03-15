type BookingPageStringMap = Record<string, string>;

export type SiteBookingPageDraft = {
  heroActions: {
    phoneLabel: string;
    servicesLabel: string;
    contactsLabel: string;
  };
  connectivityNotice: {
    title: string;
    description: string;
  };
  panel: {
    eyebrow: string;
    availabilityBadge: string;
    title: string;
    description: string;
    cartEyebrow: string;
    cartDescription: string;
    showCatalogLabel: string;
    hideCatalogLabel: string;
    cartListLabel: string;
    cartSummaryLabel: string;
    searchPlaceholder: string;
    allCategoryLabel: string;
    emptyCartMessage: string;
    emptyCatalogMessage: string;
    emptySearchMessage: string;
    resultsHintTemplate: string;
  };
  schedule: {
    title: string;
    description: string;
    daysAheadLabel: string;
    emptySelectionMessage: string;
    masterLabel: string;
    anyMasterLabel: string;
    manualDateLabel: string;
    dateHintEmpty: string;
    dateHintLoading: string;
    dateHintFirstSlotTemplate: string;
    dateHintSlotsTemplate: string;
    dateHintNoSlots: string;
    slotsTitle: string;
    slotsDescription: string;
    slotsEmptyServices: string;
    slotsEmptyResults: string;
    noWindowsLabel: string;
  };
  confirmation: {
    eyebrow: string;
    title: string;
    authenticatedDescriptionTemplate: string;
    guestDescription: string;
    loginCalloutDescription: string;
    loginButtonLabel: string;
    registerButtonLabel: string;
    profileLabel: string;
    discountDescriptionTemplate: string;
    promoLabel: string;
    promoPlaceholder: string;
    commentLabel: string;
    commentPlaceholder: string;
    summaryTitle: string;
    summaryServicesLabel: string;
    summaryTimeLabel: string;
    summaryPriceLabel: string;
    summaryServicesEmpty: string;
    summarySlotEmpty: string;
    discountSummaryTemplate: string;
    basePriceTemplate: string;
    promoPriorityNotice: string;
    successTitle: string;
    submitLabel: string;
    submitLoadingLabel: string;
    loginForBookingLabel: string;
  };
};

export const SITE_BOOKING_PAGE_DEFAULTS: SiteBookingPageDraft = {
  heroActions: {
    phoneLabel: 'Позвонить',
    servicesLabel: 'Смотреть услуги',
    contactsLabel: 'Контакты'
  },
  connectivityNotice: {
    title: 'Часть данных временно обновляется медленнее обычного.',
    description: 'Если не нашли нужную услугу или время, позвоните нам и мы поможем подобрать визит.'
  },
  panel: {
    eyebrow: 'Онлайн-запись',
    availabilityBadge: 'Свободное время онлайн',
    title: 'Соберите визит без хаоса.',
    description:
      'Добавьте услуги, выберите мастера и слот, затем подтвердите запись. Вся форма теперь работает как единый поток и не разваливается на мобильных и широких экранах.',
    cartEyebrow: 'Корзина услуг',
    cartDescription:
      'Выбирайте услуги в каталоге ниже. Корзина, длительность и итоговая стоимость обновляются сразу.',
    showCatalogLabel: 'Показать каталог',
    hideCatalogLabel: 'Скрыть каталог',
    cartListLabel: 'В корзине',
    cartSummaryLabel: 'Сводка корзины',
    searchPlaceholder: 'Поиск услуги',
    allCategoryLabel: 'Все',
    emptyCartMessage: 'Корзина пока пустая. Добавьте одну или несколько услуг ниже.',
    emptyCatalogMessage: 'Список услуг обновляется. Если нужен быстрый подбор, позвоните нам.',
    emptySearchMessage: 'По текущему фильтру услуги не найдены.',
    resultsHintTemplate:
      'Показаны первые {visible} услуг из {total}. Уточните поиск или категорию.'
  },
  schedule: {
    title: 'Когда и к кому',
    description: 'Выберите дату из ближайших двух недель или укажите ее вручную.',
    daysAheadLabel: '14 дней вперед',
    emptySelectionMessage: 'Сначала добавьте услуги, затем выберите дату и мастера.',
    masterLabel: 'Мастер',
    anyMasterLabel: 'Любой доступный мастер',
    manualDateLabel: 'Выбрать дату вручную',
    dateHintEmpty: 'Сначала выберите услуги',
    dateHintLoading: 'Проверяем доступность',
    dateHintFirstSlotTemplate: 'Первое окно с {time}',
    dateHintSlotsTemplate: 'Окон: {count}',
    dateHintNoSlots: 'Свободных окон на этот день нет',
    slotsTitle: 'Свободное время',
    slotsDescription:
      'Показываем только слоты, подходящие под состав услуг и выбранную дату.',
    slotsEmptyServices: 'Сначала добавьте услуги в корзину.',
    slotsEmptyResults: 'На выбранную дату свободных окон пока нет.',
    noWindowsLabel: 'Нет окон'
  },
  confirmation: {
    eyebrow: 'Подтверждение',
    title: 'Подтверждение визита.',
    authenticatedDescriptionTemplate: 'Записываем как {client}.',
    guestDescription: 'Чтобы завершить запись, сначала войдите в личный кабинет.',
    loginCalloutDescription:
      'Чтобы подтвердить выбранные услуги и время, войдите в личный кабинет или создайте его за пару минут.',
    loginButtonLabel: 'Войти',
    registerButtonLabel: 'Создать кабинет',
    profileLabel: 'Ваш профиль',
    discountDescriptionTemplate:
      'Ваша постоянная скидка: {discount}%. Она применяется автоматически, пока вы не используете промокод.',
    promoLabel: 'Промокод',
    promoPlaceholder: 'Если есть',
    commentLabel: 'Комментарий',
    commentPlaceholder: 'Например: удобно после 18:00',
    summaryTitle: 'Итог',
    summaryServicesLabel: 'Услуги',
    summaryTimeLabel: 'Время',
    summaryPriceLabel: 'К оплате',
    summaryServicesEmpty: 'Услуги пока не выбраны',
    summarySlotEmpty: 'Слот пока не выбран',
    discountSummaryTemplate: 'Постоянная скидка: -{discount}%',
    basePriceTemplate: 'Без скидки: {price}',
    promoPriorityNotice: 'Если промокод сработает, он заменит постоянную скидку.',
    successTitle: 'Запись создана.',
    submitLabel: 'Подтвердить запись',
    submitLoadingLabel: 'Создаю запись...',
    loginForBookingLabel: 'Войти для записи'
  }
};

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const mergeStringSection = <T extends BookingPageStringMap>(defaults: T, source: unknown): T => {
  const sourceRecord = asObjectRecord(source);
  const next = { ...defaults };

  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = sourceRecord[String(key)];
    if (typeof value === 'string' && value.trim()) {
      next[key] = value as T[keyof T];
    }
  }

  return next;
};

const readConfiguredSection = <T extends BookingPageStringMap>(
  defaults: T,
  source: unknown
): Partial<T> => {
  const sourceRecord = asObjectRecord(source);
  const result: Partial<T> = {};

  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = sourceRecord[String(key)];
    if (typeof value === 'string' && value.trim()) {
      result[key] = value as T[keyof T];
    }
  }

  return result;
};

export const applyBookingPageTemplate = (
  template: string,
  variables: Record<string, string | number | null | undefined>
) =>
  template
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token: string) => {
      const value = variables[token];
      return value === null || value === undefined ? '' : String(value);
    })
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const createSiteBookingPageDraft = (extra: Record<string, unknown>): SiteBookingPageDraft => {
  const source = asObjectRecord(extra.bookingPage);

  return {
    heroActions: mergeStringSection(SITE_BOOKING_PAGE_DEFAULTS.heroActions, source.heroActions),
    connectivityNotice: mergeStringSection(
      SITE_BOOKING_PAGE_DEFAULTS.connectivityNotice,
      source.connectivityNotice
    ),
    panel: mergeStringSection(SITE_BOOKING_PAGE_DEFAULTS.panel, source.panel),
    schedule: mergeStringSection(SITE_BOOKING_PAGE_DEFAULTS.schedule, source.schedule),
    confirmation: mergeStringSection(SITE_BOOKING_PAGE_DEFAULTS.confirmation, source.confirmation)
  };
};

export const extractSiteBookingPageConfig = (extra: Record<string, unknown>) => {
  const source = asObjectRecord(extra.bookingPage);

  return {
    heroActions: readConfiguredSection(SITE_BOOKING_PAGE_DEFAULTS.heroActions, source.heroActions),
    connectivityNotice: readConfiguredSection(
      SITE_BOOKING_PAGE_DEFAULTS.connectivityNotice,
      source.connectivityNotice
    ),
    panel: readConfiguredSection(SITE_BOOKING_PAGE_DEFAULTS.panel, source.panel),
    schedule: readConfiguredSection(SITE_BOOKING_PAGE_DEFAULTS.schedule, source.schedule),
    confirmation: readConfiguredSection(
      SITE_BOOKING_PAGE_DEFAULTS.confirmation,
      source.confirmation
    )
  };
};

export const countConfiguredSiteBookingPageSections = (extra: Record<string, unknown>) => {
  const config = extractSiteBookingPageConfig(extra);
  return Object.values(config).filter((section) => Object.keys(section).length > 0).length;
};

export const mergeSiteBookingPageIntoExtra = (
  extra: Record<string, unknown>,
  draft: SiteBookingPageDraft
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextBookingPage: Record<string, Record<string, string>> = {};

  (
    Object.keys(SITE_BOOKING_PAGE_DEFAULTS) as Array<keyof SiteBookingPageDraft>
  ).forEach((sectionKey) => {
    const sectionDraft = draft[sectionKey];
    const nextSection: Record<string, string> = {};

    Object.entries(sectionDraft).forEach(([fieldKey, value]) => {
      if (value.trim()) {
        nextSection[fieldKey] = value.trim();
      }
    });

    if (Object.keys(nextSection).length > 0) {
      nextBookingPage[sectionKey] = nextSection;
    }
  });

  if (Object.keys(nextBookingPage).length > 0) {
    nextExtra.bookingPage = nextBookingPage;
  } else {
    delete nextExtra.bookingPage;
  }

  return nextExtra;
};
