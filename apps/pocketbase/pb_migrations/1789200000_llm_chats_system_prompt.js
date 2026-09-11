/// <reference path="../pb_data/types.d.ts" />

// Per-chat system prompt override -- falls back to the user's own
// default_system_prompt (see users.default_system_prompt) when empty.
// Resolved fresh each turn by gateway.py via
// POST /api/custom/llm/chats/messages/create, so an edit made via
// POST /api/custom/llm/chats/system_prompt takes effect on the chat's next
// message rather than retroactively.
migrate(
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.add(
      new TextField({
        name: "system_prompt",
        required: false,
        max: 4000,
      })
    );
    app.save(chats);
  },
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.removeByName("system_prompt");
    app.save(chats);
  }
);
