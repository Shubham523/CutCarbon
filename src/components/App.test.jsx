import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

/**
 * Test suite for verifying the App component renders correctly
 * and the LoginScreen is displayed when no user is authenticated.
 */

// Mock firebase module to avoid real initialisation during tests
vi.mock("../../firebase", () => ({
  auth: {},
  provider: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb(null); // simulate no user signed in
    return () => {};
  }),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  doc: vi.fn(),
  Timestamp: { fromDate: vi.fn() },
}));

// Lazy-import App after mocks are established
const { default: App } = await import("../App");

describe("App", () => {
  /**
   * Verifies the login screen is rendered when no user session exists.
   */
  it("renders LoginScreen when no user is authenticated", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/track your footprint/i)).toBeInTheDocument();
  });

  /**
   * Verifies the page heading is visible on the login screen.
   */
  it("shows the CutCarbon brand heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /cutcarbon/i }),
    ).toBeInTheDocument();
  });
});
