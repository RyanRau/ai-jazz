/// <reference path="../pb_data/types.d.ts" />

// Records what web_search calls (if any) produced an assistant message, so
// tony's Chat page can show the queries + sources a response used, not just
// the answer. Encrypted at rest the same way `content` is -- same reasoning,
// it's effectively an extension of the message. Empty/unset for every
// message that didn't involve a tool call, which is the overwhelming
// majority even with web_search configured.
migrate(
  (app) => {
    const messages = app.findCollectionByNameOrId("llm_chat_messages");
    messages.fields.add(
      new TextField({
        name: "tool_calls",
        required: false,
        max: 100000,
      })
    );
    app.save(messages);
  },
  (app) => {
    const messages = app.findCollectionByNameOrId("llm_chat_messages");
    messages.fields.removeByName("tool_calls");
    app.save(messages);
  }
);
