# Keep the payer name and nothing else from the statement

A bank transaction offers a payer name, a postal address and a free-text remittance. The name is stored, the other two are not. A booking without a name cannot be reconciled against anything, and reconciling is what the ledger is for, so the operator of the account decided the name is worth keeping. The address is not, and the remittance line is worse than useless to store: it routinely carries names, customer numbers and card details belonging to whoever wrote it.

What ingestion keeps from a payment is the amount, the currency, the booking date, the direction, the bank's own entry reference, the reference it recognised, and the payer name. Everything else is dropped, and the address never reaches the schema that parses the answer.

## Consequences

The name is stored as the statement writes it, in one field. That is how everybody the site is told about is recorded, whether they were read from a statement or typed their own name into the sponsor form. A name has no reliable division into a given part and a family part, so asking for one produces a wrong answer for a person called Anna von Trapp and for anybody listed under a single word. A donation recorded this way is not published: `published` stays false, and recording who paid is a different thing from naming them on the site.

Where a payment matches a sponsorship, the name comes from the form that person filled in themselves, which is better information given with consent. The statement name applies only where no reference matched.

Many payments will carry no name at all. It was present in 16 of 50 transactions measured on 2 September 2026, so about a third, and a bank's own app showing a name is no promise that the regulated interface carries one. The ledger shows such a payment as nameless rather than inventing anything.

Matching still happens on the recognised reference alone. The payer name is not a fallback for it, because a name that arrives two thirds of the time cannot decide who a payment belongs to.

Nothing read from the statement reaches a log. What is logged about a run is how many transactions were read, taken over, completed and skipped.
