import type { SitePageHeroKey } from './clientSitePageHeroes';

const SITE_VISIBILITY_KEY = 'siteVisibility';
const HIDDEN_BLOCK_KEYS_KEY = 'hiddenBlockKeys';

export const SITE_BLOCK_KEYS = {
  pageHero: (key: SitePageHeroKey) => `pageHero:${key}`,
  homePage: {
    hero: 'homePage:hero',
    categories: 'homePage:categories',
    valuePillars: 'homePage:valuePillars',
    featuredServices: 'homePage:featuredServices',
    featuredSpecialists: 'homePage:featuredSpecialists',
    contacts: 'homePage:contacts',
    highlights: 'homePage:highlights',
    bottomCta: 'homePage:bottomCta',
  },
  specialistsPage: {
    listHero: 'specialistsPage:listHero',
    listCta: 'specialistsPage:listCta',
    detailHero: 'specialistsPage:detailHero',
    detailAbout: 'specialistsPage:detailAbout',
    detailApproach: 'specialistsPage:detailApproach',
    detailServices: 'specialistsPage:detailServices',
    detailCta: 'specialistsPage:detailCta',
  },
  bookingPage: {
    connectivityNotice: 'bookingPage:connectivityNotice',
  },
  offers: {
    item: (slug: string) => `offers:item:${slug}`,
  },
  news: {
    item: (slug: string) => `news:item:${slug}`,
  },
  locations: {
    item: (slug: string) => `locations:item:${slug}`,
  },
  policy: {
    summary: 'policy:summary',
    section: (id: string) => `policy:section:${id}`,
  },
} as const;

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const normalizeHiddenBlockKeys = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).sort();
};

export const readSiteHiddenBlockKeys = (extra: Record<string, unknown>) => {
  const siteVisibility = asObjectRecord(extra[SITE_VISIBILITY_KEY]);
  return normalizeHiddenBlockKeys(siteVisibility[HIDDEN_BLOCK_KEYS_KEY]);
};

export const isSiteBlockHidden = (extra: Record<string, unknown>, blockKey: string) =>
  readSiteHiddenBlockKeys(extra).includes(blockKey);

export const toggleSiteHiddenBlockKey = (hiddenBlockKeys: string[], blockKey: string) => {
  const next = new Set(hiddenBlockKeys);

  if (next.has(blockKey)) {
    next.delete(blockKey);
  } else {
    next.add(blockKey);
  }

  return Array.from(next).sort();
};

export const mergeSiteVisibilityIntoExtra = (
  extra: Record<string, unknown>,
  hiddenBlockKeys: string[],
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const normalizedHiddenBlockKeys = normalizeHiddenBlockKeys(hiddenBlockKeys);

  if (normalizedHiddenBlockKeys.length === 0) {
    delete nextExtra[SITE_VISIBILITY_KEY];
    return nextExtra;
  }

  nextExtra[SITE_VISIBILITY_KEY] = {
    [HIDDEN_BLOCK_KEYS_KEY]: normalizedHiddenBlockKeys,
  };

  return nextExtra;
};
