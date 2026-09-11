/// <reference path="../pb_data/types.d.ts" />

// A user's own default system prompt, used by tony's Chat page for any new
// chat that doesn't set its own override (llm_chats.system_prompt). Plain
// self-service field on the built-in `users` collection -- no custom route
// needed, the standard users update rule (self: id = @request.auth.id)
// already lets a signed-in user edit their own record, the same as any
// other profile field.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new TextField({
        name: "default_system_prompt",
        required: false,
        max: 4000,
      })
    );
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("default_system_prompt");
    app.save(users);
  }
);
