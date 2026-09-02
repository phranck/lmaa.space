# Do not ingest PayPal automatically

PayPal appears in the account information service's list for Austria as a supported personal account, so reading the balance is possible and looks like the obvious second step after the bank. It is not taken, because what comes back cannot be attributed. Measured over 83 transactions from 180 days on 2 September 2026, `remittance_information` was filled in **none** of them: whatever a payer writes when they send money reaches PayPal's own interface and not the regulated one. The operator receives donations for several projects into one personal PayPal account, so a payment with no note cannot be told apart from one meant for a different project, and counting it here would attribute somebody else's donation to this site.

## Consequences

PayPal donations stay a manual entry. The figure the site derives from the ledger is therefore a floor rather than a total, which is the honest direction: a donation missing from the count is a smaller error than one counted for the wrong project.

Asking donors on the support page to write a marker does not change this. Even where they comply, the note never reaches the interface. It still helps the operator reconciling by hand, because PayPal's own interface does show it.

Two fields would have been usable had attribution been possible, and they are recorded here so the probe does not have to be repeated: the payer name arrived in all 83 transactions, which is the opposite of the bank, and `bank_transaction_code.sub_code` distinguishes `PAYMENT` from `REFUND`, which the bank does not.

Making PayPal attributable needs the attribution to happen when the money is sent, not when it is read. A service such as Ko-fi does that, because the payment arrives through a page belonging to one project and is reported with that project's identity, whilst the money still lands in the same PayPal account. That is a decision about donation routes rather than about reading them, and it is not taken here.
