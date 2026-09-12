/// <reference path="../pb_data/types.d.ts" />

// Files attached to a chat message: "uploaded" (a document the user
// attached, read to plain text server-side -- see gateway.py's
// _extract_uploaded_text) on a user message, or "generated" (a write_file
// tool call's output) on an assistant message. JSON-encoded and encrypted
// at rest the same way tool_calls is -- it's effectively an extension of
// the message, not metadata that needs its own querying.
migrate(
  (app) => {
    const messages = app.findCollectionByNameOrId("llm_chat_messages");
    messages.fields.add(
      new TextField({
        name: "attachments",
        required: false,
        max: 500000,
      })
    );
    app.save(messages);
  },
  (app) => {
    const messages = app.findCollectionByNameOrId("llm_chat_messages");
    messages.fields.removeByName("attachments");
    app.save(messages);
  }
);
