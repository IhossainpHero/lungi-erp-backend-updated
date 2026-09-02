// src/controllers/collection.controller.ts

import Collection from "@models/Collection.model";
import Party from "@models/Party.model";
import Service from "@models/Service.model";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { createCollectionSchema } from "@validators/index";
import { format } from "date-fns";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { emitDataChanged } from "../socket";

// ============================================================
// FONT CONFIG
// ============================================================

const FONT_REGULAR_PATH = path.join(
  process.cwd(),
  "src/assets/fonts/NotoSansBengali-Regular.ttf",
);

const FONT_BOLD_PATH = path.join(
  process.cwd(),
  "src/assets/fonts/NotoSansBengali-Bold.ttf",
);

// ফন্ট ফাইলগুলো base64 করে memory-তে রাখা হচ্ছে
const FONT_REGULAR_BASE64 = fs
  .readFileSync(FONT_REGULAR_PATH)
  .toString("base64");

const FONT_BOLD_BASE64 = fs.readFileSync(FONT_BOLD_PATH).toString("base64");

// ============================================================
// HTML ESCAPE
// ============================================================

const escapeHtml = (val: unknown): string =>
  String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ============================================================
// GET /api/collections
// ============================================================

export const getCollections = asyncHandler(
  async (req: Request, res: Response) => {
    const { partyId, from, to, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};

    if (partyId) {
      filter.partyId = partyId;
    }

    if (from || to) {
      filter.collectionDate = {};

      if (from) {
        filter.collectionDate.$gte = new Date(String(from));
      }

      if (to) {
        filter.collectionDate.$lte = new Date(String(to));
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [collections, total] = await Promise.all([
      Collection.find(filter)
        .populate("partyId", "name")
        .populate("deleteRequestedBy", "name")
        .sort({
          collectionDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(Number(limit)),

      Collection.countDocuments(filter),
    ]);

    res.json(
      new ApiResponse(
        200,
        {
          collections,
          total,
          page: Number(page),
          limit: Number(limit),
        },
        "সফল",
      ),
    );
  },
);

// ============================================================
// GET /api/collections/:id
// ============================================================

export const getCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const collection = await Collection.findById(req.params.id)
      .populate("partyId", "name phone")
      .populate("createdBy", "name");

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    res.json(new ApiResponse(200, collection, "সফল"));
  },
);

// ============================================================
// POST /api/collections
// ============================================================

export const createCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const body = createCollectionSchema.parse(req.body);

    const hatName = req.body.hatName as string | undefined;

    const party = await Party.findById(body.partyId);

    if (!party) {
      throw new ApiError(404, "পার্টি পাওয়া যায়নি");
    }

    const lineItems = await Promise.all(
      body.lineItems.map(async (item) => {
        const service = await Service.findOne({
          serviceId: item.serviceId,
          isActive: true,
        });

        if (!service) {
          throw new ApiError(400, `সার্ভিস পাওয়া যায়নি: ${item.serviceId}`);
        }

        if (service.category === "tana" && service.location === "dhaka") {
          throw new ApiError(400, "টানা সার্ভিস ঢাকায় হয় না");
        }

        const ratePerThan =
          item.rate != null && item.rate > 0 ? item.rate : service.ratePerThan;

        return {
          serviceId: service.serviceId,
          serviceName: service.label,
          quantity: item.quantity,
          foldingNumber: item.foldingNumber ?? 0,
          ratePerThan,
          amount: item.quantity * ratePerThan,
        };
      }),
    );

    const collection = await Collection.create({
      partyId: body.partyId,
      hatName,
      collectionDate: new Date(String(body.collectionDate)),
      lineItems,
      totalThan: 0,
      totalAmount: 0,
      notes: body.notes,
      createdBy: req.user!._id,
    });

    emitDataChanged("collections", "create");

    res
      .status(201)
      .json(new ApiResponse(201, collection, "কালেকশন এন্ট্রি সফল"));
  },
);

// ============================================================
// PUT /api/collections/:id
// admin/moderator
// ============================================================

export const updateCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const { collectionDate, hatName, lineItems, notes } = req.body;

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    if (collectionDate) {
      collection.collectionDate = new Date(collectionDate);
    }

    if (hatName !== undefined) {
      collection.hatName = hatName;
    }

    if (notes !== undefined) {
      collection.notes = notes;
    }

    if (lineItems && lineItems.length > 0) {
      const updatedItems = await Promise.all(
        lineItems.map(async (item: any) => {
          const service = await Service.findOne({
            serviceId: item.serviceId,
            isActive: true,
          });

          if (!service) {
            throw new ApiError(400, `সার্ভিস পাওয়া যায়নি: ${item.serviceId}`);
          }

          const ratePerThan = item.rate > 0 ? item.rate : service.ratePerThan;

          return {
            serviceId: service.serviceId,
            serviceName: service.label,
            quantity: item.quantity,
            foldingNumber: item.foldingNumber ?? 0,
            ratePerThan,
            amount: item.quantity * ratePerThan,
          };
        }),
      );

      collection.lineItems = updatedItems;
    }

    await collection.save();

    emitDataChanged("collections", "update");

    res.json(new ApiResponse(200, collection, "আপডেট সফল"));
  },
);

