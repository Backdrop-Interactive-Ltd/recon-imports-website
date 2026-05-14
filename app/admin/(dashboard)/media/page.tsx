import { prisma } from "../../../../lib/prisma";
import styles from "../brands/page.module.css";
import MediaRowActions from "./MediaRowActions";
import MediaUploadPanel from "./MediaUploadPanel";

export const metadata = {
  title: "Media | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

async function getMediaItems() {
  const mediaItems = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      fileName: true,
      fileType: true,
      fileUrl: true,
      folder: true,
      id: true,
      size: true,
      updatedAt: true,
    },
  });

  return mediaItems.map((item) => ({
    ...item,
    createdAtLabel: dateFormatter.format(item.createdAt),
    sizeLabel: formatBytes(item.size),
    updatedAtLabel: dateFormatter.format(item.updatedAt),
  }));
}

export default async function AdminMediaPage() {
  const mediaItems = await getMediaItems();
  const totalSize = mediaItems.reduce((sum, item) => sum + item.size, 0);
  const folders = new Set(mediaItems.map((item) => item.folder)).size;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Library</p>
          <h1>Media</h1>
          <span>Upload image assets, copy image URLs, and manage media library records.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Files</span>
          <strong>{mediaItems.length}</strong>
        </div>
        <div>
          <span>Folders</span>
          <strong>{folders}</strong>
        </div>
        <div>
          <span>Total Size</span>
          <strong>{formatBytes(totalSize)}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Upload</p>
            <h2>Add image to library</h2>
          </div>
          <MediaUploadPanel />
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Media List</p>
              <h2>Uploaded images</h2>
            </div>
            <span>{mediaItems.length} total</span>
          </div>

          {mediaItems.length > 0 ? (
            <div className={styles.brandList}>
              {mediaItems.map((item) => (
                <article className={styles.brandCard} key={item.id}>
                  <div className={styles.brandTopline}>
                    <div className={styles.brandIdentity}>
                      <span className={styles.logoBox}>
                        <img alt={item.fileName} src={item.fileUrl} />
                      </span>
                      <div>
                        <h3>{item.fileName}</h3>
                        <p>{item.fileUrl}</p>
                      </div>
                    </div>
                    <span className={styles.activeBadge}>{item.folder}</span>
                  </div>

                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Type</dt>
                      <dd>{item.fileType}</dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{item.sizeLabel}</dd>
                    </div>
                    <div>
                      <dt>Uploaded</dt>
                      <dd>{item.createdAtLabel}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{item.updatedAtLabel}</dd>
                    </div>
                  </dl>

                  <div className={styles.imageGrid}>
                    <a href={item.fileUrl} target="_blank" rel="noreferrer">
                      <img alt={`${item.fileName} preview`} src={item.fileUrl} />
                    </a>
                  </div>

                  <MediaRowActions fileName={item.fileName} fileUrl={item.fileUrl} mediaId={item.id} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No media records yet</strong>
              <p>Uploaded admin images will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
