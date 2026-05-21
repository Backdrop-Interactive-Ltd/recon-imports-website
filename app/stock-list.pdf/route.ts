import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getCarPublicUrl } from "../../lib/carPublicRoutes";
import { CarSaleStatus } from "../../lib/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { getSiteSettings } from "../../lib/siteSettings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const siteUrl = "https://reconimports.com";
const fallbackLogoText = "RECON IMPORTS";
const pageMargin = 30;
const tableLeft = 30;
const tableTop = 140;
const tableHeaderHeight = 28;
const rowHeight = 54;
const brandRowHeight = 36;
const columns = [
  { key: "serial", label: "Sl.", width: 22 },
  { key: "photo", label: "Photo", width: 55 },
  { key: "model", label: "Model", width: 105 },
  { key: "year", label: "Year", width: 38 },
  { key: "color", label: "Color", width: 52 },
  { key: "package", label: "Package", width: 76 },
  { key: "chassis", label: "Chassis Number", width: 88 },
  { key: "grade", label: "Grade", width: 52 },
  { key: "price", label: "Price", width: 47 },
] as const;
const tableWidth = columns.reduce((total, column) => total + column.width, 0);

type StockCar = Awaited<ReturnType<typeof getStockCars>>[number];
type PdfImageData = ArrayBuffer;

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN").format(price);
}

function formatUpdatedAt() {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date());
}

function formatDownloadFilename() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Dhaka",
    year: "numeric",
  }).formatToParts(new Date());
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "January";
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";

  return `Recon_Imports_Stock_List_${day}_${month}_${year}.pdf`;
}

function getCellX(index: number) {
  return tableLeft + columns.slice(0, index).reduce((total, column) => total + column.width, 0);
}

function cleanText(value: string | number | null | undefined, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toPdfImageUrl(value: string | null | undefined, assetOrigin = siteUrl, transformation = "f_jpg,q_auto") {
  const imageUrl = value?.trim();

  if (!imageUrl) return "";
  if (/\.svg($|\?)/i.test(imageUrl)) return "";

  try {
    const url = new URL(imageUrl.startsWith("/") ? `${assetOrigin}${imageUrl}` : imageUrl);

    if (url.hostname.includes("res.cloudinary.com") && url.pathname.includes("/image/upload/")) {
      const [prefix, uploadPath] = url.pathname.split("/image/upload/");
      const uploadSegments = uploadPath.split("/").filter(Boolean);
      const versionIndex = uploadSegments.findIndex((segment) => /^v\d+$/.test(segment));
      const publicIdSegments = versionIndex >= 0 ? uploadSegments.slice(versionIndex) : uploadSegments;

      url.pathname = `${prefix}/image/upload/${transformation}/${publicIdSegments.join("/")}`;
      return url.toString();
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown stock list PDF error";
}

async function fetchPdfImage(url: string, label: string) {
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.warn("[stock-list.pdf] Skipping image fetch", { label, status: response.status, url });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("jpeg") && !contentType.includes("jpg") && !contentType.includes("png")) {
      console.warn("[stock-list.pdf] Skipping unsupported image type", { contentType, label, url });
      return null;
    }

    return response.arrayBuffer();
  } catch (error) {
    console.warn("[stock-list.pdf] Skipping image after fetch error", { error: getErrorMessage(error), label, url });
    return null;
  }
}

async function getStockCars() {
  return prisma.car.findMany({
    include: {
      brand: {
        select: {
          name: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          imageUrl: true,
        },
      },
    },
    orderBy: [
      { brand: { name: "asc" } },
      { updatedAt: "desc" },
      { createdAt: "desc" },
      { year: "desc" },
    ],
    where: {
      isPublished: true,
      saleStatus: {
        not: CarSaleStatus.SOLD,
      },
    },
  });
}

function groupCarsByBrand(cars: StockCar[]) {
  const groups = new Map<string, StockCar[]>();

  cars.forEach((car) => {
    const brandName = car.brand.name || "Other";
    groups.set(brandName, [...(groups.get(brandName) ?? []), car]);
  });

  return Array.from(groups.entries()).sort(([firstBrand], [secondBrand]) => firstBrand.localeCompare(secondBrand));
}

function ensurePageSpace(doc: PDFKit.PDFDocument, currentY: number, requiredHeight: number) {
  if (currentY + requiredHeight <= doc.page.height - pageMargin) {
    return currentY;
  }

  doc.addPage();
  drawTableHeader(doc, pageMargin);
  return pageMargin + tableHeaderHeight;
}

function drawHeader(doc: PDFKit.PDFDocument, logoBuffer: PdfImageData | null) {
  if (logoBuffer) {
    try {
      doc.image(logoBuffer as unknown as Buffer, 38, 48, { fit: [130, 48] });
    } catch (error) {
      console.warn("[stock-list.pdf] Skipping logo image", { error: getErrorMessage(error) });
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111").text(fallbackLogoText, 38, 58);
    }
  }

  if (!logoBuffer) {
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111").text(fallbackLogoText, 38, 58);
  }

  doc.font("Helvetica-Bold").fontSize(22).fillColor("#000000").text("STOCK LIST", 390, 58, {
    align: "right",
    characterSpacing: 2,
    width: 165,
  });
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#333333").text(`Last updated: ${formatUpdatedAt()}`, 390, 92, {
    align: "right",
    width: 165,
  });
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.rect(tableLeft, y, tableWidth, tableHeaderHeight).fillAndStroke("#eeeeee", "#cfcfcf");
  doc.font("Helvetica-Bold").fontSize(6.4).fillColor("#000000");
  columns.forEach((column, index) => {
    const x = getCellX(index);

    if (index > 0) {
      doc.moveTo(x, y).lineTo(x, y + tableHeaderHeight).strokeColor("#d0d0d0").lineWidth(0.8).stroke();
    }

    doc.text(column.label, x + 4, y + 10, {
      align: "center",
      height: 10,
      width: column.width - 8,
    });
  });
}

