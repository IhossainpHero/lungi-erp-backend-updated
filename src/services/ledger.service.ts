// src/services/ledger.service.ts
import { ILedgerEntry, ILedgerSummary } from "@interfaces/index";
import Collection from "@models/Collection.model";
import DamageClaim from "@models/DamageClaim.model";
import Party from "@models/Party.model";
import Payment from "@models/Payment.model";
import { ApiError } from "@utils/ApiError";
import { Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────
// Core formula:
// মোট বকেয়া = SUM(collections) - SUM(payments) - SUM(approved damages)
// ─────────────────────────────────────────────────────────────────

export const getLedger = async (
  partyId: string,
  dateFilter?: string, // ✅ নতুন optional param
): Promise<ILedgerSummary> => {
  const party = await Party.findById(partyId);
  if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");

  const pid = new Types.ObjectId(partyId);

  const [collections, payments, damages] = await Promise.all([
    Collection.find({ partyId: pid }).sort({ collectionDate: 1 }),
    Payment.find({ partyId: pid }).sort({ date: 1 }),
    DamageClaim.find({ partyId: pid, status: "approved" }).sort({
      claimDate: 1,
    }),
  ]);

  const entries: ILedgerEntry[] = [];

  for (const col of collections) {
    entries.push({
      date: col.collectionDate,
      type: "collection",
      description: `কালেকশন — ${col.lineItems.map((l) => `${l.serviceName} ${l.quantity} থান`).join(", ")}${col.totalFolding ? ` · ${col.totalFolding} ফোল্ডিং` : ""}`,
      debit: col.totalAmount,
      credit: 0,
      balance: 0,
      refId: col._id as Types.ObjectId,
    });
  }

  for (const pay of payments) {
    entries.push({
      date: pay.date,
      type: "payment",
      description: `পেমেন্ট — ${pay.method} (${pay.type})`,
      debit: 0,
      credit: pay.amount,
      balance: 0,
      refId: pay._id as Types.ObjectId,
    });
  }

  for (const dmg of damages) {
    entries.push({
      date: dmg.claimDate,
      type: "damage",
      description: `ড্যামেজ ক্লেইম — ${dmg.damagedPieces} পিস × ৳${dmg.pricePerPiece}`,
      debit: 0,
      credit: dmg.totalClaim,
      balance: 0,
      refId: dmg._id as Types.ObjectId,
    });
  }

  entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // ✅ running balance পুরো (unfiltered) হিস্ট্রি দিয়েই হিসাব হবে — তারিখ ফিল্টার করলেও ব্যালেন্স সঠিক থাকবে
  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance += entry.debit - entry.credit;
    entry.balance = runningBalance;
  }

  // ✅ date filter — শুধু ওই নির্দিষ্ট দিনের entry-গুলো দেখাবে
  let visibleEntries = entries;
  if (dateFilter) {
    const target = new Date(dateFilter);
    visibleEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return (
        d.getFullYear() === target.getFullYear() &&
        d.getMonth() === target.getMonth() &&
        d.getDate() === target.getDate()
      );
    });
  }

  const totalCharge = collections.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalDamageCredit = damages.reduce((s, d) => s + d.totalClaim, 0);
  const totalDue = totalCharge - totalPaid - totalDamageCredit;

  return {
    partyId: pid,
    partyName: party.name,
    totalCharge,
    totalPaid,
    totalDamageCredit,
    totalDue,
    entries: visibleEntries, // ✅ ফিল্টার করা লিস্ট
  };
};

// Get all parties with their due amount — sorted highest due first
export const getAllPartiesDue = async () => {
  const parties = await Party.find({ status: "active" });

  const results = await Promise.all(
    parties.map(async (party) => {
      const pid = party._id as Types.ObjectId;

      const [collectionAgg, paymentAgg, damageAgg] = await Promise.all([
        Collection.aggregate([
          { $match: { partyId: pid } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Payment.aggregate([
          { $match: { partyId: pid } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        DamageClaim.aggregate([
          { $match: { partyId: pid, status: "approved" } },
          { $group: { _id: null, total: { $sum: "$totalClaim" } } },
        ]),
      ]);

      const totalCharge = collectionAgg[0]?.total ?? 0;
      const totalPaid = paymentAgg[0]?.total ?? 0;
      const totalDamage = damageAgg[0]?.total ?? 0;
      const totalDue = totalCharge - totalPaid - totalDamage;

      return {
        party: {
          _id: party._id,
          name: party.name,

          phone: party.phone,
        },
        totalCharge,
        totalPaid,
        totalDamage,
        totalDue,
      };
    }),
  );

  // Sort: highest due first
  return results.sort((a, b) => b.totalDue - a.totalDue);
};
