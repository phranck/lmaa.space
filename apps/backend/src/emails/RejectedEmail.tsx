import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * Props for the rejection notification email.
 */
interface RejectedEmailProps {
  shopName: string;
  reason?: string;
}

/**
 * Renders the email sent when a submission is rejected.
 *
 * @param props - Rejected submission data.
 * @returns JSX email markup.
 */
export function RejectedEmail({ shopName, reason }: RejectedEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Vorschlag „{shopName}" konnte nicht aufgenommen werden</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={bannerSection}>
            <Link href="https://lmaa.space">
              <Img
                src="https://lmaa.space/email-banner.jpg"
                alt="LMAA – Liste Möglicher Amazon Alternativen"
                width="560"
                style={bannerImg}
              />
            </Link>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Zu deinem Vorschlag</Heading>

            <Text style={paragraph}>Hallo,</Text>
            <Text style={paragraph}>
              leider können wir deinen Vorschlag <strong>{shopName}</strong> aktuell nicht in unsere
              Liste aufnehmen.
            </Text>

            {reason && (
              <Section style={reasonBox}>
                <Text style={reasonLabel}>Begründung:</Text>
                <Text style={reasonText}>{reason}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              Du kannst jederzeit einen neuen Vorschlag auf{" "}
              <Link href="https://lmaa.space/suggestion" style={link}>
                lmaa.space/suggestion
              </Link>{" "}
              einreichen. Unsere{" "}
              <Link href="https://lmaa.space/aufnahmekriterien" style={link}>
                Aufnahmekriterien
              </Link>{" "}
              helfen dir dabei, einen passenden Shop zu finden.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Dein freundliches{" "}
              <Link href="https://lmaa.space" style={link}>
                LMAA
              </Link>{" "}
              🦙
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

RejectedEmail.PreviewProps = {
  shopName: "Irgendein Shop",
  reason: "Der Shop erfüllt leider nicht unsere Aufnahmekriterien.",
} satisfies RejectedEmailProps;

/**
 * Default export for React Email tooling.
 */
export default RejectedEmail;

const body = {
  backgroundColor: "#f5f5f4",
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  borderRadius: "8px",
  maxWidth: "560px",
  border: "1px solid #e7e5e4",
  overflow: "hidden",
};

const bannerSection = {
  margin: "0",
  padding: "0",
  display: "block",
};

const bannerImg = {
  display: "block",
  width: "100%",
  maxWidth: "560px",
  borderRadius: "8px 8px 0 0",
};

const content = {
  padding: "32px 40px 40px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "600",
  color: "#292524",
  margin: "0 0 24px",
  lineHeight: "1.3",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#44403c",
  margin: "0 0 16px",
};

const reasonBox = {
  backgroundColor: "#fafaf9",
  border: "1px solid #e7e5e4",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 20px",
};

const reasonLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#78716c",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px",
};

const reasonText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#44403c",
  margin: "0",
};

const link = {
  color: "#b45309",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e7e5e4",
  margin: "32px 0 24px",
};

const footer = {
  fontSize: "13px",
  color: "#a8a29e",
  margin: "0",
};