// ============================================================
// DELETE /api/collections/:id
// admin only
// ============================================================

export const deleteCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const collection = await Collection.findByIdAndDelete(req.params.id);

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    emitDataChanged("collections", "delete");

    res.json(new ApiResponse(200, null, "কালেকশন মুছে ফেলা হয়েছে"));
  },
);

// ============================================================
// POST /api/collections/:id/request-delete
// ============================================================

export const requestCollectionDelete = asyncHandler(
  async (req: Request, res: Response) => {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    if (collection.deleteRequested) {
      throw new ApiError(400, "ইতিমধ্যে ডিলিট রিকোয়েস্ট পাঠানো হয়েছে");
    }

    collection.deleteRequested = true;

    collection.deleteRequestedBy = req.user!._id;

    collection.deleteRequestedAt = new Date();

    await collection.save();

    emitDataChanged("collections", "update");

    res.json(
      new ApiResponse(
        200,
        collection,
        "ডিলিট রিকোয়েস্ট পাঠানো হয়েছে — অ্যাডমিন অনুমোদনের অপেক্ষায়",
      ),
    );
  },
);

// ============================================================
// GET /api/collections/delete-requests
// ============================================================

export const getCollectionDeleteRequests = asyncHandler(
  async (_req: Request, res: Response) => {
    const collections = await Collection.find({
      deleteRequested: true,
    })
      .populate("partyId", "name")
      .populate("deleteRequestedBy", "name")
      .sort({
        deleteRequestedAt: -1,
      });

    res.json(new ApiResponse(200, collections, "সফল"));
  },
);

// ============================================================
// PATCH /api/collections/:id/delete-request
// ============================================================

export const resolveCollectionDeleteRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      throw new ApiError(400, "action must be approve or reject");
    }

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    if (!collection.deleteRequested) {
      throw new ApiError(400, "কোনো pending রিকোয়েস্ট নেই");
    }

    // ----------------------------------------
    // APPROVE
    // ----------------------------------------

    if (action === "approve") {
      await collection.deleteOne();

      emitDataChanged("collections", "delete");

      return res.json(new ApiResponse(200, null, "কালেকশন মুছে ফেলা হয়েছে"));
    }

    // ----------------------------------------
    // REJECT
    // ----------------------------------------

    collection.deleteRequested = false;

    collection.deleteRequestedBy = null;

    collection.deleteRequestedAt = null;

    await collection.save();

    emitDataChanged("collections", "delete");

    res.json(
      new ApiResponse(
        200,
        collection,
        "ডিলিট রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে",
      ),
    );
  },
);

// ============================================================
// GET /api/collections/:id/bill
// PDF BILL GENERATION
// ============================================================

