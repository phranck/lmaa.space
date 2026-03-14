export type CriterionKey =
  | "independent"
  | "german"
  | "shipping"
  | "notLargeCorp"
  | "notMarketplace"
  | "notDropshipping"
  | "notChain"
  | "notAffiliate"
  | "noFarRight";

export type CriterionResult = {
  key: CriterionKey;
  label: string;
  result: "✓" | "✗" | "~";
  note: string;
};

export type DecisionOutcome = {
  criteria: CriterionResult[];
  verdict: "accept" | "reject";
  unclearPoints: string[];
};
