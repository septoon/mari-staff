export type SiteGalleryCatalogKey = 'exterior' | 'interior';

export type SiteGalleryPhotoRecord = {
  id: string;
  imageAssetId: string;
  alt: string;
};

export type SiteGalleryDraft = Record<SiteGalleryCatalogKey, SiteGalleryPhotoRecord[]>;

export const SITE_GALLERY_CATALOGS: Array<{
  key: SiteGalleryCatalogKey;
  title: string;
  description: string;
}> = [
  {
    key: 'exterior',
    title: 'Экстерьер',
    description: 'Фотографии фасада, входа и внешнего пространства салона.'
  },
  {
    key: 'interior',
    title: 'Интерьер',
    description: 'Фотографии залов, кабинетов, рабочих мест и деталей внутри.'
  }
];

const asObjectRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const readCatalog = (value: unknown): SiteGalleryPhotoRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record = asObjectRecord(item);
      const imageAssetId = typeof record.imageAssetId === 'string' ? record.imageAssetId : '';
      return {
        id:
          typeof record.id === 'string' && record.id.trim()
            ? record.id.trim()
            : `gallery-photo-${index + 1}`,
        imageAssetId,
        alt: typeof record.alt === 'string' ? record.alt : ''
      };
    })
    .filter((item) => item.imageAssetId);
};

export const createSiteGalleryDraft = (extra: Record<string, unknown>): SiteGalleryDraft => {
  const siteContent = asObjectRecord(extra.siteContent);
  const gallery = asObjectRecord(siteContent.gallery);

  return {
    exterior: readCatalog(gallery.exterior),
    interior: readCatalog(gallery.interior)
  };
};

export const countSiteGalleryPhotos = (extra: Record<string, unknown>) => {
  const draft = createSiteGalleryDraft(extra);
  return draft.exterior.length + draft.interior.length;
};

const normalizePhoto = (item: SiteGalleryPhotoRecord, index: number) => ({
  id: item.id.trim() || `gallery-photo-${index + 1}`,
  imageAssetId: item.imageAssetId.trim(),
  ...(item.alt.trim() ? { alt: item.alt.trim() } : {})
});

export const mergeSiteGalleryIntoExtra = (
  extra: Record<string, unknown>,
  draft: SiteGalleryDraft
): Record<string, unknown> => {
  const nextExtra = { ...extra };
  const nextSiteContent = asObjectRecord(extra.siteContent);

  nextExtra.siteContent = {
    ...nextSiteContent,
    gallery: {
      exterior: draft.exterior.map(normalizePhoto).filter((item) => item.imageAssetId),
      interior: draft.interior.map(normalizePhoto).filter((item) => item.imageAssetId)
    }
  };

  return nextExtra;
};
