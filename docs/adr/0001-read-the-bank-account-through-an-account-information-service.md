# Read the bank account through a licensed account information service

The site asks for donations by bank transfer, and nothing told it when money arrived, so the figure on the page was typed in by hand and went stale. Every automated route to a bank account was surveyed in PAP-LMAA-003, and all but one is either forbidden or fragile: a bank offers no public API to its own account holder, its PSD2 interface is gated on a qualified eIDAS certificate that only a supervised payment institution can hold, a reverse-engineered client breaches the account agreement, and parsing a statement keeps the manual step whilst adding a parser. We therefore read the account through Enable Banking, a Finnish account information service provider regulated by FIN-FSA, which holds the certificate and re-exposes the account over an ordinary API.

## Considered options

A payment provider such as Ko-fi or Liberapay would push an event instead of being polled, and both accept a private individual. They were not chosen because they cover only what flows through them: the bank transfer stays the main route, its IBAN is published, and supporters have standing orders pointing at it. Stripe, SumUp, Revolut, PayPal Business and bunq all require a registered business or a declaration of business purpose that this project cannot honestly make, and the operator is a private individual in Austria with no business registration.

## Consequences

The interface answers questions and pushes nothing. There is no webhook for incoming transactions anywhere upstream, so the figure is polled and is up to one poll interval old.

Article 36(5) of Commission Delegated Regulation (EU) 2018/389 caps background access at four times per 24 hours whilst the account holder is not present, and allows any number of accesses they ask for themselves. The background job therefore runs on a stored budget rather than on a timer, because a redeploy restarts a timer and two containers overlap during a deployment, and a manual refresh is counted separately.

The consent expires and must be renewed in a browser, currently every 180 days. A connection that lapses must never read as a period without donations, so a failed read keeps the last known figure rather than falling to zero.

The integration to this bank carries Enable Banking's `beta` flag, and the operator's private key is a secret that lives outside the repository.
