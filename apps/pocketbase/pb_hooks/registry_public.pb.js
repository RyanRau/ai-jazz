/// <reference path="../pb_data/types.d.ts" />

// Public subset of the app catalog, for ryanzrau.dev's signed-out landing
// page (apps/ryanzrau/src/Landing.tsx's Personal Projects section).
// registry_apps' own listRule requires auth (it's the full internal
// catalog, not everything in it is meant to be public), so this route
// reads it server-side and returns only the rows an admin has marked
// public -- no sign-in or grant needed. Icons aren't included: the
// landing page draws its own custom SVG per slug rather than reusing the
// emoji registry_apps uses for the signed-in dashboard.
routerAdd("GET", "/api/custom/public-apps", (e) => {
  const records = e.app.findRecordsByFilter("registry_apps", "public = true", "name", 0, 0);
  const apps = records.map((a) => ({
    slug: a.getString("slug"),
    name: a.getString("name"),
    url: a.getString("url"),
    description: a.getString("description"),
  }));
  return e.json(200, { apps: apps });
});
