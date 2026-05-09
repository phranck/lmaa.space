-- Custom SQL migration file, put your code below! --
INSERT INTO app_settings (key, value)
VALUES (
  'submission.domainAlertRules',
  $${
    "rules": [
      {
        "id": "amazon-rickroll",
        "name": "Amazon URLs",
        "domainsText": "amazon.com, amazon.ca, amazon.com.mx, amazon.com.br, amazon.co.uk, amazon.de, amazon.fr, amazon.it, amazon.es, amazon.nl, amazon.se, amazon.pl, amazon.com.tr, amazon.com.be, amazon.eg, amazon.sa, amazon.ae, amazon.in, amazon.com.au, amazon.co.jp, amazon.sg, amazon.cn, amazon.ie, amzn.to, amzn.eu, amzn.com, amzn.in, amzn.de, amzn.es, amzn.fr, amzn.it, amzn.uk, amzn.asia",
        "messageMarkdown": "Da hatte wohl jemand bereits die gleiche Idee! Der Shop [Amazon](https://www.youtube.com/watch?v=dQw4w9WgXcQ) ist schon eingetragen.",
        "isActive": true
      }
    ]
  }$$
)
ON CONFLICT (key) DO NOTHING;
