import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ErrorBoundary from "./ErrorBoundary";

/** Component that always throws on render — used to trigger the boundary. */
function ThrowingChild() {
  throw new Error("Test crash");
}

/**
 * Test suite for the ErrorBoundary component.
 */
describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    // Suppress React's error logging during this intentional crash test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();

    spy.mockRestore();
  });
});
