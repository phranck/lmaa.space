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

interface ApprovedEmailProps {
  shopName: string;
}

export function ApprovedEmail({ shopName }: ApprovedEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Vorschlag „{shopName}" wurde aufgenommen!</Preview>
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
            <Heading style={heading}>Dein Shop-Vorschlag wurde angenommen 🎉</Heading>

            <Text style={paragraph}>Hallo,</Text>
            <Text style={paragraph}>
              wir freuen uns, dir mitteilen zu können, dass dein Vorschlag{" "}
              <strong>{shopName}</strong> ab sofort in der Liste auf{" "}
              <Link href="https://lmaa.space" style={link}>
                lmaa.space
              </Link>{" "}
              zu finden ist!
            </Text>
            <Text style={paragraph}>
              Vielen Dank für deinen Beitrag zur Community – gemeinsam machen wir
              es einfacher, Amazon-Alternativen zu entdecken.
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

ApprovedEmail.PreviewProps = {
  shopName: "Manufactum",
} satisfies ApprovedEmailProps;

export default ApprovedEmail;

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
