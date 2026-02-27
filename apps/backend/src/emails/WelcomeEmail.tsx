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
 * Props for the dashboard user invitation email.
 */
interface WelcomeEmailProps {
  username: string;
  password: string;
  loginUrl: string;
}

/**
 * Renders the invitation email for newly created admin users.
 *
 * @param props - Credentials and login target.
 * @returns JSX email markup.
 */
export function WelcomeEmail({ username, password, loginUrl }: WelcomeEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Du wurdest als Mitarbeiter bei lmaa.space eingeladen</Preview>
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
            <Heading style={heading}>Willkommen bei lmaa.space!</Heading>

            <Text style={paragraph}>Hallo {username},</Text>
            <Text style={paragraph}>
              du wurdest als Mitarbeiter im Dashboard von{" "}
              <Link href="https://lmaa.space" style={link}>
                lmaa.space
              </Link>{" "}
              eingeladen. Hier sind deine Zugangsdaten:
            </Text>

            <Section style={credentialsBox}>
              <Text style={credentialRow}>
                <span style={credentialLabel}>Benutzername</span>
                <span style={credentialValue}>{username}</span>
              </Text>
              <Hr style={credentialDivider} />
              <Text style={credentialRow}>
                <span style={credentialLabel}>Passwort</span>
                <span style={credentialValue}>{password}</span>
              </Text>
            </Section>

            <Text style={paragraph}>
              <Link href={loginUrl} style={ctaLink}>
                → Zum Dashboard
              </Link>
            </Text>

            <Text style={hint}>
              Bitte ändere dein Passwort nach dem ersten Login in deinen Profileinstellungen.
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

WelcomeEmail.PreviewProps = {
  username: "jane.doe",
  password: "TemporaryPass123!",
  loginUrl: "https://dashboard.lmaa.space",
} satisfies WelcomeEmailProps;

/**
 * Default export for React Email tooling.
 */
export default WelcomeEmail;

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

const credentialsBox = {
  backgroundColor: "#fafaf9",
  border: "1px solid #e7e5e4",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 20px",
};

const credentialRow = {
  fontSize: "14px",
  color: "#44403c",
  margin: "0",
  display: "block",
};

const credentialLabel = {
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#78716c",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "2px",
};

const credentialValue = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: "15px",
  color: "#292524",
  display: "block",
};

const credentialDivider = {
  borderColor: "#e7e5e4",
  margin: "12px 0",
};

const ctaLink = {
  color: "#b45309",
  fontWeight: "600" as const,
  textDecoration: "none",
  fontSize: "15px",
};

const hint = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#78716c",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "0 0 24px",
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
