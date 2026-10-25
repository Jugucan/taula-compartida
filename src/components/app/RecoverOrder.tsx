import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useOrder } from "@/lib/order-store";
import { similarNames } from "@/lib/meal-rules";
import { Action } from "./primitives";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function RecoverOrder() {
  const { remembered, recover, orders, editingId, reset } = useOrder();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const matches = searched ? similarNames(name, orders) : [];
  const restore = (id: string) => { recover(id); setOpen(false); navigate({ to: "/revisio" }); };
  return <div className="mt-4 flex flex-wrap items-center gap-3">
    {remembered && !editingId && <Action size="md" variant="soft" onClick={() => restore(remembered.id)}>Editar la comanda de {remembered.guest}</Action>}
    {editingId ? <><p className="text-sm font-semibold text-primary">Editant la teva comanda</p><Action size="sm" variant="ghost" onClick={reset}>Fer una altra comanda</Action></> : <Action size="md" variant="outline" onClick={() => { setOpen(true); setSearched(false); }}>Ja he fet la comanda</Action>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogTitle>Recuperar la meva comanda</DialogTitle>
      <DialogDescription>Prototip: recuperació per nom amb dades d'exemple. No verifica la identitat.</DialogDescription>
      <form onSubmit={e => { e.preventDefault(); setSearched(true); }} className="space-y-4">
        <label className="block font-bold" htmlFor="recover-name">El teu nom</label>
        <input id="recover-name" value={name} onChange={e => { setName(e.target.value); setSearched(false); }} className="min-h-12 w-full rounded-lg border-2 border-input bg-card px-3" minLength={2} required />
        <Action type="submit" block size="md">Buscar comanda</Action>
      </form>
      {searched && (matches.length ? <div className="space-y-3"><p className="font-semibold">Ets alguna d'aquestes persones?</p>{matches.map(order => <Action key={order.id} variant="outline" size="md" block onClick={() => restore(order.id)}>Sí, sóc {order.guest}</Action>)}<Action size="md" variant="ghost" block onClick={() => setOpen(false)}>No, sóc una altra persona</Action></div> : <p role="status">No hem trobat cap comanda amb aquest nom.</p>)}
    </DialogContent></Dialog>
  </div>;
}