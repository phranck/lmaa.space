# Count only payments the site itself marked

The account the donations arrive in is the operator's private account, so it also carries their salary, their rent and their shopping. Other projects are paid into it as well, musiccloud.io among them, and each one books its own payments from it. A donation counter that took every incoming payment would book a salary as a donation, and one that took another project's payment would count that money twice. Ingestion therefore works from a positive list: a payment counts only when its remittance carries something this site put there, being either a creditor reference the sponsor form issued or the site's host, which the configured donation purpose the GiroCode writes for everybody else contains. Everything else is read and discarded in the same function, without being stored, counted or logged.

The rules, in the order the import applies them:

1. A payment whose remittance names another project on the account is not this site's, even when it also names this site. The other projects' hosts are one list in `bank-ingestion.ts`, beside the site's own host.
2. A payment carrying a sound creditor reference that another payee issued is not this site's. That covers musiccloud's `MCSP` references and a shop refunding an order to the private account.
3. A creditor reference is this site's only in the shape the sponsor form issues: `RF`, the check digits, `SPON` and twelve drawn characters. It is found as a whole word, also when it is printed in groups of four or split across lines, and its ISO 11649 check digits must hold.
4. A reference of that shape is booked only when this site issued it. It is issued while its announcement stands in `pending_sponsorships`, and afterwards it stays in `retired_sponsorship_references`, which keeps the reference alone once the announcement is taken over, runs out or is removed. A payment under an issued reference whose announcement is gone goes into the ledger without a sponsor. A reference this site never issued is ignored.
5. A payment that names the site's host and carries no reference is a donation.
6. Only a credit above zero in euros is booked. A payment that is this site's by the rules above but arrives in another currency or with no amount is skipped, and the run's log line counts it without its amount or text.

## Considered options

Taking every incoming payment and letting the operator correct the ledger afterwards was rejected twice over. It inverts the safe default, since the failure mode is a private transaction appearing in a donation figure rather than a donation being missed. And it would require the operator to review their own account through this application, which is exactly the data the next decision keeps out.

## Consequences

A transfer carrying neither marker is invisible to the automation and stays a manual entry. That is the price of the filter, and it is the right one on a private account.

The figure is therefore a floor rather than a total, and the two sentences the site derives from it are not equally safe. "The year is covered" only ever understates, so where it appears it is true. "This much is still missing" overstates, because it subtracts a total that is too low, and it asks readers for money that may already have arrived by a route this does not count. Whatever wording stands on the page has to survive that, and the honest form is a floor: at least this much came in.

The remittance cannot be filtered upstream. The regulated interface offers a date range, a transaction status and a fetch strategy, and no free-text search, so the account's full traffic for the window reaches the application before the filter runs. The window is kept to the last few days for that reason.

`donations` is documented as holding every payment that arrives. Once ingestion exists that sentence is only true of what the site can recognise, and the comment has to say so.

A separate account used for donations alone would remove the question entirely, since every incoming payment would then be a donation. That is not planned, and it is the alternative worth remembering if the volume ever justifies it.
