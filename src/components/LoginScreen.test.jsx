import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import LoginScreen from "./LoginScreen";

/**
 * Test suite for the LoginScreen component.
 */
describe("LoginScreen", () => {
  /**
   * Verifies the heading, tagline, and sign-in button are rendered.
   */
  it("renders brand heading and tagline", () => {
    render(<LoginScreen onLogin={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /cutcarbon/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/track your footprint/i)).toBeInTheDocument();
  });

  it("renders the sign-in button with correct aria-label", () => {
    render(<LoginScreen onLogin={() => {}} />);

    const btn = screen.getByRole("button", { name: /sign in with google/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Sign in with Google");
  });

  it("calls onLogin when the button is clicked", () => {
    const spy = vi.fn();
    render(<LoginScreen onLogin={spy} />);

    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(spy).toHaveBeenCalledOnce();
  });
});
