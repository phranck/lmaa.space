import { beforeEach, describe, expect, it, vi } from "vitest";

const submissionRepoMocks = vi.hoisted(() => ({
  createSubmissionFromFormData: vi.fn(),
}));

const formSubmissionRepoMocks = vi.hoisted(() => ({
  insertFormSubmission: vi.fn(),
}));

const emailTemplateMocks = vi.hoisted(() => ({
  getEmailTemplateById: vi.fn(),
}));

const emailRendererMocks = vi.hoisted(() => ({
  renderEmailTemplate: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../repositories/admin-submissions.js", () => submissionRepoMocks);
vi.mock("../repositories/form-submission.js", () => formSubmissionRepoMocks);
vi.mock("../repositories/email-templates.js", () => emailTemplateMocks);
vi.mock("../services/email-renderer.js", () => emailRendererMocks);
vi.mock("../services/email.js", () => emailMocks);
vi.mock("../lib/logger.js", () => loggerMock);
vi.mock("../lib/html.js", async (importOriginal) => importOriginal());

import { executeSubmissionChain } from "../services/form-submission.js";

describe("executeSubmissionChain", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handles a store step", async () => {
    await executeSubmissionChain(
      { steps: [{ type: "store" }] },
      { name: "Test" },
      { id: 1, name: "contact" },
    );

    expect(formSubmissionRepoMocks.insertFormSubmission).toHaveBeenCalledWith(1, { name: "Test" });
  });

  it("handles a create-shop-suggestion step", async () => {
    await executeSubmissionChain(
      { steps: [{ type: "create-shop-suggestion" }] },
      { shopName: "My Shop" },
      { id: 1, name: "suggest" },
    );

    expect(submissionRepoMocks.createSubmissionFromFormData).toHaveBeenCalledWith({
      shopName: "My Shop",
    });
  });

  it("handles an email step with static to address", async () => {
    await executeSubmissionChain(
      {
        steps: [
          {
            type: "email",
            to: "admin@example.com",
            subject: "New submission",
          },
        ],
      },
      { name: "Test" },
      { id: 1, name: "contact" },
    );

    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "admin@example.com",
      "New submission",
      expect.stringContaining("<table"),
      { replyTo: undefined },
    );
  });

  it("resolves dynamic to address from toFieldId", async () => {
    await executeSubmissionChain(
      {
        steps: [
          {
            type: "email",
            to: "fallback@example.com",
            toFieldId: "email",
            subject: "Hello",
          },
        ],
      },
      { email: "user@example.com", name: "Max" },
      { id: 1, name: "contact" },
    );

    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "user@example.com",
      "Hello",
      expect.any(String),
      { replyTo: undefined },
    );
  });

  it("uses default subject when none provided", async () => {
    await executeSubmissionChain(
      { steps: [{ type: "email", to: "a@b.com" }] },
      { foo: "bar" },
      { id: 1, name: "Kontakt" },
    );

    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "a@b.com",
      "Neue Formular-Übermittlung: Kontakt",
      expect.any(String),
      { replyTo: undefined },
    );
  });

  it("resolves replyTo from replyToFieldId", async () => {
    await executeSubmissionChain(
      {
        steps: [
          {
            type: "email",
            to: "admin@example.com",
            replyToFieldId: "contactEmail",
            subject: "Hi",
          },
        ],
      },
      { contactEmail: "user@reply.com" },
      { id: 1, name: "form" },
    );

    expect(emailMocks.sendMail).toHaveBeenCalledWith("admin@example.com", "Hi", expect.any(String), {
      replyTo: "user@reply.com",
    });
  });

  it("uses email template when templateId is provided", async () => {
    emailTemplateMocks.getEmailTemplateById.mockResolvedValue({
      id: 5,
      name: "Welcome",
      subject: "Welcome!",
      body: "<p>Hello</p>",
    });
    emailRendererMocks.renderEmailTemplate.mockResolvedValue({
      html: "<p>Rendered</p>",
      subject: "Rendered Subject",
    });

    await executeSubmissionChain(
      {
        steps: [
          {
            type: "email",
            to: "user@example.com",
            subject: "Fallback Subject",
            templateId: 5,
          },
        ],
      },
      { name: "Max" },
      { id: 1, name: "form" },
    );

    expect(emailTemplateMocks.getEmailTemplateById).toHaveBeenCalledWith(5);
    expect(emailRendererMocks.renderEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5 }),
      { name: "Max" },
    );
    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "user@example.com",
      "Rendered Subject",
      "<p>Rendered</p>",
      { replyTo: undefined },
    );
  });

  it("falls back to plain table when template not found", async () => {
    emailTemplateMocks.getEmailTemplateById.mockResolvedValue(null);

    await executeSubmissionChain(
      {
        steps: [
          {
            type: "email",
            to: "user@example.com",
            subject: "Sub",
            templateId: 999,
          },
        ],
      },
      { name: "Max" },
      { id: 1, name: "form" },
    );

    expect(emailMocks.sendMail).toHaveBeenCalledWith(
      "user@example.com",
      "Sub",
      expect.stringContaining("<table"),
      { replyTo: undefined },
    );
  });

  it("executes multiple steps sequentially", async () => {
    const callOrder: string[] = [];
    formSubmissionRepoMocks.insertFormSubmission.mockImplementation(async () => {
      callOrder.push("store");
    });
    emailMocks.sendMail.mockImplementation(async () => {
      callOrder.push("email");
    });

    await executeSubmissionChain(
      {
        steps: [
          { type: "store" },
          { type: "email", to: "a@b.com", subject: "Hi" },
        ],
      },
      { x: "1" },
      { id: 1, name: "form" },
    );

    expect(callOrder).toEqual(["store", "email"]);
  });
});
