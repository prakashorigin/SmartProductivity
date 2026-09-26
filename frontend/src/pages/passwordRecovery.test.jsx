import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import { requestPasswordResetAPI, resetPasswordAPI } from "../services/api";

vi.mock("../services/api", () => ({
  requestPasswordResetAPI: vi.fn(),
  resetPasswordAPI: vi.fn(),
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("password recovery", () => {
  it("shows the generic reset response after submitting an email", async () => {
    const user = userEvent.setup();
    requestPasswordResetAPI.mockResolvedValue({ data: { message: "If an account exists for that email, we’ve sent password reset instructions." } });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    await user.type(screen.getByLabelText("Email address"), "student@example.invalid");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect((await screen.findByRole("status")).textContent).toContain("If an account exists");
    expect(requestPasswordResetAPI).toHaveBeenCalledWith("student@example.invalid");
  });

  it("does not call the API when new password fields do not match", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/reset-password/test-token"]}><Routes><Route path="/reset-password/:token" element={<ResetPassword />} /></Routes></MemoryRouter>);
    await user.type(screen.getByLabelText("New password"), "GoodPassword123!");
    await user.type(screen.getByLabelText("Confirm password"), "DifferentPassword123!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(screen.getByRole("alert").textContent).toMatch(/don.t match/i);
    expect(resetPasswordAPI).not.toHaveBeenCalled();
  });

  it("keeps server reset-link errors visible with a recovery action", async () => {
    const user = userEvent.setup();
    resetPasswordAPI.mockRejectedValue({ response: { data: { message: "This password reset link is invalid or expired." } } });
    render(<MemoryRouter initialEntries={["/reset-password/test-token"]}><Routes><Route path="/reset-password/:token" element={<ResetPassword />} /></Routes></MemoryRouter>);
    await user.type(screen.getByLabelText("New password"), "GoodPassword123!");
    await user.type(screen.getByLabelText("Confirm password"), "GoodPassword123!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect((await screen.findByRole("alert")).textContent).toContain("invalid or expired");
    expect(screen.getByRole("link", { name: "Request another reset link" }).getAttribute("href")).toBe("/forgot-password");
  });
});
