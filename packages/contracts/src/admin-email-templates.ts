export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  headerBannerUrl?: string | null;
  headerText?: string | null;
  bodyText: string;
  footerBannerUrl?: string | null;
  footerText?: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateInput = Omit<
  EmailTemplate,
  "id" | "createdAt" | "updatedAt" | "isSystemTemplate"
>;
