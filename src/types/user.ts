import type { Timestamp } from 'firebase-admin/firestore'

export interface NotificationPrefs {
  // Whether high-priority Org events are also emailed; the in-app channel is
  // always on. Default true. See org-papers-permissions.md#notifications.
  email: boolean
}

// Stored shape of `/users/{uid}`. Written server-side at registration
// (USER-001). `handle` preserves the user's original casing for display;
// `handleLower` mirrors the `/handles/{handle}` doc id (the uniqueness key).
export interface UserDoc {
  name: string
  handle: string
  handleLower: string
  email: string
  notificationPrefs: NotificationPrefs
  // Weighted keyword map maintained from the user's library; powers Discover
  // ranking. Defined in paper.md#7-keyword-preference-profile.
  keywordProfile: Record<string, number>
  createdAt: Timestamp
}
