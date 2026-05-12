import { render, screen } from "@testing-library/react";
import { SettingsShell } from "./settings-shell";

describe("SettingsShell", () => {
  it("renders summary and navigation", () => {
    render(
      <SettingsShell
        title="Preferences"
        description="Manage account preferences."
        currentPath="/account/settings"
        summary={{ displayName: "Anna", email: "anna@example.com", role: "creator" }}
        settings={null}
        readiness={null}
      >
        <div>child content</div>
      </SettingsShell>,
    );

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getAllByText("Preferences")).toHaveLength(2);
    expect(screen.getByText("Security & devices")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
