import {
  siteSettingSections,
  type SiteSettingKey,
} from "../../../../lib/siteSettingsConfig";

export { siteSettingSections };

export type SiteSettingsActionState = {
  errors?: Partial<Record<SiteSettingKey | "form", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialSiteSettingsActionState: SiteSettingsActionState = {
  message: "",
  status: "idle",
};
