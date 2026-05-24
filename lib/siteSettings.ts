import { prisma } from "./prisma";
import { getLogoImageUrl, getOpenGraphImageUrl, getOptimizedCloudinaryImageUrl } from "./cloudinaryImages";
import {
  fallbackSiteSettings,
  siteSettingKeys,
  type PublicSiteSettings,
  type SiteSettingKey,
} from "./siteSettingsConfig";

export type { PublicSiteSettings } from "./siteSettingsConfig";

const imageSettingKeys = new Set<SiteSettingKey>(["favicon", "footerLogo", "openGraphImage", "websiteLogo"]);
const logoSettingKeys = new Set<SiteSettingKey>(["footerLogo", "websiteLogo"]);
const legacyBrandPattern = /Reliant Motors/i;
const legacyBrandReplacePattern = /Reliant Motors/gi;

function normalizeSiteSettingValue(key: SiteSettingKey, value: string) {
  if (imageSettingKeys.has(key)) {
    if (logoSettingKeys.has(key)) {
      return getLogoImageUrl(value);
    }

    if (key === "openGraphImage") {
      return getOpenGraphImageUrl(value);
    }

    return getOptimizedCloudinaryImageUrl(value);
  }

  if (key === "defaultMetaTitle" && legacyBrandPattern.test(value)) {
    return fallbackSiteSettings.defaultMetaTitle;
  }

  if (key === "defaultMetaDescription" && legacyBrandPattern.test(value)) {
    return fallbackSiteSettings.defaultMetaDescription;
  }

  return value.replace(legacyBrandReplacePattern, "Recon Imports");
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
