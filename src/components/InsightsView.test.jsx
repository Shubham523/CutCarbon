import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock recharts
vi.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

import InsightsView from "./InsightsView";

const mockActivities = [
  {
    co2: 5.0,
    co2_score_kg: 5.0,
    category: "Transport",
    timestamp: new Date().toISOString(),
  },
  {
    co2: 2.3,
    co2_score_kg: 2.3,
    category: "Groceries",
    timestamp: new Date().toISOString(),
  },
];

/**
 * Test suite for the InsightsView component.
 */
describe("InsightsView", () => {
  it("renders the heading and subtitle", () => {
    render(<InsightsView activities={mockActivities} />);

    expect(
      screen.getByRole("heading", { name: /insights/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/emission patterns/i)).toBeInTheDocument();
  });

  it("renders both tab buttons", () => {
    render(<InsightsView activities={mockActivities} />);

    expect(screen.getByRole("tab", { name: /weekly/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /by category/i }),
    ).toBeInTheDocument();
  });

  it("shows Weekly tab as selected by default", () => {
    render(<InsightsView activities={mockActivities} />);

    const weeklyTab = screen.getByRole("tab", { name: /weekly/i });
    expect(weeklyTab).toHaveAttribute("aria-selected", "true");
  });

  it("switches to By Category tab on click", () => {
    render(<InsightsView activities={mockActivities} />);

    const categoryTab = screen.getByRole("tab", { name: /by category/i });
    fireEvent.click(categoryTab);

    expect(categoryTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /weekly/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("displays category breakdown after switching tabs", () => {
    render(<InsightsView activities={mockActivities} />);

    fireEvent.click(screen.getByRole("tab", { name: /by category/i }));

    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("renders with empty activities", () => {
    render(<InsightsView activities={[]} />);

    expect(screen.getByText(/no analysis data/i)).toBeInTheDocument();
  });

  it("uses custom daily target from settings", () => {
    render(
      <InsightsView
        activities={mockActivities}
        settings={{ dailyTargetKg: 15 }}
      />,
    );

    // Should render without error — the target is passed to the chart
    expect(screen.getByRole("heading", { name: /insights/i })).toBeInTheDocument();
  });
});
