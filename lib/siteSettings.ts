import { prisma } from "./prisma";
import { getOptimizedCloudinaryImageUrl } from "./cloudinaryImages";
import {
  fallbackSiteSettings,
  siteSettingKeys,
  type PublicSiteSettings,
  type SiteSettingKey,
} from "./siteSettingsConfig";

export type { PublicSiteSettings } from "./siteSettingsConfig";

const imageSettingKeys = new Set<SiteSettingKey>(["favicon", "footerLogo", "openGraphImage", "websiteLogo"]);

function normalizeSiteSettingValue(key: SiteSettingKey, value: string) {
  if (imageSettingKeys.has(key)) {
    return getOptimizedCloudinaryImageUrl(value);
  }

  return value;
}

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const rows = await prisma.siteSetting.findMany({
      select: {
        key: true,
        value: true,
      },
      where: {
        key: {
          in: siteSettingKeys,
        },
      },
    });

    const settings = { ...fallbackSiteSettings };

    for (const row of rows) {
      if (siteSettingKeys.includes(row.key as SiteSettingKey)) {
        const key = row.key as SiteSettingKey;
        settings[key] = normalizeSiteSettingValue(key, row.value);
      }
    }

    return settings;
  } catch (error) {
    console.error("Failed to load site settings from database.", error);
    return fallbackSiteSettings;
  }
}

export function getPhoneHref(phoneNumber: string) {
  const compactPhone = phoneNumber.replace(/[^\d+]/g, "");
  return compactPhone ? `tel:${compactPhone}` : "";
}

export function getWhatsAppHref(whatsappNumber: string) {
  const compactNumber = whatsappNumber.replace(/[^\d]/g, "");
  return compactNumber ? `https://wa.me/${compactNumber}` : "";
}
