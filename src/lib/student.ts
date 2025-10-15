// DEPRECATED: This file contained internal course enrollment functionality
// which has been removed. The app now only catalogs external certifications.
// 
// For external certification tracking, use:
// - progress.ts for user progress (startTaking, stopTaking, isTaking)
// - certifications-api.ts for favorites and certification data
//
// This file is kept for reference but should not be imported anywhere.
// TODO: Remove all imports of this file from other components

import { supabase } from "@/lib/supabase";

export async function listUserCertificates(userId: string) {
  // External certifications don't have internal certificates
  // Return empty array
  return { data: [], error: null };
}
 