export const generateCollectionBill = asyncHandler(
  async (req: Request, res: Response) => {
    // ----------------------------------------
    // GET COLLECTION
    // ----------------------------------------

    const collection = await Collection.findById(req.params.id).populate(
      "partyId",
      "name phone address",
    );

    if (!collection) {
      throw new ApiError(404, "কালেকশন পাওয়া যায়নি");
    }

    const party = collection.partyId as any;

    // ----------------------------------------
    // TABLE ROWS
    // ----------------------------------------

    const rowsHtml = collection.lineItems
      .map(
        (item) => `
              <tr>
                <td class="desc">
                  ${escapeHtml(item.serviceName)}
                  — ${item.quantity} থান
                </td>

                <td class="num">
                  ${item.quantity}
                </td>

                <td class="num">
                  ${item.foldingNumber ?? 0}
                </td>

                <td class="num">
                  ${item.ratePerThan.toLocaleString()}
                </td>

                <td class="num">
                  ${item.amount.toLocaleString()}
                </td>
              </tr>
            `,
      )
      .join("");

    // ----------------------------------------
    // HTML
    // ----------------------------------------

    const html = `
<!DOCTYPE html>

<html lang="bn">

<head>

<meta charset="UTF-8" />

<style>

@font-face {
  font-family: "NotoBengali";

  src:
    url(data:font/ttf;base64,${FONT_REGULAR_BASE64})
    format("truetype");

  font-weight: normal;
}

@font-face {
  font-family: "NotoBengali";

  src:
    url(data:font/ttf;base64,${FONT_BOLD_BASE64})
    format("truetype");

  font-weight: bold;
}

* {
  box-sizing: border-box;
}

body {
  font-family: "NotoBengali", sans-serif;

  margin: 0;
  padding: 0;

  color: #000;

  font-size: 10px;
}

.center {
  text-align: center;
}

.right {
  text-align: right;
}

.content {
  padding: 14px 20px 24px;
}

hr {
  border: none;

  border-top: 1px solid #000;

  margin: 10px 0;
}

.info-row {
  display: flex;

  justify-content: space-between;

  margin-bottom: 2px;
}

.ledger-desc {
  font-size: 8.5px;

  color: #555;

  margin: 6px 0;
}

table {
  width: 100%;

  border-collapse: collapse;

  margin-top: 6px;
}

th,
td {
  padding: 4px 2px;

  font-size: 10px;
}

th {
  border-bottom: 1px solid #000;

  text-align: left;
}

th.num,
td.num {
  text-align: right;
}

tbody tr:last-child td,
.total-row td {
  border-top: 1px solid #000;

  font-weight: bold;
}

.signatures {
  display: flex;

  justify-content: space-between;

  margin-top: 60px;

  font-size: 9px;
}

/* ========================================
   CASH MEMO HEADER
======================================== */

.bill-header {
  position: relative;

  overflow: hidden;

  padding: 20px 20px 10px 90px;

  min-height: 78px;

  background:
    linear-gradient(
      115deg,
      #fef3a3 0%,
      #fef3a3 22%,

      #f6d98a 22%,
      #f6d98a 32%,

      #f3c9b8 32%,
      #f3c9b8 48%,

      #d8f0c9 48%,
      #d8f0c9 65%,

      #fce8f3 65%,
      #fce8f3 100%
    );

  border-bottom: 2px solid #333;
}

.badge {
  position: absolute;

  top: 12px;
  left: 12px;

  width: 62px;
  height: 62px;

  border-radius: 50%;

  background: #1b2a4a;

  color: #fff;

  display: flex;

  align-items: center;

  justify-content: center;

  font-weight: bold;

  font-size: 16px;

  font-family: Arial, sans-serif;

  letter-spacing: 0.5px;

  border: 2.5px solid #fff;

  box-shadow:
    0 2px 3px rgba(0,0,0,0.35);

  transform: rotate(-8deg);
}

.cashmemo-tag {
  text-align: center;

  font-size: 9px;

  font-weight: bold;

  letter-spacing: 1.5px;

  color: #1a1a1a;

  margin: 5px;
}

.shopname {
  text-align: center;

  font-weight: bold;

  font-size: 26px;

  color: #e0201a;

  -webkit-text-stroke: 0.8px white;

  text-shadow:
    1px 1px 0 #1b3a63,
    -1px -1px 0 #1b3a63,
    1px -1px 0 #1b3a63,
    -1px 1px 0 #1b3a63,
    2px 3px 3px rgba(0,0,0,0.3);

  line-height: 1.1;

  margin-top: -2px;
}

.addrbar {
  background: #0f7a3d;

  color: #fff;

  font-size: 9px;

  font-weight: bold;

  padding: 4px 10px;

  display: flex;

  align-items: center;

  gap: 6px;
}

.sq {
  width: 7px;

  height: 7px;

  display: inline-block;
}

.sq.red {
  background: #e0201a;
}

.sq.blue {
  background: #1b3a9e;
}

.sq.yellow {
  background: #f2c400;
}

</style>

</head>

<body>

  <!-- =====================================
       HEADER
  ====================================== -->

  <div class="bill-header">

    <div class="badge">
      N
      <sup style="font-size:9px;">
        PC
      </sup>
    </div>

    <div class="cashmemo-tag">
      ক্যাশ মেমো
    </div>

    <div class="shopname">
      নজরুল প্রসেসিং সেন্টার
    </div>

  </div>

  <!-- =====================================
       ADDRESS BAR
  ====================================== -->

  <div class="addrbar">

    <span class="sq red"></span>

    <span class="sq blue"></span>

    <span class="sq yellow"></span>

    ঢাকা | ফোনঃ ০১৭১৫-৩২৫১৯৩

  </div>

  <!-- =====================================
       CONTENT
  ====================================== -->

  <div class="content">

    <div class="info-row">

      <div>

        <div>
          পার্টিঃ
          ${escapeHtml(party?.name) || "-"}
        </div>

        ${
          party?.phone
            ? `
              <div>
                ফোনঃ
                ${escapeHtml(party.phone)}
              </div>
            `
            : ""
        }

        ${
          party?.address
            ? `
              <div>
                ঠিকানাঃ
                ${escapeHtml(party.address)}
              </div>
            `
            : ""
        }

      </div>

      <div class="right">

        <div>
          তারিখঃ
          ${format(new Date(collection.collectionDate), "dd/MM/yyyy")}
        </div>

        <div>
          রেফঃ
          ${String(collection._id).slice(-6).toUpperCase()}
        </div>

      </div>

    </div>

    <hr />

    <p class="ledger-desc">

      কালেকশন —

      ${collection.lineItems
        .map((l) => `${escapeHtml(l.serviceName)} ${l.quantity} থান`)
        .join(", ")}

    </p>

    <hr />

    <!-- =====================================
         TABLE
    ====================================== -->

    <table>

      <thead>

        <tr>

          <th>
            বিবরণ
          </th>

          <th class="num">
            থান
          </th>

          <th class="num">
            ভাঁজ
          </th>

          <th class="num">
            দর
          </th>

          <th class="num">
            টাকা
          </th>

        </tr>

      </thead>

      <tbody>

        ${rowsHtml}

        <tr class="total-row">

          <td></td>

          <td class="num">
            ${collection.totalThan}
          </td>

          <td class="num">
            ${collection.totalFolding ?? 0}
          </td>

          <td class="num">
            মোট
          </td>

          <td class="num">
            ${collection.totalAmount.toLocaleString()}
          </td>

        </tr>

      </tbody>

    </table>

    ${
      collection.notes
        ? `
          <p
            style="
              margin-top:10px;
              font-size:9px;
            "
          >
            নোটঃ
            ${escapeHtml(collection.notes)}
          </p>
        `
        : ""
    }

    <!-- =====================================
         SIGNATURES
    ====================================== -->

    <div class="signatures">

      <div>
        প্রদানকারীর স্বাক্ষর
      </div>

      <div>
        গ্রহণকারীর স্বাক্ষর
      </div>

    </div>

  </div>

</body>

</html>
`;

    // ======================================================
    // PDF GENERATION
    // ======================================================

    // ======================================================
    // PDF GENERATION
    // ======================================================

    let browser: any = null;

    try {
      const isVercel = process.env.VERCEL === "1";

      // ====================================================
      // VERCEL / PRODUCTION
      // ====================================================

      if (isVercel) {
        const chromium = (await import("@sparticuz/chromium")).default;

        const puppeteer = await import("puppeteer-core");

        const executablePath = await chromium.executablePath();

        console.log("Chromium executable path:", executablePath);

        browser = await puppeteer.default.launch({
          args: [
            ...chromium.args,

            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
          ],

          defaultViewport: chromium.defaultViewport,

          executablePath,

          headless: chromium.headless,
        });
      }

      // ====================================================
      // LOCAL DEVELOPMENT
      // ====================================================
      else {
        const puppeteer = await import("puppeteer-core");

        const chromePath =
          process.env.CHROME_EXECUTABLE_PATH ||
          "C:/Program Files/Google/Chrome/Application/chrome.exe";

        console.log("Local Chrome path:", chromePath);

        browser = await puppeteer.default.launch({
          headless: true,

          executablePath: chromePath,

          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });
      }

      // ====================================================
      // CREATE PAGE
      // ====================================================

      const page = await browser.newPage();

      // ====================================================
      // LOAD HTML
      // ====================================================

      await page.setContent(html, {
        waitUntil: "load",
      });

      // ====================================================
      // CREATE PDF
      // ====================================================

      const pdfBuffer = Buffer.from(
        await page.pdf({
          format: "A5",

          margin: {
            top: "0",
            bottom: "0",
            left: "0",
            right: "0",
          },

          printBackground: true,

          preferCSSPageSize: false,
        }),
      );

      // ====================================================
      // RESPONSE
      // ====================================================

      res.setHeader("Content-Type", "application/pdf");

      const safePartyName = String(party?.name || "party").replace(
        /[^\p{L}\p{N}\-_]+/gu,
        "-",
      );

      const billDate = format(
        new Date(collection.collectionDate),
        "dd-MM-yyyy",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bill-${safePartyName}-${billDate}.pdf"`,
      );

      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF জেনারেশন এরর (collection bill):", err);

      throw new ApiError(500, "বিলের PDF তৈরি করা যায়নি");
    } finally {
      // Browser অবশ্যই close করতে হবে
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error("Browser close error:", closeError);
        }
      }
    }
  },
);
