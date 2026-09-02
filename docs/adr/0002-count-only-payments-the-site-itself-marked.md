# Count only payments the site itself marked

The account the donations arrive in is the operator's private account, so it also carries their salary, their rent and their shopping. A donation counter that took every incoming payment would book a salary as a donation. Ingestion therefore works from a positive list: a payment counts only when its remittance carries something this site put there, being either a creditor reference the sponsor form issued, validated through its ISO 11649 check digits, or the configured donation purpose the GiroCode writes for everybody else. Everything else is read and discarded in the same function, without being stored, counted or logged.

## Considered options

Taking every incoming payment and letting the operator correct the ledger afterwards was rejected twice over. It inverts the safe default, since the failure mode is a private transaction appearing in a donation figure rather than a donation being missed. And it would require the operator to review their own account through this application, which is exactly the data the next decision keeps out.

## Consequences

A transfer carrying neither marker is invisible to the automation and stays a manual entry. That is the price of the filter, and it is the right one on a private account.

The figure is therefore a floor rather than a total, and the two sentences the site derives from it are not equally safe. "The year is covered" only ever understates, so where it appears it is true. "This much is still missing" overstates, because it subtracts a total that is too low, and it asks readers for money that may already have arrived by a route this does not count. Whatever wording stands on the page has to survive that, and the honest form is a floor: at least this much came in.

The remittance cannot be filtered upstream. The regulated interface offers a date range, a transaction status and a fetch strategy, and no free-text search, so the account's full traffic for the window reaches the application before the filter runs. The window is kept to the days since the last successful read for that reason.

`donations` is documented as holding every payment that arrives. Once ingestion exists that sentence is only true of what the site can recognise, and the comment has to say so.

A separate account used for donations alone would remove the question entirely, since every incoming payment would then be a donation. That is not planned, and it is the alternative worth remembering if the volume ever justifies it.
