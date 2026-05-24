import Link from "next/link";
import AdminPagination from "../_components/AdminPagination";
import { createPaginatedResult, getPaginationState, getStringParam } from "../_components/listParams";
import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "../../../../lib/generated/prisma/client";
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

type MediaFilters = {
  fileType?: string;
  folder?: string;
  page?: string;
  pageSize?: string;
  q?: string;
  sort?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

function getMediaWhere(filters: MediaFilters) {
  const where: Prisma.MediaWhereInput = {};
  const query = filters.q?.trim();

  if (filters.folder) {
    where.folder = filters.folder;
  }

  if (filters.fileType) {
    where.fileType = filters.fileType;
  }

  if (query) {
    where.OR = [
      { fileName: { contains: query } },
      { folder: { contains: query } },
      { fileType: { contains: query } },
    ];
  }

  return where;
}

async function getMediaItems(filters: MediaFilters) {
  const pagination = getPaginationState(filters);
  const where = getMediaWhere(filters);
  const [total, mediaItems] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.take,
      where,
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
    }),
  ]);

  return createPaginatedResult(
    mediaItems.map((item) => ({
      ...item,
      createdAtLabel: dateFormatter.format(item.createdAt),
      sizeLabel: formatBytes(item.size),
      updatedAtLabel: dateFormatter.format(item.updatedAt),
    })),
    total,
    pagination,
  );
}

async function getMediaStats() {
  const [totalFiles, sizeAggregate, folders] = await Promise.all([
    prisma.media.count(),
    prisma.media.aggregate({ _sum: { size: true } }),
    prisma.media.findMany({
      distinct: ["folder"],
      select: { folder: true },
    }),
  ]);

  return {
    folders: folders.length,
    totalFiles,
    totalSize: sizeAggregate._sum.size ?? 0,
  };
}

async function getMediaFilterOptions() {
  const [folders, fileTypes] = await Promise.all([
    prisma.media.findMany({
      distinct: ["folder"],
      orderBy: { folder: "asc" },
      select: { folder: true },
    }),
    prisma.media.findMany({
      distinct: ["fileType"],
      orderBy: { fileType: "asc" },
      select: { fileType: true },
    }),
  ]);

  return {
    fileTypes: fileTypes.map((item) => item.fileType),
    folders: folders.map((item) => item.folder),
  };
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: MediaFilters = {
    fileType: getStringParam(params.fileType),
    folder: getStringParam(params.folder),
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    q: getStringParam(params.q),
    sort: getStringParam(params.sort),
  };
  const [mediaPage, stats, filterOptions] = await Promise.all([getMediaItems(filters), getMediaStats(), getMediaFilterOptions()]);
  const mediaItems = mediaPage.items;
  const pageParams = {
    fileType: filters.fileType,
    folder: filters.folder,
    q: filters.q,
    sort: filters.sort,
  };

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
          <strong>{stats.totalFiles}</strong>
        </div>
        <div>
          <span>Folders</span>
          <strong>{stats.folders}</strong>
        </div>
        <div>
          <span>Total Size</span>
          <strong>{formatBytes(stats.totalSize)}</strong>
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
          <form className={styles.filterBar} method="get">
            <label>
              <span>Search</span>
              <input name="q" defaultValue={filters.q ?? ""} placeholder="File name, folder, type" />
            </label>
            <label>
              <span>Folder</span>
              <select name="folder" defaultValue={filters.folder ?? ""}>
                <option value="">All</option>
                {filterOptions.folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>File type</span>
              <select name="fileType" defaultValue={filters.fileType ?? ""}>
                <option value="">All</option>
                {filterOptions.fileTypes.map((fileType) => (
                  <option key={fileType} value={fileType}>
                    {fileType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select name="sort" defaultValue={filters.sort ?? ""}>
                <option value="">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
            <label>
              <span>Page size</span>
              <select name="pageSize" defaultValue={filters.pageSize || "20"}>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <button className={styles.secondaryButton} type="submit">
              Apply
            </button>
            <Link className={styles.secondaryLinkButton} href="/admin/media">
              Reset
            </Link>
          </form>

          <div className={styles.listHeader}>
            <div>
              <p>Media List</p>
              <h2>Uploaded images</h2>
            </div>
            <span>{mediaItems.length} shown of {mediaPage.total}</span>
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
              <strong>No media records found</strong>
              <p>Adjust the filters or upload a new admin image.</p>
            </div>
          )}
          <AdminPagination
            basePath="/admin/media"
            page={mediaPage.page}
            pageSize={mediaPage.pageSize}
            params={pageParams}
            total={mediaPage.total}
            totalPages={mediaPage.totalPages}
          />
        </section>
      </div>
    </section>
  );
}
