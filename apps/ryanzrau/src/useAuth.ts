import { useEffect, useState } from "react";
import { pb } from "./pb";

/** The current signed-in user's record, or null when signed out. Re-renders on auth changes. */
export function useAuthRecord() {
  const [record, setRecord] = useState(pb.authStore.record);
  useEffect(() => pb.authStore.onChange(() => setRecord(pb.authStore.record), true), []);
  return record;
}