function drawBrandRow(doc: PDFKit.PDFDocument, brandName: string, y: number) {
  doc.rect(tableLeft, y, tableWidth, brandRowHeight).fillAndStroke("#eeeeee", "#cfcfcf");
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(brandName.toUpperCase(), tableLeft, y + 12, {
    align: "center",
    width: tableWidth,
  });
}

async function drawCarRow(
  doc: PDFKit.PDFDocument,
  car: StockCar,
  serial: number,
  y: number,
  imageCache: Map<string, PdfImageData | null>,
  assetOrigin: string,
) {
  const rowFill = "#ffffff";
  const values = [
    String(serial),
    "",
    car.title,
    String(car.year),
    cleanText(car.exteriorColor),
    cleanText(car.packageName),
    cleanText(car.chassisNumber),
    cleanText(car.grade),
    formatPrice(car.price),
  ];

  doc.rect(tableLeft, y, tableWidth, rowHeight).fillAndStroke(rowFill, "#d3d3d3");

  for (let index = 0; index < columns.length; index += 1) {
    const x = getCellX(index);
    doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor("#d3d3d3").lineWidth(0.8).stroke();
  }
  doc.moveTo(tableLeft + tableWidth, y).lineTo(tableLeft + tableWidth, y + rowHeight).strokeColor("#d3d3d3").lineWidth(0.8).stroke();

  const photoUrl = toPdfImageUrl(car.images[0]?.imageUrl, assetOrigin, "f_jpg,q_auto,w_120,h_90,c_fill");

  if (photoUrl) {
    if (!imageCache.has(photoUrl)) {
      imageCache.set(photoUrl, await fetchPdfImage(photoUrl, `car:${car.id}`));
    }

    const imageBuffer = imageCache.get(photoUrl);

    if (imageBuffer) {
      try {
        doc.image(imageBuffer as unknown as Buffer, getCellX(1) + 10, y + 6, { fit: [35, 42] });
      } catch (error) {
        console.warn("[stock-list.pdf] Skipping car image", {
          carId: car.id,
          error: getErrorMessage(error),
          photoUrl,
        });
      }
    }
  }

  doc.font("Helvetica").fontSize(6.8).fillColor("#000000");
  values.forEach((value, index) => {
    if (index === 1) return;

    const column = columns[index];
    const x = getCellX(index) + 4;
    const textOptions = {
      height: rowHeight - 12,
      lineGap: 1,
      width: column.width - 8,
    };

    if (column.key === "serial") {
      doc.font("Helvetica-Bold").text(value, x, y + 22, {
        ...textOptions,
        align: "center",
      });
      doc.font("Helvetica");
      return;
    }

    if (column.key === "price") {
      doc.font("Helvetica-Bold").fillColor("#000000").text(value, x, y + 12, {
        ...textOptions,
        align: "center",
        height: 12,
      });
      doc.font("Helvetica-Bold").fontSize(5.8).fillColor("#0047bb").text("VIEW", x, y + 28, {
        ...textOptions,
        align: "center",
        height: 8,
        link: getCarPublicUrl({ slug: car.slug, stockType: car.stockType }),
        underline: true,
      });
      doc.font("Helvetica").fontSize(6.8).fillColor("#000000");
      return;
    }

    doc.text(value, x, y + 20, {
      ...textOptions,
      align: ["year", "color", "package", "chassis", "grade"].includes(column.key) ? "center" : "left",
    });
  });
}

async function buildPdfBuffer(cars: StockCar[], logoUrl: string, assetOrigin: string) {
  const doc = new PDFDocument({
    layout: "portrait",
    margin: pageMargin,
    size: "A4",
  });
  const chunks: Buffer[] = [];
  const imageCache = new Map<string, PdfImageData | null>();
  const logoBuffer = await fetchPdfImage(toPdfImageUrl(logoUrl, assetOrigin), "site-logo");

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  drawHeader(doc, logoBuffer);
  drawTableHeader(doc, tableTop);

  let y = tableTop + tableHeaderHeight;
  let serial = 1;
  const groupedCars = groupCarsByBrand(cars);

  if (groupedCars.length === 0) {
    doc.font("Helvetica").fontSize(12).fillColor("#555555").text("No published stock is available right now.", tableLeft, y + 24);
  }

  for (const [brandName, brandCars] of groupedCars) {
    y = ensurePageSpace(doc, y, brandRowHeight + rowHeight);
    drawBrandRow(doc, brandName, y);
    y += brandRowHeight;

    for (const car of brandCars) {
      y = ensurePageSpace(doc, y, rowHeight);
      await drawCarRow(doc, car, serial, y, imageCache, assetOrigin);
      y += rowHeight;
      serial += 1;
    }
  }

  doc.end();
  return done;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const [settings, cars] = await Promise.all([getSiteSettings(), getStockCars()]);
    const pdfBuffer = await buildPdfBuffer(cars, settings.websiteLogo || "/recon-logo.webp", requestUrl.origin);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${formatDownloadFilename()}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("[stock-list.pdf] Failed to generate stock list PDF", error);

    return Response.json(
      {
        error: "Failed to generate stock list PDF.",
        message: getErrorMessage(error),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
