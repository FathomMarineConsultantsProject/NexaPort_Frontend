# IMO validation compatibility recommendation

The request's existing `imo_number` text field does not distinguish an IMO number
from a historical vessel reference. This repair does not change its validation or
rewrite stored values.

For a future change, introduce an explicit identifier type. Keep the identifier
optional for vessels without an IMO number; validate newly declared IMO numbers
against the agreed numeric/checksum rules. Preserve historical references and
unchanged historical values during unrelated edits. Normalize an optional `IMO`
prefix only after the identifier is explicitly classified. Enforce the same
policy on the backend and in create/edit forms, with tests for legacy references,
blank identifiers, new valid/invalid numbers and unchanged existing values.
