// src/core/normalization/upsert.ts
import Official from "../../gov-reach/src/models/Official.js"; // adjust path or duplicate model in gov-finder
import Issue from "../../gov-reach/src/models/Issue.js";
import { normalizeName, isLikelySame } from "../../gov-reach/src/utils/fuzzyMatch.js"; // or your local copy
import mongoose from "mongoose";

/**
 * Very basic dedupe/upsert: tries to find existing official by normalized name + role + jurisdiction proximity.
 */
export async function upsertOfficial(raw: any) {
  const normName = normalizeName(raw.fullName || raw.name);
  const candidates = await Official.find({
    $text: { $search: raw.fullName },
  }).limit(5); // rough

  let match: any = null;
  for (const c of candidates) {
    if (isLikelySame(c.fullName, raw.fullName) && c.role === raw.role) {
      match = c;
      break;
    }
  }

  if (match) {
    // merge: prefer existing fields unless new has something extra
    match.fullName = raw.fullName || match.fullName;
    match.role = raw.role || match.role;
    if (raw.email) match.email = raw.email;
    if (raw.state) match.state = raw.state;
    if (raw.category) match.category = raw.category;
    if (raw.level) match.level = raw.level;
    if (raw.offices) {
      // naive append; real logic should dedupe offices too
      match.offices = [...(match.offices || []), ...(raw.offices || [])];
    }
    if (raw.issues) {
      const issueDocs = await Promise.all(
        raw.issues.map(async (slug: string) => {
          const lower = slug.toLowerCase();
          return (
            (await Issue.findOne({ name: lower })) ||
            (await Issue.create({ name: lower, aliases: [] }))
          );
        })
      );
      match.issues = Array.from(new Set([...(match.issues || []), ...issueDocs.map(i => i._id)]));
    }
    // merge sourceAttributions
    match.sourceAttributions = [...(match.sourceAttributions || []), ...(raw.sourceAttributions || [])];
    match.confidenceScore = computeBasicScore(match); // placeholder
    await match.save();
    return match;
  } else {
    // create new
    const issueDocs = raw.issues
      ? await Promise.all(
          raw.issues.map(async (slug: string) => {
            const lower = slug.toLowerCase();
            return (
              (await Issue.findOne({ name: lower })) ||
              (await Issue.create({ name: lower, aliases: [] }))
            );
          })
        )
      : [];

    const newOfficial = new Official({
      fullName: raw.fullName || raw.name,
      role: raw.role,
      email: raw.email || "",
      state: raw.state || "",
      category: raw.category || "",
      level: raw.level || "federal",
      issues: issueDocs.map((i: any) => i._id),
      sourceAttributions: raw.sourceAttributions || [],
      confidenceScore: 0,
      location: raw.location || undefined,
      jurisdiction: raw.jurisdiction || {},
    });

    newOfficial.confidenceScore = computeBasicScore(newOfficial);
    await newOfficial.save();
    return newOfficial;
  }
}

// placeholder scoring
function computeBasicScore(doc: any): number {
  let score = 0;
  if (doc.verified) score += 0.5;
  if (doc.crowdVotes?.up) score += Math.min(doc.crowdVotes.up / 10, 0.3);
  // diversity / source count
  if (doc.sourceAttributions) score += Math.min(doc.sourceAttributions.length * 0.05, 0.2);
  return Math.min(score, 1);
}
