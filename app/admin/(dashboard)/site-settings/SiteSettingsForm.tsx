"use client";

import { useActionState, useState } from "react";
import AdminImageUpload from "../_components/AdminImageUpload";
import { updateSiteSettingsAction } from "./actions";
import styles from "./page.module.css";
import {
  initialSiteSettingsActionState,
  siteSettingSections,
} from "./formOptions";
import type { PublicSiteSettings, SiteSettingKey } from "../../../../lib/siteSettingsConfig";

type SiteSettingsFormProps = {
  settings: PublicSiteSettings;
};

export default function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettingsAction, initialSiteSettingsActionState);
  const [imageValues, setImageValues] = useState({
    favicon: settings.favicon,
    footerLogo: settings.footerLogo,
    openGraphImage: settings.openGraphImage,
    websiteLogo: settings.websiteLogo,
  });

  function updateImageValue(key: keyof typeof imageValues, value: string) {
    setImageValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <form action={formAction} className={styles.settingsForm}>
      {siteSettingSections.map((section) => (
        <section className={styles.formSection} key={section.title}>
          <div className={styles.sectionHeader}>
            <h2>{section.title}</h2>
          </div>

          <div className={styles.fieldGrid}>
            {section.fields.map((field) => {
              const fieldError = state.errors?.[field.key as SiteSettingKey];

              if (field.input === "image") {
                return (
                  <div className={styles.fullWidth} key={field.key}>
                    <AdminImageUpload
                      error={fieldError}
                      folder="media"
                      label={field.label}
                      name={field.key}
                      onChange={(value) => updateImageValue(field.key as keyof typeof imageValues, value)}
                      value={imageValues[field.key as keyof typeof imageValues]}
                    />
                  </div>
                );
              }

              return (
                <label
                  className={field.input === "textarea" ? `${styles.field} ${styles.fullWidth}` : styles.field}
                  key={field.key}
                >
                  <span>{field.label}</span>
                  {field.input === "textarea" ? (
                    <textarea name={field.key} placeholder={field.placeholder} defaultValue={settings[field.key]} />
                  ) : (
                    <input
                      defaultValue={settings[field.key]}
                      name={field.key}
                      placeholder={field.placeholder}
                      type={field.input}
                    />
                  )}
                  {fieldError ? <small>{fieldError}</small> : null}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {state.errors?.form ? <p className={styles.formError}>{state.errors.form}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save Site Settings"}
      </button>
    </form>
  );
}
