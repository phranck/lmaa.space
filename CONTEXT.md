# lmaa.space

A non-commercial site listing shops that are alternatives to Amazon, carried by donations from the people who read it. This glossary fixes the words the code and the interface use, so one idea does not travel under three names.

It grows as terms are settled rather than being written out in advance.

## Money coming in

**Donation**:
One payment that arrived and was recorded, whatever route it took. The word covers every payment including those that earn a sponsorship, so a sum over donations is the whole of what came in.
_Avoid_: Contribution, gift, payment

**Sponsorship**:
A donation large enough to earn a place on the sponsor wall for a year from the day it was paid. A sponsorship is a person on a page; the money behind it is still a donation.
_Avoid_: Membership, subscription, patronage

**Ledger**:
The record of donations, and the only place a payment is written down. Every figure about money that came in is a sum over it, so nothing is counted twice and nothing is counted in two places.
_Avoid_: Journal, book, transactions table

**Pending sponsorship**:
What somebody said about themselves before their money arrived. It holds the name, the address and the sentence they want shown, and it waits for a payment carrying its reference.
_Avoid_: Draft sponsor, unconfirmed sponsor, application

**Reference**:
The creditor reference after ISO 11649 that the sponsor form issues, which the transfer carries instead of a sentence. Its check digits say on arrival whether it came through unaltered, which is what lets a payment find the pending sponsorship it belongs to.
_Avoid_: Code, token, payment ID

**Donation purpose**:
The remittance text the site writes into the GiroCode for a payment that earns no sponsorship. It is the second thing that marks a payment as belonging to this project, the reference being the first.
_Avoid_: Subject, note, description

**Running costs**:
What a year of operating the site costs, itemised in the settings. The figure donations are measured against.
_Avoid_: Expenses, budget

## Reading the bank

**Bank connection**:
The standing permission to read the operator's own account, held by an account information service on the operator's behalf. It has an expiry and is renewed in a browser.
_Avoid_: Integration, link, bank account

**Consent**:
The part of a bank connection that expires. Renewing it means authenticating at the bank again; nothing about the account itself changes.
_Avoid_: Authorisation, grant, permission

**Authorisation**:
The one walk through the bank's own pages that produces a consent. It is a thing that happens rather than a thing that is held, and it is over in minutes; what remains afterwards is the bank connection. Renewing a connection is another authorisation.
_Avoid_: Login, sign-in, approval

**Session**:
The credential the account information service issues at the end of an authorisation, which every later read of the account presents. It is what a bank connection holds, never shown and never served on a route.
_Avoid_: Token, key, access

**Ingestion**:
Reading the account and writing what belongs to this project into the ledger. It recognises payments rather than receiving them, so a payment it cannot recognise is not a donation as far as the site is concerned.
_Avoid_: Import, sync, reconciliation

**Payment route**:
How a payment reached the project, such as a bank transfer, PayPal or GitHub Sponsors. Every donation names one.
_Avoid_: Provider, channel, source
