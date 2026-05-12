import { render, screen } from "@testing-library/react";
import { AuditTable } from "./audit-table";

describe("AuditTable", () => {
  it("renders audit events", () => {
    render(
      <AuditTable
        events={[
          {
            id: "audit-1",
            actorId: "user-1",
            targetType: "session",
            targetId: "session-1",
            action: "account.session.revoked",
            createdAt: new Date().toISOString(),
            details: "Revoked device session.",
          },
        ]}
      />,
    );

    expect(screen.getByText("account.session.revoked")).toBeInTheDocument();
    expect(screen.getByText("Revoked device session.")).toBeInTheDocument();
  });
});
