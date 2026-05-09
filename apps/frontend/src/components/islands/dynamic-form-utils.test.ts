import { describe, expect, it } from "vitest";

import type { FormConfig } from "@lmaa/contracts";

import { buildDynamicFormPayload, getRequiredMultiSelectErrors } from "./dynamic-form-utils";

const formConfig: FormConfig = {
  id: 1,
  name: "suggest-shop",
  slug: "suggest-shop",
  isActive: true,
  rows: [
    {
      id: "row-1",
      fields: [
        { id: "shop-url", name: "shopUrl", type: "text", label: "Shop URL", required: true },
        {
          id: "categories",
          name: "categoryIds",
          type: "multi-select",
          label: "Kategorien",
          required: true,
          optionsSource: "categories",
        },
        {
          id: "regions",
          name: "region",
          type: "multi-select",
          label: "Regionen",
          required: true,
          optionsSource: "regions",
        },
        {
          id: "channels",
          type: "multi-select",
          label: "Kanäle",
          required: true,
          options: ["Newsletter", "Social"],
        },
        {
          id: "intro",
          type: "richtext",
          label: "Intro",
          required: false,
          content: "Nicht mitsenden",
        },
        {
          id: "submit",
          type: "button",
          label: "Absenden",
          required: false,
          buttonType: "submit",
        },
      ],
    },
  ],
};

describe("dynamic form helpers", () => {
  it("builds payloads from scalar fields and multi-select state", () => {
    expect(
      buildDynamicFormPayload(
        formConfig,
        { shopUrl: "https://example.com", ignoredEmpty: "" },
        {
          categoryIds: [1, 3],
          regionCodes: ["DE", "AT"],
          staticMultiSelects: { channels: ["Newsletter"] },
        },
      ),
    ).toEqual({
      shopUrl: "https://example.com",
      categoryIds: [1, 3],
      region: ["DE", "AT"],
      channels: ["Newsletter"],
    });
  });

  it("returns required multi-select errors for empty selections", () => {
    expect(
      getRequiredMultiSelectErrors(formConfig, {
        categoryIds: [],
        regionCodes: [],
        staticMultiSelects: {},
      }),
    ).toEqual({
      categoryIds: "Kategorien ist ein Pflichtfeld",
      region: "Regionen ist ein Pflichtfeld",
      channels: "Kanäle ist ein Pflichtfeld",
    });
  });
});
