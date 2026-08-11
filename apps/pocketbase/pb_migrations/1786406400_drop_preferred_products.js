/// <reference path="../pb_data/types.d.ts" />

// Drops `preferred_products`, the last remnant of the retired Wally app. The
// collection only exists on volumes created before this migration; guarded so a
// fresh pb_data volume applies it as a no-op.
migrate(
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("preferred_products"));
    } catch {
      // Never existed on this volume — nothing to drop.
    }
  },
  () => {
    // Irreversible: the retired app's data is not worth reconstructing.
  }
);
