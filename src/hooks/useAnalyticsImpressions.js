import { useEffect, useRef } from "react";
import { apiFetch } from "../api/client";

export function useAnalyticsImpressions(listings) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!listings || listings.length === 0) return;
    if (sentRef.current) return;

    sentRef.current = true;

    const ids = listings.map((p) => p.id || p._id).filter(Boolean);

    if (!ids.length) return;

    apiFetch("/analytics/impression", {
      method: "POST",
      body: JSON.stringify({ listingIds: ids }),
    }).catch(() => {});
  }, [listings]);
}
