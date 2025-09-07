"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";
import { useRouter } from "next/navigation";

export default function AddBankDialogButton() {
  const [open, setOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { withTwofa, DialogUI } = useTwofaPrompt();

  async function onAdd() {
    const name = bankName.trim();
    const number = accountNumber.trim();
    if (!name || !number) return;
    setLoading(true);
    try {
      await withTwofa(async (headers) => {
        await apiFetch('/api/bank-accounts', { method: 'POST', headers, body: JSON.stringify({ bankName: name, accountNumber: number, makeDefault: true }) });
      });
      toast.success('Bank details saved');
      setOpen(false);
      setBankName('');
      setAccountNumber('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add bank details');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add details</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payout bank details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankAccountNumber">Bank account number</Label>
              <Input id="bankAccountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onAdd} disabled={loading || !bankName.trim() || !accountNumber.trim()}>{loading ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {DialogUI}
    </>
  );
}
