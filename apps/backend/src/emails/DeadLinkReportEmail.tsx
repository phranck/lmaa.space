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

interface DeadLinkReportEmailProps {
  shopName: string;
  shopUrl: string;
  reportCount: number;
  dashboardUrl: string;
}

export function DeadLinkReportEmail({
  shopName,
  shopUrl,
  reportCount,
  dashboardUrl,
}: DeadLinkReportEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Defekter Link gemeldet: {shopName}</Preview>
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
            <Heading style={heading}>Defekter Link gemeldet</Heading>

            <Text style={paragraph}>
              Ein Benutzer hat einen möglicherweise defekten Shop-Link gemeldet:
            </Text>

            <Section style={detailsBox}>
              <Text style={detailRow}>
                <span style={detailLabel}>Shop</span>
                <span style={detailValue}>{shopName}</span>
              </Text>
              <Hr style={detailDivider} />
              <Text style={detailRow}>
                <span style={detailLabel}>URL</span>
                <Link href={shopUrl} style={detailLink}>{shopUrl}</Link>
              </Text>
              <Hr style={detailDivider} />
              <Text style={detailRow}>
                <span style={detailLabel}>Meldungen gesamt</span>
                <span style={detailValue}>{reportCount}</span>
              </Text>
            </Section>

            <Text style={paragraph}>
              Bitte überprüfe den Link und deaktiviere den Shop falls notwendig.
            </Text>

            <Text style={paragraph}>
              <Link href={`${dashboardUrl}/shops`} style={ctaLink}>
                → Im Dashboard prüfen
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              <Link href="https://lmaa.space" style={footerLink}>
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

DeadLinkReportEmail.PreviewProps = {
  shopName: "Manufactum",
  shopUrl: "https://www.manufactum.de",
  reportCount: 3,
  dashboardUrl: "https://dashboard.lmaa.space",
} satisfies DeadLinkReportEmailProps;

export default DeadLinkReportEmail;

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

const detailsBox = {
  backgroundColor: "#fafaf9",
  border: "1px solid #e7e5e4",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 20px",
};

const detailRow = {
  fontSize: "14px",
  color: "#44403c",
  margin: "0",
  display: "block",
};

const detailLabel = {
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#78716c",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "2px",
};

const detailValue = {
  fontSize: "15px",
  color: "#292524",
  display: "block",
};

const detailLink = {
  fontSize: "15px",
  color: "#b45309",
  textDecoration: "none",
  display: "block",
};

const detailDivider = {
  borderColor: "#e7e5e4",
  margin: "12px 0",
};

const ctaLink = {
  color: "#b45309",
  fontWeight: "600" as const,
  textDecoration: "none",
  fontSize: "15px",
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

const footerLink = {
  color: "#a8a29e",
  textDecoration: "none",
};
