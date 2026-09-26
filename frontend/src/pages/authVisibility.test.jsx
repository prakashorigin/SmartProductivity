import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import { clearError, registerUser } from "../store/authSlice";
import { store } from "../store/store";

afterEach(() => {
  cleanup();
  store.dispatch(clearError());
});

const renderAuthPage = (page) => render(<Provider store={store}><MemoryRouter>{page}</MemoryRouter></Provider>);

describe("password visibility controls", () => {
  it("shows and hides the login password on request", async () => {
    const user = userEvent.setup();
    renderAuthPage(<Login />);
    const password = screen.getByLabelText("Password");
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.type).toBe("password");
  });

  it("shows and hides the registration password on request", async () => {
    const user = userEvent.setup();
    renderAuthPage(<Register />);
    const password = screen.getByLabelText("Password");
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.type).toBe("password");
  });

  it("shows the server's duplicate-email registration message", () => {
    store.dispatch(registerUser.rejected(
      { name: "Rejected", message: "Request failed" },
      "duplicate-email-test",
      { name: "Student", email: "student@example.invalid", password: "ValidPassword123!" },
      "An account with this email address already exists. Try logging in instead.",
    ));
    renderAuthPage(<Register />);
    expect(screen.getByRole("alert").textContent).toMatch(/already exists/i);
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe("/login");
  });
});
