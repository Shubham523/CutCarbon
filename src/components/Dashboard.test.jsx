import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock recharts to avoid canvas/SVG issues in jsdom
vi.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
}));

// Mock child components to isolate Dashboard testing
vi.mock("./WeeklyChart", () => ({
  default: () => <div data-testid="weekly-chart">WeeklyChart</div>,
}));
vi.mock("./ContributorsAndActions", () => ({
  default: () => <div data-testid="contributors">Contributors</div>,
}));
vi.mock("./ActivityFeed", () => ({
  default: () => <div data-testid="activity-feed">ActivityFeed</div>,
}));

import Dashboard from "./Dashboard";

const mockUser = { uid: "test-user-123", displayName: "Test" };
const mockActivities = [
  {
    id: "a1",
    co2: 3.5,
    co2_score_kg: 3.5,
    category: "Transport",
    timestamp: new Date().toISOString(),
    item_name: "Car ride",
    icon: "🚗",
  },
  {
    id: "a2",
    co2: 1.2,
    co2_score_kg: 1.2,
    category: "Groceries",
    timestamp: new Date().toISOString(),
    item_name: "Milk",
    icon: "🛒",
  },
];

/**
 * Test suite for the Dashboard component.
 */
describe("Dashboard", () => {
  it("renders the weekly total", () => {
    render(
      <Dashboard
        activities={mockActivities}
        onDelete={() => {}}
        onEntryUpdate={() => {}}
        user={mockUser}
        settings={{ dailyTargetKg: 10 }}
      />,
    );

    // 3.5 + 1.2 = 4.7
    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getAllByText(/kg CO₂/).length).toBeGreaterThan(0);
  });

  it("shows remaining budget when under target", () => {
    render(
      <Dashboard
        activities={mockActivities}
        onDelete={() => {}}
        onEntryUpdate={() => {}}
        user={mockUser}
        settings={{ dailyTargetKg: 10 }}
      />,
    );

    // Target = 10 * 7 = 70, total = 4.7, remaining = 65.3
    expect(screen.getByText(/65.3 kg remaining/)).toBeInTheDocument();
  });

  it("shows over-budget warning when above target", () => {
    const heavyActivities = [
      { id: "h1", co2: 80, co2_score_kg: 80, category: "Transport", timestamp: new Date().toISOString() },
    ];

    render(
      <Dashboard
        activities={heavyActivities}
        onDelete={() => {}}
        onEntryUpdate={() => {}}
        user={mockUser}
        settings={{ dailyTargetKg: 10 }}
      />,
    );

    // 80 - 70 = 10.0 kg over
    expect(screen.getByText(/10.0 kg over/)).toBeInTheDocument();
  });

  it("renders with empty activities", () => {
    render(
      <Dashboard
        activities={[]}
        onDelete={() => {}}
        onEntryUpdate={() => {}}
        user={mockUser}
      />,
    );

    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("renders child components", () => {
    render(
      <Dashboard
        activities={mockActivities}
        onDelete={() => {}}
        onEntryUpdate={() => {}}
        user={mockUser}
      />,
    );

    expect(screen.getByTestId("weekly-chart")).toBeInTheDocument();
    expect(screen.getByTestId("contributors")).toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
  });
});
