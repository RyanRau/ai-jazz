import { useColorScheme } from "../../../theme";
import SegmentedControl from "../../buttons/SegmentedControl/SegmentedControl";

/**
 * A three-way Auto/Light/Dark control wired straight to `useColorScheme`.
 * No props — there's exactly one color scheme per page, so there's nothing
 * to parameterize. Drop it in `SideNav`'s `footer` slot, or anywhere else
 * app chrome needs a way to change the theme.
 */
export default function ThemeToggle() {
  const { scheme, setScheme } = useColorScheme();

  return (
    <SegmentedControl
      options={[
        { label: "Auto", value: "auto" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ]}
      value={scheme}
      onChange={setScheme}
    />
  );
}
