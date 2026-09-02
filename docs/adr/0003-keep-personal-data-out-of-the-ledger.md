# Keep personal data from the bank statement out of the ledger

A bank transaction offers a payer name and a free-text remittance, and neither is stored. Both describe a third party who gave that information to their bank for a payment, not to this site for publication, and a remittance line routinely carries names, customer numbers and card details that have nothing to do with this project. What ingestion keeps from a payment is the amount, the currency, the booking date, the direction, the bank's own entry reference and the reference it recognised. Everything else is dropped.

## Consequences

An automatically recorded donation has no name, and the ledger shows it as such rather than inventing one. A name appears only where a payment matches a sponsorship, and then it comes from the form that person filled in themselves, which is the same information given with consent.

Matching happens on the recognised reference alone. The payer name is not a fallback, which suits the data anyway: it was present in 16 of 50 transactions measured on 2 September 2026, so a name-based match would have been blind two thirds of the time.

Nothing read from the statement reaches a log. What is logged about a run is how many transactions were read, taken over and skipped.
