import { render, screen } from "@testing-library/react";
import { EarningsChart } from "./earnings-chart";

describe("EarningsChart", () => {
  it("renders empty state", () => {
    render(<EarningsChart points={[]} />);
    expect(screen.getByText(/earnings data will appear/i)).toBeInTheDocument();
  });

  it("renders chart points", () => {
    render(
      <EarningsChart
        points={[
          {
            periodStart: "2025-01-01",
            grossMinor: 10000,
            netMinor: 8000,
            feesMinor: 2000,
            soldCount: 2,
            currency: "GBP",
          },
          {
            periodStart: "2025-02-01",
            grossMinor: 15000,
            netMinor: 12000,
            feesMinor: 3000,
            soldCount: 4,
            currency: "GBP",
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Earnings graph")).toBeInTheDocument();
    expect(screen.getByText("2025-02-01")).toBeInTheDocument();
  });
});
