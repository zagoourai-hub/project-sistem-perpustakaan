"use client";

import { DueSlip } from "@/components/editorial/due-slip";
import { useRenewLoan } from "@/features/circulation/api/circulation.api";
import type { Loan } from "@/shared/types/models";

// FE-8.4.3: the member's active loans as due slips, each with its own renew button.
export function LoanSlipList({ loans }: { loans: Loan[] }) {
  const renew = useRenewLoan();
  return (
    <>
      {loans.map((loan) => (
        <DueSlip
          key={loan.id}
          loan={loan}
          onRenew={(id) => renew.mutate(id)}
          isRenewing={renew.isPending && renew.variables === loan.id}
          renewDisabledReason={loan.renewCount >= loan.maxRenewals ? "Batas perpanjangan sudah tercapai" : null}
        />
      ))}
    </>
  );
}
