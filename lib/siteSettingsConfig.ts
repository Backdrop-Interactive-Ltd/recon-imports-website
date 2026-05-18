export type SiteSettingValueType = "STRING" | "TEXT" | "URL" | "IMAGE_URL";

export type SiteSettingKey =
  | "siteName"
  | "siteTagline"
  | "footerCopyrightText"
  | "homepagePurposeSectionTitle"
  | "phoneNumber"
  | "whatsappNumber"
  | "email"
  | "address"
  | "googleMapsUrl"
  | "bkashPaymentNumber"
  | "nagadPaymentNumber"
  | "rocketPaymentNumber"
  | "bankTransferAccount"
  | "facebookUrl"
  | "instagramUrl"
  | "youtubeUrl"
  | "tiktokUrl"
  | "linkedinUrl"
  | "websiteLogo"
  | "favicon"
  | "footerLogo"
  | "defaultMetaTitle"
  | "defaultMetaDescription"
  | "openGraphImage"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor";

export type PublicSiteSettings = Record<SiteSettingKey, string>;

export type SiteSettingField = {
  help?: string;
  input: "color" | "email" | "image" | "tel" | "text" | "textarea" | "url";
  key: SiteSettingKey;
  label: string;
  maxLength: number;
  placeholder?: string;
  type: SiteSettingValueType;
};

export type SiteSettingSection = {
  fields: SiteSettingField[];
  title: string;
};

export const fallbackSiteSettings: PublicSiteSettings = {
  accentColor: "#25d366",
  address: "",
  bankTransferAccount: "",
  bkashPaymentNumber: "",
  defaultMetaDescription: "Reconditioned and pre-owned vehicle showroom website.",
  defaultMetaTitle: "Recon Imports",
  email: "",
  facebookUrl: "https://www.facebook.com/",
  favicon: "/favicon.ico",
  footerCopyrightText: "© 2026 Recon Imports. All Rights Reserved by @Backdrop Interactive",
  footerLogo: "",
  googleMapsUrl: "",
  homepagePurposeSectionTitle: "Explore vehicles that suit your purpose",
  instagramUrl: "https://www.instagram.com/",
  linkedinUrl: "",
  nagadPaymentNumber: "",
  openGraphImage: "",
  phoneNumber: "+880 1886-589009",
  primaryColor: "#ad1b28",
  rocketPaymentNumber: "",
  secondaryColor: "#111111",
  siteName: "Recon Imports",
  siteTagline: "Reconditioned and pre-owned vehicle showroom website.",
  tiktokUrl: "",
  websiteLogo: "/recon-logo.webp",
  whatsappNumber: "8801886589009",
  youtubeUrl: "https://www.youtube.com/",
};

export const siteSettingSections: SiteSettingSection[] = [
  {
    title: "General",
    fields: [
      { input: "text", key: "siteName", label: "Site name", maxLength: 120, type: "STRING" },
      { input: "text", key: "siteTagline", label: "Site tagline", maxLength: 180, type: "STRING" },
      { input: "textarea", key: "footerCopyrightText", label: "Footer copyright text", maxLength: 240, type: "TEXT" },
    ],
  },
  {
    title: "Homepage",
    fields: [
      {
        input: "text",
        key: "homepagePurposeSectionTitle",
        label: "Purpose section title",
        maxLength: 140,
        type: "STRING",
      },
    ],
  },
  {
    title: "Contact",
    fields: [
      { input: "tel", key: "phoneNumber", label: "Phone number", maxLength: 40, type: "STRING" },
      { input: "tel", key: "whatsappNumber", label: "WhatsApp number", maxLength: 40, type: "STRING" },
      { input: "email", key: "email", label: "Email", maxLength: 120, type: "STRING" },
      { input: "textarea", key: "address", label: "Address", maxLength: 260, type: "TEXT" },
      { input: "url", key: "googleMapsUrl", label: "Google Maps URL", maxLength: 500, type: "URL" },
    ],
  },
  {
    title: "Payment",
    fields: [
      { input: "tel", key: "bkashPaymentNumber", label: "bKash payment number", maxLength: 80, type: "STRING" },
      { input: "tel", key: "nagadPaymentNumber", label: "Nagad payment number", maxLength: 80, type: "STRING" },
      { input: "tel", key: "rocketPaymentNumber", label: "Rocket payment number", maxLength: 80, type: "STRING" },
      { input: "textarea", key: "bankTransferAccount", label: "Bank transfer account", maxLength: 260, type: "TEXT" },
    ],
  },
  {
    title: "Social Links",
    fields: [
      { input: "url", key: "facebookUrl", label: "Facebook", maxLength: 500, type: "URL" },
      { input: "url", key: "instagramUrl", label: "Instagram", maxLength: 500, type: "URL" },
      { input: "url", key: "youtubeUrl", label: "YouTube", maxLength: 500, type: "URL" },
      { input: "url", key: "tiktokUrl", label: "TikTok", maxLength: 500, type: "URL" },
      { input: "url", key: "linkedinUrl", label: "LinkedIn", maxLength: 500, type: "URL" },
    ],
  },
  {
    title: "Branding",
    fields: [
      { input: "image", key: "websiteLogo", label: "Website logo", maxLength: 500, type: "IMAGE_URL" },
      { input: "image", key: "favicon", label: "Favicon", maxLength: 500, type: "IMAGE_URL" },
      { input: "image", key: "footerLogo", label: "Footer logo", maxLength: 500, type: "IMAGE_URL" },
    ],
  },
  {
    title: "SEO",
    fields: [
      { input: "text", key: "defaultMetaTitle", label: "Default meta title", maxLength: 120, type: "STRING" },
      { input: "textarea", key: "defaultMetaDescription", label: "Default meta description", maxLength: 260, type: "TEXT" },
      { input: "image", key: "openGraphImage", label: "Open Graph image", maxLength: 500, type: "IMAGE_URL" },
    ],
  },
  {
    title: "Theme",
    fields: [
      { input: "color", key: "primaryColor", label: "Primary color", maxLength: 20, type: "STRING" },
      { input: "color", key: "secondaryColor", label: "Secondary color", maxLength: 20, type: "STRING" },
      { input: "color", key: "accentColor", label: "Accent color", maxLength: 20, type: "STRING" },
    ],
  },
];

export const siteSettingFields = siteSettingSections.flatMap((section) => section.fields);
export const siteSettingKeys = siteSettingFields.map((field) => field.key);
